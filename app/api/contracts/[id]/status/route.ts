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

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, execution_status, risk_score, risk_level, analysis_completed_at, analysis_error, updated_at')
    .eq('id', params.id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let { execution_status } = contract
  let analysis_error = contract.analysis_error ?? null

  // Auto-recover contracts stuck in 'analysing' after a Vercel timeout.
  // The function is killed before the catch block can write analysis_failed,
  // so the contract stays in 'analysing' forever without this check.
  if (execution_status === 'analysing') {
    const startedAt = new Date(contract.updated_at).getTime()
    if (Date.now() - startedAt > STUCK_TIMEOUT_MS) {
      const errorMsg = 'Pipeline timed out (Vercel function limit exceeded)'
      console.warn(`[status] contract ${params.id} stuck in analysing since ${contract.updated_at} — marking failed`)
      const admin = createAdminClient()
      await admin
        .from('contracts')
        .update({
          execution_status: 'analysis_failed',
          analysis_error: errorMsg,
        })
        .eq('id', params.id)
        .eq('execution_status', 'analysing') // guard against concurrent updates
      execution_status = 'analysis_failed'
      analysis_error = errorMsg
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
    analysis_error,
  })
}
