import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Any contract stuck in 'analysing' beyond this threshold is auto-recovered.
// Vercel Hobby functions time out at 60s; 5 minutes is a safe upper bound.
const STUCK_TIMEOUT_MS = 5 * 60 * 1000

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Select created_at too — used as fallback if updated_at is missing/NaN
  // (hand-authored types may not expose updated_at; cast via unknown to access it)
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, execution_status, risk_score, risk_level, analysis_completed_at, analysis_error, updated_at, created_at')
    .eq('id', params.id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Access timestamps through unknown cast — hand-authored types may not
  // include these columns, but Supabase always returns them from the select.
  const raw = contract as unknown as Record<string, unknown>
  const updatedAtStr  = (raw.updated_at  as string | null) ?? null
  const createdAtStr  = (raw.created_at  as string | null) ?? null
  const analysisError = (raw.analysis_error as string | null) ?? null

  let { execution_status } = contract
  let effectiveAnalysisError = analysisError

  // Auto-recover contracts stuck in 'analysing' after a Vercel timeout.
  if (execution_status === 'analysing') {
    // Prefer updated_at (stamped when we set analysing); fall back to created_at.
    const timestampStr = updatedAtStr ?? createdAtStr
    const startedAt    = timestampStr ? new Date(timestampStr).getTime() : NaN
    const ageMs        = Number.isNaN(startedAt) ? Infinity : Date.now() - startedAt

    console.log(`[status] stuck-check id=${params.id}`, {
      updated_at: updatedAtStr,
      created_at: createdAtStr,
      age_ms: ageMs,
      threshold_ms: STUCK_TIMEOUT_MS,
      will_recover: ageMs > STUCK_TIMEOUT_MS,
    })

    if (ageMs > STUCK_TIMEOUT_MS) {
      const errorMsg = 'Pipeline timed out (Vercel function limit exceeded)'
      console.warn(`[status] recovering stuck contract ${params.id} — age=${Math.round(ageMs / 1000)}s`)
      const admin = createAdminClient()
      const { error: updateErr } = await admin
        .from('contracts')
        .update({
          execution_status: 'analysis_failed',
          analysis_error: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .eq('execution_status', 'analysing') // guard against race condition
      if (updateErr) {
        console.error('[status] failed to mark stuck contract:', updateErr.message)
      } else {
        execution_status = 'analysis_failed'
        effectiveAnalysisError = errorMsg
      }
    }
  }

  let status: 'analysing' | 'completed' | 'failed'
  if (execution_status === 'analysis_failed') {
    status = 'failed'
  } else if (
    execution_status !== 'analysing' &&
    contract.analysis_completed_at !== null
  ) {
    status = 'completed'
  } else {
    status = 'analysing'
  }

  return NextResponse.json({
    status,
    execution_status,
    risk_score: contract.risk_score,
    risk_level: contract.risk_level,
    analysis_error: effectiveAnalysisError,
  })
}
