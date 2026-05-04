import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    .select('id, execution_status, risk_score, risk_level, analysis_completed_at')
    .eq('id', params.id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Derive a simple status the UI can act on
  let status: 'analysing' | 'completed' | 'failed'
  if (contract.execution_status === 'analysis_failed') {
    status = 'failed'
  } else if (
    contract.execution_status !== 'analysing' &&
    contract.analysis_completed_at !== null
  ) {
    status = 'completed'
  } else {
    status = 'analysing'
  }

  return NextResponse.json({
    status,
    execution_status: contract.execution_status,
    risk_score: contract.risk_score,
    risk_level: contract.risk_level,
  })
}
