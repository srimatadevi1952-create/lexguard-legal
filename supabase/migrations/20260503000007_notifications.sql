-- Migration 0007: notifications table

CREATE TYPE notification_type AS ENUM (
  'info',
  'warning',
  'error',
  'success',
  'deadline',
  'approval'
);

CREATE TABLE public.notifications (
  id           uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id       uuid              REFERENCES public.organizations(id) ON DELETE CASCADE,
  title        text              NOT NULL,
  body         text,
  type         notification_type NOT NULL DEFAULT 'info',
  entity_type  text,
  entity_id    uuid,
  is_read      boolean           NOT NULL DEFAULT false,
  read_at      timestamptz,
  created_at   timestamptz       NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only read their own notifications.
CREATE POLICY "notifications: read own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- UPDATE: users can only update (e.g., mark as read) their own notifications.
CREATE POLICY "notifications: update own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- INSERT: restricted to service role only.
-- Application code that needs to create notifications must use
-- the Supabase service-role client (never the anon key).
-- No anon/authenticated INSERT policy is defined here intentionally.

-- Automatically set read_at when is_read flips to true.
CREATE OR REPLACE FUNCTION public.set_notification_read_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notifications_read_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_read_at();
