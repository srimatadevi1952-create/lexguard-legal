import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

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
  // We use the session client (not the admin client) — the RLS policy
  // `user_id = auth.uid()` covers self-reads without a service-role key.
  if (user && (isOrgGated || pathname.startsWith('/onboarding'))) {
    console.log(`[MW] org check for user=${user.id} path=${pathname}`)

    const { data, error } = await supabase
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'invited'])
      .limit(1)

    console.log(`[MW] org_members: data=${JSON.stringify(data)} | error=${error?.message ?? 'null'}`)

    if (error) {
      // Transient DB error — do NOT block the user; let the layout
      // run its own defence-in-depth check before deciding.
      console.error('[MW] org check DB error (passing through):', error.code, error.message)
    } else if (pathname.startsWith('/onboarding')) {
      // ── Authenticated user on /onboarding ──────────────────────────────────
      if (data && data.length > 0) {
        // Already has an org → skip onboarding
        console.log('[MW] → user on /onboarding but already has org → REDIRECT /dashboard')
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        const redirectResponse = NextResponse.redirect(url)
        copySessionCookies(supabaseResponse, redirectResponse)
        return redirectResponse
      }
      // No org yet → fall through to /onboarding (allow)
    } else if (isOrgGated) {
      // ── Org-gated route ─────────────────────────────────────────────────────
      if (!data || data.length === 0) {
        console.log('[MW] → 0 org rows → REDIRECT /onboarding')
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        const redirectResponse = NextResponse.redirect(url)
        copySessionCookies(supabaseResponse, redirectResponse)
        return redirectResponse
      }
      console.log(`[MW] → ${data.length} org row(s) → PASS THROUGH`)
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
