-- =============================================================================
-- Migration 0013: Compliance Suite
-- Tables: compliance_regimes, compliance_postures, compliance_items,
--         dpr_requests, dpdp_breaches, dpdp_notices, dpdp_consents, gst_findings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.compliance_item_status   AS ENUM ('open', 'in_progress', 'done', 'waived');
CREATE TYPE public.compliance_item_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.compliance_item_source   AS ENUM ('assessment', 'manual', 'contract_flag');
CREATE TYPE public.dpr_request_type         AS ENUM ('access', 'correction', 'erasure', 'nomination', 'grievance', 'portability');
CREATE TYPE public.dpr_status               AS ENUM ('open', 'in_progress', 'closed', 'rejected');
CREATE TYPE public.dpdp_breach_type         AS ENUM ('confidentiality', 'integrity', 'availability');
CREATE TYPE public.breach_severity          AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.breach_status            AS ENUM ('discovered', 'investigating', 'reported', 'closed');
CREATE TYPE public.doc_status               AS ENUM ('draft', 'published', 'needs_review', 'archived');
CREATE TYPE public.gst_finding_type         AS ENUM ('missing_gst_clause', 'incorrect_rate', 'reverse_charge_missing', 'place_of_supply_ambiguous', 'other');
CREATE TYPE public.gst_finding_severity     AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.gst_finding_status       AS ENUM ('open', 'resolved');

-- ---------------------------------------------------------------------------
-- Add public slug to organizations (for DPR intake URLs)
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- ---------------------------------------------------------------------------
-- compliance_regimes  (global reference data, not org-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE public.compliance_regimes (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    UNIQUE NOT NULL,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL,
  icon_name   TEXT    NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.compliance_regimes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read regimes (they are reference data)
CREATE POLICY "compliance_regimes: read authenticated"
  ON public.compliance_regimes FOR SELECT TO authenticated USING (TRUE);

-- Seed the 6 regimes
INSERT INTO public.compliance_regimes (code, name, description, icon_name, order_index) VALUES
  ('dpdp',          'DPDP Act 2023',
   'Digital Personal Data Protection Act 2023 — consent, rights, breach notification, and data fiduciary obligations.',
   'ShieldAlert', 1),
  ('gst',           'GST Compliance',
   'Goods and Services Tax — filing obligations, reverse charge, place of supply, and input tax credit conditions.',
   'Receipt', 2),
  ('companies_act', 'Companies Act 2013',
   'RoC filings, board resolutions, annual returns, statutory registers, and corporate governance obligations.',
   'Building2', 3),
  ('sebi_lodr',     'SEBI LODR',
   'SEBI (Listing Obligations and Disclosure Requirements) — for listed entities: disclosures, corporate governance.',
   'TrendingUp', 4),
  ('labour',        'Labour Laws',
   'PF/ESI contributions, gratuity, contract labour, minimum wages, and state-specific labour law returns.',
   'Users', 5),
  ('fema',          'FEMA',
   'Foreign Exchange Management Act — ECB, ODI, FDI, remittances, and annual filings with RBI.',
   'Globe', 6);

-- ---------------------------------------------------------------------------
-- compliance_postures  (one row per org per regime)
-- ---------------------------------------------------------------------------
CREATE TABLE public.compliance_postures (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  regime_id        UUID    NOT NULL REFERENCES public.compliance_regimes(id),
  score            INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  pillar_scores    JSONB   NOT NULL DEFAULT '{}',
  trend            TEXT    NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
  last_assessed_at TIMESTAMPTZ,
  assessed_by      UUID    REFERENCES public.users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, regime_id)
);

ALTER TABLE public.compliance_postures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_postures: select"
  ON public.compliance_postures FOR SELECT
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = compliance_postures.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "compliance_postures: insert"
  ON public.compliance_postures FOR INSERT
  WITH CHECK (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = compliance_postures.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "compliance_postures: update"
  ON public.compliance_postures FOR UPDATE
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = compliance_postures.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE TRIGGER set_updated_at_compliance_postures
  BEFORE UPDATE ON public.compliance_postures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- compliance_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.compliance_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  regime_id          UUID NOT NULL REFERENCES public.compliance_regimes(id),
  title              TEXT NOT NULL,
  description        TEXT,
  status             public.compliance_item_status   NOT NULL DEFAULT 'open',
  priority           public.compliance_item_priority NOT NULL DEFAULT 'medium',
  due_date           DATE,
  assigned_to        UUID REFERENCES public.users(id),
  source             public.compliance_item_source   NOT NULL DEFAULT 'manual',
  source_question    TEXT,
  source_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_items: select"
  ON public.compliance_items FOR SELECT
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = compliance_items.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "compliance_items: insert"
  ON public.compliance_items FOR INSERT
  WITH CHECK (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = compliance_items.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "compliance_items: update"
  ON public.compliance_items FOR UPDATE
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = compliance_items.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE TRIGGER set_updated_at_compliance_items
  BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dpr_requests  (Data Principal Requests — DPDP Act rights requests)
-- ---------------------------------------------------------------------------
CREATE TABLE public.dpr_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_number    TEXT NOT NULL,
  principal_name   TEXT NOT NULL,
  principal_email  TEXT NOT NULL,
  request_type     public.dpr_request_type NOT NULL,
  description      TEXT NOT NULL,
  status           public.dpr_status NOT NULL DEFAULT 'open',
  assigned_to      UUID REFERENCES public.users(id),
  sla_deadline     TIMESTAMPTZ NOT NULL,
  response_text    TEXT,
  responded_at     TIMESTAMPTZ,
  responded_by     UUID REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, ticket_number)
);

ALTER TABLE public.dpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dpr_requests: select"
  ON public.dpr_requests FOR SELECT
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpr_requests.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "dpr_requests: insert"
  ON public.dpr_requests FOR INSERT
  WITH CHECK (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpr_requests.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "dpr_requests: update"
  ON public.dpr_requests FOR UPDATE
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpr_requests.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE TRIGGER set_updated_at_dpr_requests
  BEFORE UPDATE ON public.dpr_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-generate ticket numbers: DPR-YYYY-NNNN (per org per year)
CREATE OR REPLACE FUNCTION public.generate_dpr_ticket()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT;
  v_seq  INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(ticket_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.dpr_requests
  WHERE org_id = NEW.org_id
    AND ticket_number LIKE 'DPR-' || v_year || '-%';

  NEW.ticket_number := 'DPR-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_dpr_ticket
  BEFORE INSERT ON public.dpr_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_dpr_ticket();

-- ---------------------------------------------------------------------------
-- dpdp_breaches
-- ---------------------------------------------------------------------------
CREATE TABLE public.dpdp_breaches (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                        TEXT NOT NULL,
  description                  TEXT NOT NULL,
  breach_type                  public.dpdp_breach_type NOT NULL,
  severity                     public.breach_severity  NOT NULL DEFAULT 'medium',
  discovered_at                TIMESTAMPTZ NOT NULL,
  reported_to_dpb_at           TIMESTAMPTZ,
  dpb_acknowledgement_ref      TEXT,
  affected_principals_estimate INTEGER,
  data_categories              TEXT[] NOT NULL DEFAULT '{}',
  status                       public.breach_status NOT NULL DEFAULT 'discovered',
  notification_draft           TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dpdp_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dpdp_breaches: select"
  ON public.dpdp_breaches FOR SELECT
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpdp_breaches.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "dpdp_breaches: insert"
  ON public.dpdp_breaches FOR INSERT
  WITH CHECK (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpdp_breaches.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "dpdp_breaches: update"
  ON public.dpdp_breaches FOR UPDATE
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpdp_breaches.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE TRIGGER set_updated_at_dpdp_breaches
  BEFORE UPDATE ON public.dpdp_breaches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dpdp_notices  (Privacy notices / consent records)
-- ---------------------------------------------------------------------------
CREATE TABLE public.dpdp_notices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  version      TEXT NOT NULL DEFAULT '1.0',
  status       public.doc_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_by   UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dpdp_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dpdp_notices: select"
  ON public.dpdp_notices FOR SELECT
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpdp_notices.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "dpdp_notices: insert"
  ON public.dpdp_notices FOR INSERT
  WITH CHECK (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpdp_notices.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "dpdp_notices: update"
  ON public.dpdp_notices FOR UPDATE
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpdp_notices.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE TRIGGER set_updated_at_dpdp_notices
  BEFORE UPDATE ON public.dpdp_notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dpdp_consents  (Consent record log — hashed principal identifiers)
-- ---------------------------------------------------------------------------
CREATE TABLE public.dpdp_consents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  principal_identifier TEXT NOT NULL,  -- hashed or masked
  purpose              TEXT NOT NULL,
  granted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at         TIMESTAMPTZ,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dpdp_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dpdp_consents: select"
  ON public.dpdp_consents FOR SELECT
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpdp_consents.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "dpdp_consents: insert"
  ON public.dpdp_consents FOR INSERT
  WITH CHECK (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = dpdp_consents.org_id
                  AND user_id = auth.uid() AND status = 'active'));

-- ---------------------------------------------------------------------------
-- gst_findings  (GST issues derived from contract analysis)
-- ---------------------------------------------------------------------------
CREATE TABLE public.gst_findings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_id   UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  finding_type  public.gst_finding_type     NOT NULL,
  description   TEXT NOT NULL,
  severity      public.gst_finding_severity NOT NULL DEFAULT 'medium',
  status        public.gst_finding_status   NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gst_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gst_findings: select"
  ON public.gst_findings FOR SELECT
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = gst_findings.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "gst_findings: insert"
  ON public.gst_findings FOR INSERT
  WITH CHECK (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = gst_findings.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE POLICY "gst_findings: update"
  ON public.gst_findings FOR UPDATE
  USING (org_id = public.current_org_id()
    AND EXISTS (SELECT 1 FROM public.org_members
                WHERE org_id = gst_findings.org_id
                  AND user_id = auth.uid() AND status = 'active'));

CREATE TRIGGER set_updated_at_gst_findings
  BEFORE UPDATE ON public.gst_findings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
