import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

const PUBLIC_PATHS = ['/login', '/auth']

const ORG_GATED_PREFIXES = [
  '/dashboard',
  '/contracts',
  '/compliance',
  '/ma-regulatory',
  '/calendar',
  '/execution',
  '/clause-library',
  '/settings',
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log(`[MW] ▶ ${request.method} ${pathname}`)

  const { supabaseResponse, user, supabase } = await updateSession(request)
  console.log(`[MW] user=${user ? user.id : 'null'} | pathname=${pathname}`)

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isOrgGated   = ORG_GATED_PREFIXES.some((p) => pathname.startsWith(p))

  // ── Unauthenticated users → /login ─────────────────────────────────────────
  if (!user && !isPublicPath && !pathname.startsWith('/onboarding')) {
    console.log('[MW] → no user, not public → REDIRECT /login')
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Authenticated user on /login → /dashboard ──────────────────────────────
  if (user && pathname === '/login') {
    console.log('[MW] → user on /login → REDIRECT /dashboard')
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // For both org-gated routes AND /onboarding we need the membership count.
  // We use the SERVICE-ROLE admin client (bypasses RLS entirely) because the
  // session-client JWT is unreliable in the Edge Runtime — the access token
  // may not survive the cookie → PostgREST Authorization header hop, causing
  // auth.uid() to resolve to null inside RLS policies and returning 0 rows.
  if (user && (isOrgGated || pathname.startsWith('/onboarding'))) {
    console.log(`[MW:ORG_CHECK] START user.id=${user.id} path=${pathname}`)

    // ── Verify service-role key is present and log its format ──────────────
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const keyFormat = !serviceKey
      ? 'MISSING'
      : serviceKey.startsWith('sb_secret_')
        ? 'new_sb_secret'
        : serviceKey.startsWith('eyJ')
          ? 'legacy_jwt'
          : 'unknown'
    console.log(
      `[MW:ORG_CHECK] service_key_present=${!!serviceKey} format=${keyFormat} ` +
      `len=${serviceKey.length}`
    )

    // ── Build the query client ─────────────────────────────────────────────
    // Prefer admin client; fall back to session client if key is absent so
    // the middleware degrades gracefully rather than throwing.
    let queryClient: ReturnType<typeof createAdminClient> | typeof supabase
    let clientType: 'admin' | 'session'
    try {
      queryClient  = createAdminClient()
      clientType   = 'admin'
    } catch (e) {
      console.warn('[MW:ORG_CHECK] admin client unavailable, falling back to session client:', e)
      queryClient = supabase
      clientType  = 'session'
    }
    console.log(`[MW:ORG_CHECK] client_type=${clientType}`)

    // ── Run the membership query ───────────────────────────────────────────
    const { data, error, count } = await queryClient
      .from('org_members')
      .select('id, user_id, org_id, role, status', { count: 'exact' })
      .eq('user_id', user.id)
      .in('status', ['active', 'invited'])
      .limit(5)

    console.log(
      `[MW:ORG_CHECK] result rows=${data?.length ?? 'null'} ` +
      `count=${count ?? 'null'} ` +
      `data=${JSON.stringify(data)} ` +
      `error_code=${error?.code ?? 'null'} ` +
      `error_msg=${error?.message ?? 'null'} ` +
      `error_hint=${(error as { hint?: string } | null)?.hint ?? 'null'}`
    )

    if (error) {
      // Transient DB error — do NOT block the user; let the layout
      // run its own defence-in-depth check before deciding.
      console.error('[MW:ORG_CHECK] DB error (passing through):', error.code, error.message)
      console.log('[MW:ORG_CHECK] DECISION=pass_through_on_error')
    } else if (pathname.startsWith('/onboarding')) {
      // ── Authenticated user on /onboarding ──────────────────────────────────
      if (data && data.length > 0) {
        console.log(`[MW:ORG_CHECK] DECISION=redirect_dashboard (has_org=true, on_onboarding)`)
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        const redirectResponse = NextResponse.redirect(url)
        copySessionCookies(supabaseResponse, redirectResponse)
        return redirectResponse
      }
      console.log(`[MW:ORG_CHECK] DECISION=allow_onboarding (has_org=false)`)
    } else if (isOrgGated) {
      // ── Org-gated route ─────────────────────────────────────────────────────
      if (!data || data.length === 0) {
        console.log(`[MW:ORG_CHECK] DECISION=redirect_onboarding (has_org=false, on_gated_route)`)
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        const redirectResponse = NextResponse.redirect(url)
        copySessionCookies(supabaseResponse, redirectResponse)
        return redirectResponse
      }
      console.log(`[MW:ORG_CHECK] DECISION=pass_through (has_org=true rows=${data.length})`)
    }
  }

  console.log('[MW] → returning supabaseResponse (pass through)')
  return supabaseResponse
}

function copySessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite as 'lax' | 'strict' | 'none' | undefined,
      secure: cookie.secure,
      path: cookie.path,
      maxAge: cookie.maxAge,
    })
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
