import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Guard: if the user has no org membership yet, send them to onboarding.
  // The onboarding page lives outside this (app) group so there is no redirect loop.
  const { data: memberships } = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['active', 'invited'])
    .limit(1)

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding')
  }

  return <AppShell>{children}</AppShell>
}
