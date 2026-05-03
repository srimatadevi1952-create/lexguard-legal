-- Migration 0005: user_session_state table + current_org_id() helper
--                 + create_organization() atomic onboarding function

-- Stores each user's currently active org selection.
-- All future RLS policies call current_org_id() rather than querying this
-- table directly.
CREATE TABLE public.user_session_state (
  user_id       uuid        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  active_org_id uuid        REFERENCES public.organizations(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_session_state ENABLE ROW LEVEL SECURITY;

-- Users can read/write only their own session state row.
CREATE POLICY "user_session_state: own" ON public.user_session_state
  FOR ALL
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_user_session_state_updated_at
  BEFORE UPDATE ON public.user_session_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- current_org_id()
-- Returns the caller's currently active org_id.
-- SECURITY DEFINER so it can read user_session_state regardless of RLS;
-- auth.uid() still scopes the result to the calling user.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT active_org_id
  FROM   public.user_session_state
  WHERE  user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- create_organization(...)
-- Atomically:
--   1. Inserts a new organization row.
--   2. Inserts the calling user as role='admin', status='active'.
--   3. Sets / updates the caller's active_org_id in user_session_state.
-- Returns the new org's UUID.
-- SECURITY DEFINER is intentional — the function enforces its own auth check
-- and needs to bypass RLS to write all three tables in one transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_organization(
  p_name       text,
  p_legal_name text     DEFAULT NULL,
  p_type       org_type DEFAULT 'solo',
  p_gstin      text     DEFAULT NULL,
  p_pan        text     DEFAULT NULL,
  p_address    jsonb    DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id  uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- 1. Create the org
  INSERT INTO public.organizations (
    name, legal_name, type, gstin, pan, address, primary_contact,
    plan_status, trial_ends_at
  )
  VALUES (
    p_name, p_legal_name, p_type, p_gstin, p_pan, p_address, v_user_id,
    'trial', now() + INTERVAL '14 days'
  )
  RETURNING id INTO v_org_id;

  -- 2. Add the creator as admin
  INSERT INTO public.org_members (org_id, user_id, role, status, joined_at)
  VALUES (v_org_id, v_user_id, 'admin', 'active', now());

  -- 3. Set this org as the caller's active org
  INSERT INTO public.user_session_state (user_id, active_org_id)
  VALUES (v_user_id, v_org_id)
  ON CONFLICT (user_id)
  DO UPDATE SET active_org_id = v_org_id, updated_at = now();

  RETURN v_org_id;
END;
$$;
