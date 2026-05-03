import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/auth']

// Only perform the org-membership check when entering these top-level app routes.
// API routes and sub-paths are intentionally excluded to avoid per-request DB overhead.
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
  const { supabaseResponse, user, supabase } = await updateSession(request)

  const pathname = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Redirect unauthenticated users away from protected app routes
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login
  if (user && pathname === '/login') {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // Org-membership check: if the user is authenticated and navigating to a
  // top-level app route, verify they belong to at least one org.  When not,
  // redirect to onboarding.  The (app)/layout also enforces this as a
  // defence-in-depth measure.
  if (user && ORG_GATED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { data } = await supabase
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'invited'])
      .limit(1)

    if (!data || data.length === 0) {
      const onboardingUrl = request.nextUrl.clone()
      onboardingUrl.pathname = '/onboarding'
      return NextResponse.redirect(onboardingUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
