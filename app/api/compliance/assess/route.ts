/**
 * POST /api/compliance/assess
 *
 * Authenticated. Saves DPDP posture assessment answers, computes scores,
 * upserts compliance_postures, and creates compliance_items for No/Partially answers.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/supabase/audit'

interface PillarAnswer {
  pillar_id: string
  answers: ('yes' | 'no' | 'partially')[]
  questions: string[]
}

// Score a pillar: Yes=2, Partially=1, No=0 → scale to 0-10
function scorePillar(answers: ('yes' | 'no' | 'partially')[]): number {
  const earned = answers.reduce((s, a) => s + (a === 'yes' ? 2 : a === 'partially' ? 1 : 0), 0)
  const max = answers.length * 2
  return Math.round((earned / max) * 10)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json() as { pillars: PillarAnswer[] }
    const { pillars } = body

    if (!Array.isArray(pillars) || pillars.length === 0) {
      return NextResponse.json({ error: 'pillars array is required' }, { status: 400 })
    }

    // Get current org
    const { data: orgIdRow } = await supabase.rpc('current_org_id')
    const orgId = orgIdRow as string | null
    if (!orgId) {
      return NextResponse.json({ error: 'No active organisation' }, { status: 400 })
    }

    // Get DPDP regime ID
    const { data: regime } = await supabase
      .from('compliance_regimes')
      .select('id')
      .eq('code', 'dpdp')
      .single()

    if (!regime) {
      return NextResponse.json({ error: 'DPDP regime not found' }, { status: 500 })
    }

    // Compute per-pillar scores
    const pillarScores: Record<string, number> = {}
    let totalScore = 0

    for (const p of pillars) {
      const s = scorePillar(p.answers)
      pillarScores[p.pillar_id] = s
      totalScore += s
    }

    const overallScore = Math.round(totalScore / pillars.length)

    // Determine trend by comparing with previous posture
    const { data: existing } = await supabase
      .from('compliance_postures')
      .select('score')
      .eq('regime_id', regime.id)
      .single()

    const prevScore = existing?.score ?? null
    const trend = prevScore === null ? 'stable'
      : overallScore > prevScore + 2 ? 'improving'
      : overallScore < prevScore - 2 ? 'declining'
      : 'stable'

    // Upsert posture
    const { error: upsertErr } = await supabase
      .from('compliance_postures')
      .upsert({
        org_id:          orgId,
        regime_id:       regime.id,
        score:           overallScore,
        pillar_scores:   pillarScores,
        trend,
        last_assessed_at: new Date().toISOString(),
        assessed_by:     user.id,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'org_id,regime_id' })

    if (upsertErr) {
      console.error('[assess/POST] upsert error:', upsertErr)
      return NextResponse.json({ error: 'Failed to save posture' }, { status: 500 })
    }

    // Create compliance_items for No and Partially answers
    const itemsToInsert = []
    for (const p of pillars) {
      for (let i = 0; i < p.answers.length; i++) {
        const answer = p.answers[i]
        if (answer === 'no' || answer === 'partially') {
          itemsToInsert.push({
            org_id:          orgId,
            regime_id:       regime.id,
            title:           p.questions[i] ?? `${p.pillar_id} question ${i + 1}`,
            description:     answer === 'partially'
              ? 'Partially implemented — requires completion.'
              : 'Not implemented — action required to achieve compliance.',
            status:          'open' as const,
            priority:        (pillarScores[p.pillar_id] ?? 10) <= 4 ? 'high' as const : 'medium' as const,
            source:          'assessment' as const,
            source_question: p.questions[i],
          })
        }
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabase
        .from('compliance_items')
        .insert(itemsToInsert)

      if (itemsErr) {
        console.error('[assess/POST] items insert error:', itemsErr)
        // non-fatal — posture was saved successfully
      }
    }

    await logAudit(supabase, {
      orgId,
      entityType: 'compliance_posture',
      entityId:   regime.id,
      action:     'assessed',
      after:      { score: overallScore, pillar_scores: pillarScores, items_created: itemsToInsert.length },
    })

    return NextResponse.json({
      score:         overallScore,
      pillar_scores: pillarScores,
      trend,
      items_created: itemsToInsert.length,
    })
  } catch (err) {
    console.error('[assess/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
