/**
 * POST /api/regulatory/cci
 *
 * Authenticated. Saves a CCI threshold assessment to cci_assessments.
 * The verdict is computed client-side; this route persists it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      acquirer_name?:           string
      acquirer_assets_india?:   number | null
      acquirer_assets_ww?:      number | null
      acquirer_turnover_india?: number | null
      acquirer_turnover_ww?:    number | null
      target_name?:             string
      target_assets_india?:     number | null
      target_assets_ww?:        number | null
      target_turnover_india?:   number | null
      target_turnover_ww?:      number | null
      target_india_turnover_pct?: number | null
      group_assets_india?:      number | null
      group_assets_ww?:         number | null
      group_turnover_india?:    number | null
      group_turnover_ww?:       number | null
      deal_value?:              number | null
      transaction_type?:        string | null
      verdict?:                 string
      form_type?:               string | null
      triggered_tests?:         string[]
      exempt_reasons?:          string[]
    }

    if (!body.acquirer_name?.trim() || !body.target_name?.trim()) {
      return NextResponse.json(
        { error: 'acquirer_name and target_name are required' },
        { status: 400 },
      )
    }

    const validVerdicts = ['filing_required', 'exempt', 'borderline']
    if (!body.verdict || !validVerdicts.includes(body.verdict)) {
      return NextResponse.json({ error: 'Invalid verdict' }, { status: 400 })
    }

    const { data: assessment, error: insertErr } = await supabase
      .from('cci_assessments')
      .insert({
        org_id:                      orgId,
        assessed_by:                 user.id,
        acquirer_name:               body.acquirer_name.trim(),
        acquirer_assets_india:       body.acquirer_assets_india ?? null,
        acquirer_assets_worldwide:   body.acquirer_assets_ww ?? null,
        acquirer_turnover_india:     body.acquirer_turnover_india ?? null,
        acquirer_turnover_worldwide: body.acquirer_turnover_ww ?? null,
        target_name:                 body.target_name.trim(),
        target_assets_india:         body.target_assets_india ?? null,
        target_assets_worldwide:     body.target_assets_ww ?? null,
        target_turnover_india:       body.target_turnover_india ?? null,
        target_turnover_worldwide:   body.target_turnover_ww ?? null,
        target_india_turnover_pct:   body.target_india_turnover_pct ?? null,
        group_assets_india:          body.group_assets_india ?? null,
        group_assets_worldwide:      body.group_assets_ww ?? null,
        group_turnover_india:        body.group_turnover_india ?? null,
        group_turnover_worldwide:    body.group_turnover_ww ?? null,
        deal_value:                  body.deal_value ?? null,
        transaction_type:            body.transaction_type ?? null,
        verdict:                     body.verdict as 'filing_required' | 'exempt' | 'borderline',
        form_type:                   body.form_type ?? null,
        triggered_tests:             body.triggered_tests ?? [],
        exempt_reasons:              body.exempt_reasons ?? [],
      })
      .select('id')
      .single()

    if (insertErr || !assessment) {
      console.error('[cci/POST] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 })
    }

    return NextResponse.json({ id: assessment.id })
  } catch (err) {
    console.error('[cci/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
