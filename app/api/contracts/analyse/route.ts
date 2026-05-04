import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAnalysisPipeline } from '@/lib/contracts/analysis'
import { logAudit } from '@/lib/supabase/audit'

// 2-min cap on the Vercel function. The pipeline is fire-and-forget: we return
// 202 immediately then Vercel's Node.js runtime keeps the function alive until
// all pending async work drains (or maxDuration is hit).
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json() as { contract_id?: string }
    const contractId = body.contract_id
    if (!contractId) {
      return NextResponse.json({ error: 'contract_id is required' }, { status: 400 })
    }

    // Verify user has access to this contract (RLS via anon client)
    const { data: contract, error: accessErr } = await supabase
      .from('contracts')
      .select('id, org_id, title')
      .eq('id', contractId)
      .single()

    if (accessErr || !contract) {
      return NextResponse.json({ error: 'Contract not found or access denied' }, { status: 404 })
    }

    // Mark as analysing so the polling endpoint immediately reflects progress
    const admin = createAdminClient()
    await admin
      .from('contracts')
      .update({ execution_status: 'analysing' })
      .eq('id', contractId)

    // Fire-and-forget: start pipeline without awaiting.
    // Vercel's Node.js runtime keeps the function alive until the event loop
    // drains (up to maxDuration=120s), so the pipeline continues running after
    // we return the 202 below — no browser-level gateway timeout.
    void runAnalysisPipeline(contractId)
      .then(async () => {
        await logAudit(admin as Parameters<typeof logAudit>[0], {
          orgId: contract.org_id,
          entityType: 'contract',
          entityId: contractId,
          action: 'analysis_completed',
          after: { title: contract.title },
        })
      })
      .catch((err: unknown) => {
        console.error(
          '[analyse] background pipeline error:',
          err instanceof Error ? err.message : err
        )
      })

    return NextResponse.json({ status: 'analysing', contract_id: contractId }, { status: 202 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    console.error('[analyse] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
