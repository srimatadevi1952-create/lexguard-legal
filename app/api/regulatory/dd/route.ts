/**
 * POST /api/regulatory/dd
 *
 * Creates a new DD matter, generates the checklist deterministically,
 * persists all checklist items, and creates a calendar event for the
 * target close date.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDDChecklist } from '@/lib/dd/checklist-templates'

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
      name?:              string
      target_name?:       string
      deal_lead?:         string
      transaction_type?:  string
      sector?:            string
      size_bracket?:      string
      target_close_date?: string
    }

    if (!body.name?.trim() || !body.target_name?.trim() || !body.deal_lead?.trim()) {
      return NextResponse.json(
        { error: 'name, target_name, and deal_lead are required' },
        { status: 400 },
      )
    }

    const validTransactionTypes = ['asset', 'share', 'merger', 'slump_sale']
    const transactionType = validTransactionTypes.includes(body.transaction_type ?? '')
      ? body.transaction_type!
      : 'share'

    const validSectors = ['tech', 'pharma', 'real_estate', 'fs', 'manufacturing', 'other']
    const sector = validSectors.includes(body.sector ?? '') ? body.sector! : 'other'

    const validSizes = ['small', 'mid', 'large']
    const sizeBracket = validSizes.includes(body.size_bracket ?? '') ? body.size_bracket! : 'mid'

    // 1. Create the DD matter
    const { data: matter, error: matterErr } = await supabase
      .from('dd_matters')
      .insert({
        org_id:           orgId,
        name:             body.name.trim(),
        target_name:      body.target_name.trim(),
        deal_lead:        body.deal_lead.trim(),
        transaction_type: transactionType as 'asset' | 'share' | 'merger' | 'slump_sale',
        sector,
        size_bracket:     sizeBracket,
        target_close_date: body.target_close_date ?? null,
        status:           'active',
        completion_pct:   0,
        created_by:       user.id,
      })
      .select('id')
      .single()

    if (matterErr || !matter) {
      console.error('[dd/route] matter insert error:', matterErr)
      return NextResponse.json({ error: 'Failed to create DD matter' }, { status: 500 })
    }

    // 2. Generate checklist items deterministically
    const templates = generateDDChecklist(transactionType, sector, sizeBracket)

    const itemRows = templates.map((t, idx) => ({
      org_id:     orgId,
      matter_id:  matter.id,
      category:   t.category,
      item_text:  t.item_text,
      status:     'pending' as const,
      risk:       t.risk,
      sort_order: idx,
    }))

    const { error: itemsErr } = await supabase
      .from('dd_checklist_items')
      .insert(itemRows)

    if (itemsErr) {
      console.error('[dd/route] items insert error:', itemsErr)
      // Don't fail the whole request — matter was created
    }

    // 3. Create calendar event for target close date (if provided)
    if (body.target_close_date) {
      const { error: calErr } = await supabase
        .from('calendar_events')
        .insert({
          org_id:       orgId,
          title:        `DD Target Close — ${body.name.trim()}`,
          description:  `M&A due diligence target close date for ${body.target_name.trim()}`,
          event_type:   'mca',
          source_table: 'dd_matters',
          source_id:    matter.id,
          due_date:     body.target_close_date,
          owner_id:     user.id,
          status:       'open',
        })

      if (calErr) {
        console.error('[dd/route] calendar_event insert error:', calErr)
      }
    }

    return NextResponse.json({
      matter_id:    matter.id,
      items_created: itemRows.length,
    })
  } catch (err) {
    console.error('[dd/route] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
