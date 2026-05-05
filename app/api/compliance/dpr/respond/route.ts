/**
 * POST /api/compliance/dpr/respond
 *
 * Authenticated. Saves a response to a DPR and optionally changes its status.
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
      dpr_id?: string
      response_text?: string
      new_status?: string
    }

    const { dpr_id, response_text, new_status } = body

    if (!dpr_id || !response_text) {
      return NextResponse.json({ error: 'dpr_id and response_text are required' }, { status: 400 })
    }

    const validStatuses = ['open', 'in_progress', 'closed', 'rejected']
    const status = validStatuses.includes(new_status ?? '') ? new_status : 'closed'

    const { data: dpr, error: fetchErr } = await supabase
      .from('dpr_requests')
      .select('id, org_id, ticket_number, status')
      .eq('id', dpr_id)
      .single()

    if (fetchErr || !dpr) {
      return NextResponse.json({ error: 'DPR not found or access denied' }, { status: 404 })
    }

    const { error: updateErr } = await supabase
      .from('dpr_requests')
      .update({
        response_text,
        status:       status as 'open' | 'in_progress' | 'closed' | 'rejected',
        responded_at: new Date().toISOString(),
        responded_by: user.id,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', dpr_id)

    if (updateErr) {
      console.error('[dpr/respond] update error:', updateErr)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    await logAudit(supabase, {
      orgId:      dpr.org_id,
      entityType: 'dpr_request',
      entityId:   dpr_id,
      action:     'responded',
      before:     { status: dpr.status },
      after:      { status, response_text: response_text.slice(0, 200) },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[dpr/respond] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
