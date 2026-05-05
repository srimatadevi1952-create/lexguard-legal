/**
 * PATCH /api/regulatory/dd/[id]/items
 *
 * Updates one checklist item: status, finding_summary, notes.
 * Also recalculates completion_pct on the parent dd_matter.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json() as {
      item_id?:         string
      status?:          string
      finding_summary?: string
      notes?:           string
      risk?:            string
    }

    if (!body.item_id) {
      return NextResponse.json({ error: 'item_id required' }, { status: 400 })
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'not_applicable', 'flagged']
    const validRisks    = ['low', 'medium', 'high', 'critical']

    const updates: Record<string, string> = {}
    if (body.status && validStatuses.includes(body.status)) updates['status'] = body.status
    if (body.risk   && validRisks.includes(body.risk))     updates['risk']   = body.risk
    if (body.finding_summary !== undefined) updates['finding_summary'] = body.finding_summary
    if (body.notes           !== undefined) updates['notes']           = body.notes

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error: updateErr } = await supabase
      .from('dd_checklist_items')
      .update(updates)
      .eq('id', body.item_id)
      .eq('matter_id', params.id)

    if (updateErr) {
      console.error('[dd/items PATCH] update error:', updateErr)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    // Recalculate completion_pct
    const { data: allItems } = await supabase
      .from('dd_checklist_items')
      .select('status')
      .eq('matter_id', params.id)

    if (allItems && allItems.length > 0) {
      const applicable = allItems.filter((i) => i.status !== 'not_applicable')
      const done       = applicable.filter((i) => i.status === 'completed')
      const pct        = applicable.length > 0
        ? Math.round((done.length / applicable.length) * 100)
        : 0

      await supabase
        .from('dd_matters')
        .update({ completion_pct: pct })
        .eq('id', params.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dd/items PATCH] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
