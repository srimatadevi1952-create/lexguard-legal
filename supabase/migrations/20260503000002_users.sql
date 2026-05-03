-- Migration 0002: public.users profile table
-- Mirrors auth.users with additional profile fields.
-- A trigger keeps them in sync on signup.

CREATE TYPE preferred_language AS ENUM ('en', 'hi');

CREATE TABLE public.users (
  id                  uuid               PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               text               UNIQUE NOT NULL,
  full_name           text,
  phone               text,
  preferred_language  preferred_language NOT NULL DEFAULT 'en',
  avatar_url          text,
  last_login_at       timestamptz,
  created_at          timestamptz        NOT NULL DEFAULT now(),
  updated_at          timestamptz        NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile row
CREATE POLICY "users: read own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users: update own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- updated_at trigger
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: auto-create public.users row when auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Now that public.users exists, add the FK from organizations.primary_contact
ALTER TABLE public.organizations
  ADD CONSTRAINT fk_organizations_primary_contact
  FOREIGN KEY (primary_contact) REFERENCES public.users(id) ON DELETE SET NULL;
