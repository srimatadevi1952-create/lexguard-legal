-- Migration 0003: org_members table

CREATE TYPE member_role AS ENUM (
  'admin',
  'senior_lawyer',
  'lawyer',
  'reviewer',
  'read_only',
  'client'
);

CREATE TYPE member_status AS ENUM (
  'active',
  'invited',
  'suspended'
);

CREATE TABLE public.org_members (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        member_role   NOT NULL DEFAULT 'lawyer',
  status      member_status NOT NULL DEFAULT 'invited',
  invited_by  uuid          REFERENCES public.users(id),
  joined_at   timestamptz,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_members_org_user UNIQUE (org_id, user_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- SELECT: a user can see rows where they are the member themselves,
--         or where they are an active member of the same org (to see teammates).
CREATE POLICY "org_members: read own or same org" ON public.org_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (
      SELECT m.org_id FROM public.org_members AS m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

-- INSERT: a user can add themselves (onboarding: self-add as first admin),
--         or an existing org admin can add others.
CREATE POLICY "org_members: self-insert or admin insert" ON public.org_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.org_members AS m
      WHERE m.org_id = org_members.org_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

-- UPDATE: only org admins can update membership rows.
CREATE POLICY "org_members: admin update" ON public.org_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.org_members AS m
      WHERE m.org_id = org_members.org_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );
