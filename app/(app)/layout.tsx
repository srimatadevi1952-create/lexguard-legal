import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ── [DIAG A] layout entered ──────────────────────────────────────────────
  console.log('[LAYOUT] (app)/layout.tsx entered')

  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // ── [DIAG B] auth result ─────────────────────────────────────────────────
  console.log(`[LAYOUT] auth.getUser: user=${user ? user.id : 'null'} | authError=${authError ? authError.message : 'null'}`)

  if (!user) {
    console.log('[LAYOUT] → no user → REDIRECT /login')
    redirect('/login')
  }

  // Defence-in-depth org guard.
  let hasOrg = false
  try {
    const { data, error } = await supabase
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'invited'])
      .limit(1)

    // ── [DIAG C] org query result ────────────────────────────────────────
    console.log(`[LAYOUT] org_members query: data=${JSON.stringify(data)} | error=${error ? error.message : 'null'}`)

    if (error) {
      console.error('[LAYOUT] org_members query ERROR:', error.code, error.message, error.details)
    }

    hasOrg = Array.isArray(data) && data.length > 0
  } catch (err) {
    console.error('[LAYOUT] org_members query THREW:', err)
  }

  // ── [DIAG D] redirect decision ───────────────────────────────────────────
  console.log(`[LAYOUT] hasOrg=${hasOrg} → ${hasOrg ? 'RENDER app' : 'REDIRECT /onboarding'}`)

  if (!hasOrg) {
    redirect('/onboarding')
  }

  return <AppShell>{children}</AppShell>
}
