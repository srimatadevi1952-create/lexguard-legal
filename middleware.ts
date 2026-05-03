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
  // NOTE: We intentionally use the SESSION client (anon key + JWT from cookies)
  //       so the RLS self-read policy `user_id = auth.uid()` applies.
  //       If the JWT is expired/missing the query returns [] and the user is
  //       wrongly redirected — that is the bug we are diagnosing here.
  if (user && (isOrgGated || pathname.startsWith('/onboarding'))) {
    console.log(`[MW:ORG_CHECK] START user.id=${user.id} path=${pathname}`)

    // Read the raw access-token from the cookie so we can confirm it exists.
    const accessTokenCookie = request.cookies.get('sb-access-token')
      ?? request.cookies.get(
        // @supabase/ssr stores the token under a project-prefixed key like
        // sb-<project-ref>-auth-token; grab whichever key holds "access_token"
        [...request.cookies.getAll()]
          .find(c => c.value.includes('"access_token"'))
          ?.name ?? ''
      )
    console.log(
      `[MW:ORG_CHECK] access_token_cookie_present=${!!accessTokenCookie?.value} ` +
      `name=${accessTokenCookie?.name ?? 'NOT_FOUND'}`
    )

    const { data, error } = await supabase
      .from('org_members')
      .select('id, user_id, org_id, role, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'invited'])
      .limit(5)

    console.log(
      `[MW:ORG_CHECK] query=org_members.user_id=${user.id} ` +
      `result_rows=${data?.length ?? 'null'} ` +
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
      // No org yet → fall through to /onboarding (allow)
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
      console.log(`[MW:ORG_CHECK] DECISION=pass_through (has_org=true, rows=${data.length})`)
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
