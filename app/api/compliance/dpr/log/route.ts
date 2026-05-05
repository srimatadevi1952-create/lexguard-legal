/**
 * POST /api/compliance/dpr/log
 *
 * Authenticated endpoint for lawyers to manually log a DPR received
 * via email, phone, or post. Uses session-scoped client so RLS applies.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/supabase/audit'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json() as {
      principal_name?: string
      principal_email?: string
      request_type?: string
      description?: string
    }

    const { principal_name, principal_email, request_type, description } = body

    if (!principal_name || !principal_email || !request_type || !description) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    const validTypes = ['access', 'correction', 'erasure', 'nomination', 'grievance', 'portability']
    if (!validTypes.includes(request_type)) {
      return NextResponse.json({ error: 'Invalid request_type' }, { status: 400 })
    }

    const { data: orgIdRow } = await supabase.rpc('current_org_id')
    const orgId = orgIdRow as string | null
    if (!orgId) {
      return NextResponse.json({ error: 'No active organisation' }, { status: 400 })
    }

    const slaDeadline = new Date()
    slaDeadline.setDate(slaDeadline.getDate() + 30)

    const { data: dpr, error: insertErr } = await supabase
      .from('dpr_requests')
      .insert({
        org_id:          orgId,
        ticket_number:   'PENDING',
        principal_name:  principal_name.trim(),
        principal_email: principal_email.trim().toLowerCase(),
        request_type:    request_type as 'access' | 'correction' | 'erasure' | 'nomination' | 'grievance' | 'portability',
        description:     description.trim(),
        sla_deadline:    slaDeadline.toISOString(),
      })
      .select('id, ticket_number')
      .single()

    if (insertErr || !dpr) {
      console.error('[dpr/log] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to create DPR' }, { status: 500 })
    }

    await logAudit(supabase, {
      orgId,
      entityType: 'dpr_request',
      entityId:   dpr.id,
      action:     'logged_manually',
      after:      { request_type, principal_email: principal_email.trim().toLowerCase() },
    })

    return NextResponse.json({ id: dpr.id, ticket_number: dpr.ticket_number })
  } catch (err) {
    console.error('[dpr/log] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
