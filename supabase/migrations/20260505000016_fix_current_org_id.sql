-- =============================================================================
-- Migration 0016: Fix current_org_id() to fall back to org_members
-- =============================================================================
--
-- Root cause of blank pages:
--   current_org_id() only reads user_session_state, which is written by
--   create_organization() during onboarding.  Users whose org membership
--   was created via a seed script (or a future "invite to existing org"
--   flow) skip onboarding and therefore have no user_session_state row.
--   Result: current_org_id() returns NULL → every RLS policy that calls
--   it blocks all reads → pages render 0 rows despite data existing.
--
-- Fix:
--   COALESCE between the session-state row (fast path, multi-org aware)
--   and a fallback that picks the user's earliest active org from
--   org_members directly (covers seed-created and invited users).
--
--   Also add an auto-populate trigger so that whenever a new org_members
--   row is inserted, user_session_state is upserted for that user —
--   ensuring future invite flows work without requiring the user to
--   repeat onboarding.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Replace current_org_id() with a two-path COALESCE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Fast path: explicit session selection (set by create_organization or
    -- any future "switch org" action)
    (
      SELECT active_org_id
      FROM   public.user_session_state
      WHERE  user_id = auth.uid()
    ),
    -- Fallback: pick the user's earliest active org_members row.
    -- Deterministic (ORDER BY joined_at) so the result is stable.
    (
      SELECT org_id
      FROM   public.org_members
      WHERE  user_id = auth.uid()
        AND  status  = 'active'
      ORDER  BY joined_at ASC
      LIMIT  1
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Auto-populate user_session_state on new org_members insert
--    so invite flows never leave a user without session state.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_session_on_member_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when the membership becomes active
  IF NEW.status = 'active' THEN
    INSERT INTO public.user_session_state (user_id, active_org_id)
    VALUES (NEW.user_id, NEW.org_id)
    ON CONFLICT (user_id)
    DO NOTHING;   -- don't overwrite an existing explicit selection
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_user_session_on_member_insert
  AFTER INSERT ON public.org_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_session_on_member_insert();
