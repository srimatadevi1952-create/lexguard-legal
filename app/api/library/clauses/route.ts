/**
 * POST /api/library/clauses
 *
 * Authenticated. Creates an org_private clause for the current org.
 * Only admin and senior_lawyer roles may call this endpoint.
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

    // Check role
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['admin', 'senior_lawyer'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only admin or senior lawyer can add private clauses' }, { status: 403 })
    }

    const body = await request.json() as {
      title?:                    string
      category?:                 string
      clause_text_en?:           string
      clause_text_hi?:           string | null
      use_case?:                 string | null
      risk_notes?:               string | null
      party_position?:           string
      applicable_acts?:          string[]
      applicable_contract_types?: string[]
      statute_references?:       string | null
    }

    if (!body.title?.trim() || !body.clause_text_en?.trim() || !body.category) {
      return NextResponse.json(
        { error: 'title, category, and clause_text_en are required' },
        { status: 400 },
      )
    }

    const validPositions = ['drafter_favours', 'counterparty_favours', 'neutral']
    const partyPosition = validPositions.includes(body.party_position ?? '')
      ? body.party_position
      : 'neutral'

    const { data: clause, error: insertErr } = await supabase
      .from('clauses')
      .insert({
        org_id:                    orgId,
        title:                     body.title.trim(),
        category:                  body.category,
        clause_text_en:            body.clause_text_en.trim(),
        clause_text_hi:            body.clause_text_hi ?? null,
        use_case:                  body.use_case ?? null,
        risk_notes:                body.risk_notes ?? null,
        party_position:            partyPosition as 'drafter_favours' | 'counterparty_favours' | 'neutral',
        applicable_acts:           body.applicable_acts ?? [],
        applicable_contract_types: body.applicable_contract_types ?? [],
        statute_references:        body.statute_references ?? null,
        visibility:                'org_private',
        created_by:                user.id,
      })
      .select('*')
      .single()

    if (insertErr || !clause) {
      console.error('[library/clauses POST] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to create clause' }, { status: 500 })
    }

    return NextResponse.json({ clause })
  } catch (err) {
    console.error('[library/clauses POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
