import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAnalysisPipeline } from '@/lib/contracts/analysis'
import { logAudit } from '@/lib/supabase/audit'

export const maxDuration = 120 // 2 min — requires Vercel Pro for full effect

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

    // Run the full analysis pipeline (uses admin client internally)
    await runAnalysisPipeline(contractId)

    // Log audit event
    const admin = createAdminClient()
    await logAudit(admin as Parameters<typeof logAudit>[0], {
      orgId: contract.org_id,
      entityType: 'contract',
      entityId: contractId,
      action: 'analysis_completed',
      after: { title: contract.title },
    })

    return NextResponse.json({ success: true, contract_id: contractId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    console.error('[analyse] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
