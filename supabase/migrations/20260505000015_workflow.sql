-- =============================================================================
-- Migration 0015: Workflow Layer — Calendar, DD Checklist, Regulator Notices
-- Tables: calendar_events, calendar_reminders, dd_matters,
--         dd_checklist_items, regulator_notices
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.calendar_event_type   AS ENUM ('dpdp','mca','sebi','labour','gst','contracts','custom');
CREATE TYPE public.calendar_event_status AS ENUM ('open','completed','snoozed');
CREATE TYPE public.reminder_channel      AS ENUM ('email','whatsapp','in_app');
CREATE TYPE public.reminder_status       AS ENUM ('scheduled','sent','failed');
CREATE TYPE public.dd_transaction_type   AS ENUM ('asset','share','merger','slump_sale');
CREATE TYPE public.dd_matter_status      AS ENUM ('active','completed','abandoned');
CREATE TYPE public.dd_item_status        AS ENUM ('pending','in_progress','completed','not_applicable','flagged');
CREATE TYPE public.dd_item_risk          AS ENUM ('low','medium','high','critical');
CREATE TYPE public.notice_status         AS ENUM ('new','in_progress','responded','closed');

-- ---------------------------------------------------------------------------
-- calendar_events
-- ---------------------------------------------------------------------------
CREATE TABLE public.calendar_events (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  description        TEXT,
  event_type         public.calendar_event_type   NOT NULL DEFAULT 'custom',
  source_table       TEXT,        -- 'compliance_items'|'contracts'|'dpr_requests'|'dd_matters'|'regulator_notices'|'manual'
  source_id          UUID,
  due_date           DATE        NOT NULL,
  owner_id           UUID        REFERENCES public.users(id),
  status             public.calendar_event_status NOT NULL DEFAULT 'open',
  statute_reference  TEXT,
  notes              TEXT,
  reminder_offsets   INT[]       NOT NULL DEFAULT '{30,15,7,3,1,0}',
  linked_contract_id UUID        REFERENCES public.contracts(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events: org member select"
  ON public.calendar_events FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = calendar_events.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "calendar_events: org member insert"
  ON public.calendar_events FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = calendar_events.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "calendar_events: org member update"
  ON public.calendar_events FOR UPDATE
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = calendar_events.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- calendar_reminders
-- ---------------------------------------------------------------------------
CREATE TABLE public.calendar_reminders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id          UUID        NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  offset_days       INT         NOT NULL,
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  status            public.reminder_status  NOT NULL DEFAULT 'scheduled',
  channel           public.reminder_channel NOT NULL DEFAULT 'email',
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_reminders: org member select"
  ON public.calendar_reminders FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = calendar_reminders.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "calendar_reminders: org member insert"
  ON public.calendar_reminders FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = calendar_reminders.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- dd_matters
-- ---------------------------------------------------------------------------
CREATE TABLE public.dd_matters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  target_name      TEXT        NOT NULL,
  deal_lead        TEXT        NOT NULL,
  transaction_type public.dd_transaction_type NOT NULL DEFAULT 'share',
  sector           TEXT        NOT NULL DEFAULT 'other',
  size_bracket     TEXT        NOT NULL DEFAULT 'mid',   -- 'small'|'mid'|'large'
  target_close_date DATE,
  status           public.dd_matter_status   NOT NULL DEFAULT 'active',
  completion_pct   INT         NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  created_by       UUID        REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dd_matters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dd_matters: org member select"
  ON public.dd_matters FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = dd_matters.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "dd_matters: org member insert"
  ON public.dd_matters FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = dd_matters.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "dd_matters: org member update"
  ON public.dd_matters FOR UPDATE
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = dd_matters.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE TRIGGER trg_dd_matters_updated_at
  BEFORE UPDATE ON public.dd_matters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dd_checklist_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.dd_checklist_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  matter_id       UUID        NOT NULL REFERENCES public.dd_matters(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL,
  item_text       TEXT        NOT NULL,
  status          public.dd_item_status NOT NULL DEFAULT 'pending',
  risk            public.dd_item_risk   NOT NULL DEFAULT 'medium',
  owner_id        UUID        REFERENCES public.users(id),
  finding_summary TEXT,
  notes           TEXT,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dd_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dd_checklist_items: org member select"
  ON public.dd_checklist_items FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = dd_checklist_items.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "dd_checklist_items: org member insert"
  ON public.dd_checklist_items FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = dd_checklist_items.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "dd_checklist_items: org member update"
  ON public.dd_checklist_items FOR UPDATE
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = dd_checklist_items.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE TRIGGER trg_dd_checklist_items_updated_at
  BEFORE UPDATE ON public.dd_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- regulator_notices
-- ---------------------------------------------------------------------------
CREATE TABLE public.regulator_notices (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  issuer              TEXT        NOT NULL,  -- 'mca'|'sebi'|'cci'|'it_dept'|'gst'|'rbi'|'dpb'|'state'|'labour'|'other'
  issuer_office       TEXT,
  notice_ref          TEXT,
  notice_type         TEXT        NOT NULL,
  received_date       DATE        NOT NULL,
  deadline_date       DATE        NOT NULL,
  specific_demands    TEXT,
  notice_file_url     TEXT,
  suggested_response  TEXT,
  final_response_url  TEXT,
  status              public.notice_status NOT NULL DEFAULT 'new',
  assigned_to         UUID        REFERENCES public.users(id),
  calendar_event_id   UUID        REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  created_by          UUID        REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.regulator_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regulator_notices: org member select"
  ON public.regulator_notices FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = regulator_notices.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "regulator_notices: org member insert"
  ON public.regulator_notices FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = regulator_notices.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "regulator_notices: org member update"
  ON public.regulator_notices FOR UPDATE
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = regulator_notices.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE TRIGGER trg_regulator_notices_updated_at
  BEFORE UPDATE ON public.regulator_notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
