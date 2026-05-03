-- Migration 0006: audit_log table with append-only hash chain
-- Requires pgcrypto (enabled in migration 0001).

CREATE TABLE public.audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES public.organizations(id),
  user_id       uuid        NOT NULL REFERENCES public.users(id),
  entity_type   text        NOT NULL,
  entity_id     uuid        NOT NULL,
  action        text        NOT NULL,
  before_state  jsonb,
  after_state   jsonb,
  metadata      jsonb,
  prev_hash     text        NOT NULL,
  row_hash      text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: only org admins can read the audit trail.
CREATE POLICY "audit_log: admin select" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id  = audit_log.org_id
        AND user_id = auth.uid()
        AND role    = 'admin'
        AND status  = 'active'
    )
  );

-- No INSERT/UPDATE/DELETE policies — all writes go through log_audit_event().

-- ---------------------------------------------------------------------------
-- Append-only guard: reject any UPDATE or DELETE directly on the table.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

-- ---------------------------------------------------------------------------
-- Hash chain trigger: runs BEFORE INSERT.
-- 1. Fetches row_hash of the most recent audit_log row for this org → prev_hash.
-- 2. Computes row_hash = sha256(id | org_id | user_id | entity_type |
--                                entity_id | action | before_state |
--                                after_state | created_at | prev_hash).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_audit_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev_hash text;
  v_payload   text;
BEGIN
  -- Retrieve the last row_hash for this org
  SELECT row_hash INTO v_prev_hash
  FROM   public.audit_log
  WHERE  org_id = NEW.org_id
  ORDER  BY created_at DESC, id DESC
  LIMIT  1;

  -- Genesis block: no previous rows for this org
  NEW.prev_hash := COALESCE(
    v_prev_hash,
    '0000000000000000000000000000000000000000000000000000000000000000'
  );

  v_payload := concat_ws('|',
    NEW.id::text,
    NEW.org_id::text,
    NEW.user_id::text,
    NEW.entity_type,
    NEW.entity_id::text,
    NEW.action,
    COALESCE(NEW.before_state::text, ''),
    COALESCE(NEW.after_state::text,  ''),
    NEW.created_at::text,
    NEW.prev_hash
  );

  NEW.row_hash := encode(digest(v_payload, 'sha256'), 'hex');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_log_hash
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.compute_audit_hash();

-- ---------------------------------------------------------------------------
-- log_audit_event(...)
-- SECURITY DEFINER function that active org members call to append to the
-- audit log.  Direct INSERT on the table is blocked by RLS (no INSERT policy).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_org_id      uuid,
  p_entity_type text,
  p_entity_id   uuid,
  p_action      text,
  p_before      jsonb DEFAULT NULL,
  p_after       jsonb DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id      uuid;
BEGIN
  -- Verify the caller is an active member of the target org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE  org_id  = p_org_id
      AND  user_id = v_user_id
      AND  status  = 'active'
  ) THEN
    RAISE EXCEPTION 'permission denied: not an active member of org %', p_org_id;
  END IF;

  -- prev_hash and row_hash are set by the BEFORE INSERT trigger above.
  INSERT INTO public.audit_log (
    id, org_id, user_id,
    entity_type, entity_id, action,
    before_state, after_state, metadata,
    -- Placeholder values overwritten by trigger:
    prev_hash, row_hash,
    created_at
  )
  VALUES (
    gen_random_uuid(), p_org_id, v_user_id,
    p_entity_type, p_entity_id, p_action,
    p_before, p_after, p_metadata,
    '', '',   -- overwritten by trg_audit_log_hash
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
