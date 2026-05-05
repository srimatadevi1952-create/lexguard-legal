/**
 * POST /api/regulatory/notices
 *
 * Creates a regulator notice, generates a template response brief,
 * saves it to suggested_response, and auto-creates a calendar event
 * for the deadline date.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateNoticeResponse } from '@/lib/regulatory/notice-templates'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: orgIdRow } = await supabase.rpc('current_org_id')
    const orgId = orgIdRow as string | null
    if (!orgId) {
      return NextResponse.json({ error: 'No active organisation' }, { status: 400 })
    }

    const body = await request.json() as {
      issuer?:           string
      issuer_office?:    string
      notice_ref?:       string
      notice_type?:      string
      received_date?:    string
      deadline_date?:    string
      specific_demands?: string
      notice_file_url?:  string
    }

    if (
      !body.issuer?.trim() ||
      !body.notice_type?.trim() ||
      !body.received_date ||
      !body.deadline_date
    ) {
      return NextResponse.json(
        { error: 'issuer, notice_type, received_date, and deadline_date are required' },
        { status: 400 },
      )
    }

    const validIssuers = ['mca', 'sebi', 'cci', 'it_dept', 'gst', 'rbi', 'dpb', 'state', 'labour', 'other']
    const issuer = validIssuers.includes(body.issuer.toLowerCase())
      ? body.issuer.toLowerCase()
      : 'other'

    // Generate response brief
    const suggestedResponse = generateNoticeResponse(
      issuer,
      body.notice_type.trim(),
      body.specific_demands ?? '',
    )

    // 1. Create calendar event for deadline
    const { data: calEvent, error: calErr } = await supabase
      .from('calendar_events')
      .insert({
        org_id:            orgId,
        title:             `Response deadline — ${body.issuer.toUpperCase()} ${body.notice_type.trim()}`,
        description:       `Regulator notice response deadline. Issuer: ${body.issuer.toUpperCase()}. Ref: ${body.notice_ref ?? 'N/A'}`,
        event_type:        mapIssuerToEventType(issuer),
        source_table:      'regulator_notices',
        due_date:          body.deadline_date,
        owner_id:          user.id,
        status:            'open',
        reminder_offsets:  '{30,15,7,3,1,0}',
      })
      .select('id')
      .single()

    if (calErr) {
      console.error('[notices/route] calendar insert error:', calErr)
    }

    // 2. Create the notice record
    const { data: notice, error: noticeErr } = await supabase
      .from('regulator_notices')
      .insert({
        org_id:             orgId,
        issuer,
        issuer_office:      body.issuer_office ?? null,
        notice_ref:         body.notice_ref ?? null,
        notice_type:        body.notice_type.trim(),
        received_date:      body.received_date,
        deadline_date:      body.deadline_date,
        specific_demands:   body.specific_demands ?? null,
        notice_file_url:    body.notice_file_url ?? null,
        suggested_response: suggestedResponse,
        status:             'new',
        calendar_event_id:  calEvent?.id ?? null,
        created_by:         user.id,
      })
      .select('id')
      .single()

    if (noticeErr || !notice) {
      console.error('[notices/route] insert error:', noticeErr)
      return NextResponse.json({ error: 'Failed to create notice' }, { status: 500 })
    }

    // 3. Generate reminder cascade for the calendar event
    if (calEvent?.id) {
      const dueDate = new Date(body.deadline_date)
      const offsets = [30, 15, 7, 3, 1, 0]
      const reminderRows = offsets.map((days) => {
        const sendAt = new Date(dueDate)
        sendAt.setDate(sendAt.getDate() - days)
        return {
          org_id:            orgId,
          event_id:          calEvent.id,
          offset_days:       days,
          scheduled_send_at: sendAt.toISOString(),
          status:            'scheduled' as const,
          channel:           'email' as const,
        }
      })
      const { error: remErr } = await supabase
        .from('calendar_reminders')
        .insert(reminderRows)
      if (remErr) console.error('[notices/route] reminders insert error:', remErr)
    }

    return NextResponse.json({ notice_id: notice.id })
  } catch (err) {
    console.error('[notices/route] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function mapIssuerToEventType(
  issuer: string,
): 'dpdp' | 'mca' | 'sebi' | 'labour' | 'gst' | 'contracts' | 'custom' {
  const map: Record<string, 'dpdp' | 'mca' | 'sebi' | 'labour' | 'gst' | 'contracts' | 'custom'> = {
    mca:     'mca',
    sebi:    'sebi',
    cci:     'mca',
    it_dept: 'gst',
    gst:     'gst',
    rbi:     'custom',
    dpb:     'dpdp',
    state:   'custom',
    labour:  'labour',
    other:   'custom',
  }
  return map[issuer] ?? 'custom'
}
