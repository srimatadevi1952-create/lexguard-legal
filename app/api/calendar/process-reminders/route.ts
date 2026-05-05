/**
 * POST /api/calendar/process-reminders
 *
 * Finds all calendar_reminders where scheduled_send_at <= now() AND status='scheduled'.
 * Dispatches:
 *   - email   → Resend REST API
 *   - whatsapp → MSG91 (scaffolded; TODO: DLT template approval required)
 *   - in_app  → inserts into notifications table
 *
 * Intended to be called by a cron job (Vercel Cron or external scheduler).
 * Should be protected by a CRON_SECRET header in production.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Simple secret check — set CRON_SECRET in Vercel env vars
  const secret = request.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Fetch due reminders with event + org info
  const { data: reminders, error: fetchErr } = await supabase
    .from('calendar_reminders')
    .select(`
      id,
      org_id,
      channel,
      event_id,
      offset_days,
      calendar_events (
        title,
        due_date,
        description,
        owner_id,
        statute_reference
      )
    `)
    .lte('scheduled_send_at', now)
    .eq('status', 'scheduled')

  if (fetchErr) {
    console.error('[process-reminders] fetch error:', fetchErr)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let sent = 0
  let failed = 0

  for (const reminder of reminders) {
    const event = Array.isArray(reminder.calendar_events)
      ? reminder.calendar_events[0]
      : reminder.calendar_events

    if (!event) {
      await supabase
        .from('calendar_reminders')
        .update({ status: 'failed' })
        .eq('id', reminder.id)
      failed++
      continue
    }

    const daysUntilDue = reminder.offset_days
    const subject = `[LexGuard] Reminder: "${event.title}" due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`
    const body = [
      `Deadline reminder from LexGuard Legal`,
      ``,
      `Event  : ${event.title}`,
      `Due    : ${event.due_date}`,
      daysUntilDue === 0 ? `Status : DUE TODAY` : `In     : ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
      event.statute_reference ? `Statute: ${event.statute_reference}` : '',
      event.description ? `\n${event.description}` : '',
      ``,
      `Log in to LexGuard Legal to view or mark this event complete.`,
    ].filter(Boolean).join('\n')

    let dispatchOk = false

    try {
      if (reminder.channel === 'email') {
        dispatchOk = await sendEmail(subject, body)
      } else if (reminder.channel === 'whatsapp') {
        // TODO: requires DLT template approval from TRAI + MSG91 setup
        // dispatchOk = await sendWhatsApp(body)
        console.log('[process-reminders] WhatsApp channel scaffolded — skipping until DLT approved')
        dispatchOk = true  // mark as sent so it doesn't retry
      } else if (reminder.channel === 'in_app') {
        if (!event.owner_id) {
          console.warn('[process-reminders] in_app skipped — no owner_id on event', reminder.event_id)
          dispatchOk = true
        } else {
          const { error: notifErr } = await supabase
            .from('notifications')
            .insert({
              org_id:  reminder.org_id,
              user_id: event.owner_id,
              type:    'deadline',
              title:   subject,
              body,
              is_read: false,
            })
          dispatchOk = !notifErr
          if (notifErr) console.error('[process-reminders] in_app insert error:', notifErr)
        }
      }
    } catch (err) {
      console.error('[process-reminders] dispatch error for reminder', reminder.id, err)
    }

    await supabase
      .from('calendar_reminders')
      .update({
        status:  dispatchOk ? 'sent' : 'failed',
        sent_at: dispatchOk ? now : null,
      })
      .eq('id', reminder.id)

    if (dispatchOk) { sent++ } else { failed++ }
  }

  return NextResponse.json({ processed: reminders.length, sent, failed })
}

// ---------------------------------------------------------------------------
// Resend — email dispatch via REST API (no SDK dependency)
// ---------------------------------------------------------------------------
async function sendEmail(subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM ?? 'LexGuard Legal <reminders@lexguard.in>'
  const to     = process.env.RESEND_TO_OVERRIDE ?? ''  // override for testing

  if (!apiKey) {
    console.warn('[process-reminders] RESEND_API_KEY not set — skipping email')
    return false
  }
  if (!to) {
    console.warn('[process-reminders] RESEND_TO_OVERRIDE not set — skipping email')
    return false
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[process-reminders] Resend error:', res.status, err)
    return false
  }
  return true
}

/*
// ---------------------------------------------------------------------------
// MSG91 — WhatsApp dispatch (scaffolded; TODO: DLT template approval required)
// ---------------------------------------------------------------------------
async function sendWhatsApp(body: string): Promise<boolean> {
  // TODO: Obtain DLT template approval from TRAI via MSG91 panel before enabling.
  // Steps:
  //   1. Register DLT entity at https://www.msg91.com/dlt
  //   2. Get template approved with the exact body text
  //   3. Set MSG91_AUTH_KEY and MSG91_SENDER in Vercel env vars
  //   4. Uncomment and implement the API call below

  const authKey = process.env.MSG91_AUTH_KEY
  const sender  = process.env.MSG91_SENDER
  const mobile  = process.env.MSG91_TO_OVERRIDE   // for testing

  if (!authKey || !sender || !mobile) return false

  const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authkey':      authKey,
    },
    body: JSON.stringify({
      integrated_number: sender,
      content_type: 'template',
      payload: {
        to:       mobile,
        type:     'template',
        template: {
          name:     'lexguard_reminder',   // replace with approved template name
          language: { code: 'en' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: body.slice(0, 1024) }] },
          ],
        },
      },
    }),
  })

  return res.ok
}
*/
