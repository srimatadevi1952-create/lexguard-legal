import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for server-side admin operations.
 *
 * This client bypasses RLS entirely. Only use it in:
 *  - Next.js middleware (for lightweight guard queries)
 *  - API route handlers that already authenticate the caller separately
 *  - Background jobs / seed scripts
 *
 * NEVER expose this client or its key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
