import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAnalysisPipeline } from '@/lib/contracts/analysis'
import { logAudit } from '@/lib/supabase/audit'

// Vercel Hobby plan: max 60s. Pro plan: up to 300s.
// With 50k char truncation + parallel risk batches the pipeline typically
// completes in 60–90s, so Pro is recommended for reliable completion.
export const maxDuration = 60

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

    // Mark as analysing immediately so the polling endpoint reflects progress.
    // Stamp updated_at so the stuck-contract detector in /status has an
    // accurate start time (Supabase doesn't auto-update this column).
    const admin = createAdminClient()
    await admin
      .from('contracts')
      .update({ execution_status: 'analysing', updated_at: new Date().toISOString() })
      .eq('id', contractId)

    // waitUntil() tells Vercel to keep this function alive until the promise
    // settles, even though we return the 202 response right away.
    // Without this, Vercel kills the function the moment the response is sent.
    const pipelineStart = Date.now()
    console.log(`[analyse] registering waitUntil for contractId=${contractId} at ${new Date().toISOString()}`)

    waitUntil(
      runAnalysisPipeline(contractId)
        .then(async () => {
          console.log(`[analyse] pipeline DONE in ${Date.now() - pipelineStart}ms`)
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
            `[analyse] pipeline FAILED after ${Date.now() - pipelineStart}ms:`,
            err instanceof Error ? err.message : err
          )
        })
    )

    console.log(`[analyse] returning 202 for contractId=${contractId}`)
    return NextResponse.json({ status: 'analysing', contract_id: contractId }, { status: 202 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    console.error('[analyse] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
