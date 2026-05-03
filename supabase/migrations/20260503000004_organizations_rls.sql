-- Migration 0004: RLS policies for organizations table
-- (org_members table must exist first — migration 0003)

-- SELECT: user must be an active member of the org; deleted orgs are hidden.
CREATE POLICY "organizations: read as active member" ON public.organizations
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = organizations.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- UPDATE: user must be an admin of the org.
CREATE POLICY "organizations: update as admin" ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = organizations.id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
  );

-- INSERT: any authenticated user can create an org (onboarding self-serve).
CREATE POLICY "organizations: insert authenticated" ON public.organizations
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );

-- No DELETE policy — soft-delete only via deleted_at column.
