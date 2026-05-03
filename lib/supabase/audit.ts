/**
 * Audit logging helper.
 *
 * All database writes in LexGuard Legal should be accompanied by an audit
 * event so that every state change is captured in the immutable hash-chained
 * audit_log table.
 *
 * Usage (server component / route handler):
 *
 *   import { createClient } from '@/lib/supabase/server'
 *   import { logAudit } from '@/lib/supabase/audit'
 *
 *   const supabase = createClient()
 *   await logAudit(supabase, {
 *     orgId:      activeOrgId,
 *     entityType: 'contract',
 *     entityId:   contractId,
 *     action:     'created',
 *     after:      { name: contract.name, status: contract.status },
 *   })
 *
 * The function calls the log_audit_event() SECURITY DEFINER RPC, which:
 *   - Verifies the caller is an active org member.
 *   - Computes the SHA-256 hash chain entry via a BEFORE INSERT trigger.
 *   - Inserts the append-only row (direct INSERTs are blocked by RLS).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface LogAuditParams {
  orgId: string
  entityType: string
  entityId: string
  action: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

/**
 * Append an entry to the immutable audit log.
 *
 * @param supabase - A Supabase client authenticated as the acting user.
 *                   Pass the server client from `lib/supabase/server.ts` in
 *                   route handlers / server components, or the browser client
 *                   from `lib/supabase/client.ts` in client components.
 * @param params   - Audit event details.
 * @returns The new audit_log row UUID, or null on failure.
 */
// SupabaseClient without a generic defaults to SupabaseClient<any> internally
// without requiring us to write `any` explicitly, keeping eslint happy while
// still accepting both browser and server clients.
export async function logAudit(
  supabase: SupabaseClient,
  params: LogAuditParams
): Promise<string | null> {
  const { data, error } = await supabase.rpc('log_audit_event', {
    p_org_id:      params.orgId,
    p_entity_type: params.entityType,
    p_entity_id:   params.entityId,
    p_action:      params.action,
    p_before:      params.before  ?? null,
    p_after:       params.after   ?? null,
    p_metadata:    params.metadata ?? null,
  })

  if (error) {
    console.error('[audit] logAudit failed:', error.message)
    return null
  }

  return data as string
}
