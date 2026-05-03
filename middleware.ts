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

  // ── Org-membership check intentionally disabled for development ───────────
  // TODO(pre-launch): re-enable once SUPABASE_SERVICE_ROLE_KEY is confirmed
  // in Vercel env and the Edge Runtime JWT issue is resolved.
  // When re-enabling: authenticated users with no org → /onboarding redirect.

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
