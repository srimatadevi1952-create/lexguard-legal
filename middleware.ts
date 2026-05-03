import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

const PUBLIC_PATHS = ['/login', '/auth', '/onboarding']

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

  // ── [DIAG 1] every request ──────────────────────────────────────────────
  console.log(`[MW] ▶ ${request.method} ${pathname}`)

  const { supabaseResponse, user } = await updateSession(request)

  // ── [DIAG 2] auth result ─────────────────────────────────────────────────
  console.log(`[MW] user=${user ? user.id : 'null'} | pathname=${pathname}`)

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isOrgGated   = ORG_GATED_PREFIXES.some((p) => pathname.startsWith(p))

  console.log(`[MW] isPublicPath=${isPublicPath} | isOrgGated=${isOrgGated}`)

  // Redirect unauthenticated users away from protected routes.
  if (!user && !isPublicPath) {
    console.log('[MW] → no user, not public → REDIRECT /login')
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login.
  if (user && pathname === '/login') {
    console.log('[MW] → user on /login → REDIRECT /dashboard')
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Org-membership guard.
  if (user && isOrgGated) {
    console.log(`[MW] org check start for user=${user.id}`)

    try {
      const admin = createAdminClient()

      // ── [DIAG 3] check env vars ──────────────────────────────────────────
      console.log(`[MW] SUPABASE_URL set=${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`)
      console.log(`[MW] SERVICE_KEY set=${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`)

      const { data, error } = await admin
        .from('org_members')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['active', 'invited'])
        .limit(1)

      // ── [DIAG 4] query result ────────────────────────────────────────────
      console.log(`[MW] org_members query: data=${JSON.stringify(data)} | error=${error ? error.message : 'null'}`)

      if (error) {
        console.error('[MW] org_members query ERROR:', error.code, error.message, error.details)
      }

      const rowCount = Array.isArray(data) ? data.length : -1
      console.log(`[MW] rowCount=${rowCount}`)

      if (!data || data.length === 0) {
        console.log('[MW] → 0 org rows → REDIRECT /onboarding')

        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        const redirectResponse = NextResponse.redirect(url)

        // Copy refreshed session cookies so the browser keeps a valid session
        // at /onboarding (prevents an auth loop back to /dashboard).
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, {
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite as 'lax' | 'strict' | 'none' | undefined,
            secure: cookie.secure,
            path: cookie.path,
            maxAge: cookie.maxAge,
          })
        })
        console.log(`[MW] redirect response cookies: ${redirectResponse.cookies.getAll().map(c => c.name).join(', ')}`)
        return redirectResponse
      }

      console.log(`[MW] → ${rowCount} org row(s) found → PASS THROUGH`)
    } catch (err) {
      console.error('[MW] org check THREW:', err)
      // On any unexpected error, block entry and send to onboarding.
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite as 'lax' | 'strict' | 'none' | undefined,
          secure: cookie.secure,
          path: cookie.path,
          maxAge: cookie.maxAge,
        })
      })
      return redirectResponse
    }
  }

  console.log('[MW] → returning supabaseResponse (pass through)')
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
