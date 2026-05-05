/**
 * POST /api/compliance/gst/rescan
 *
 * Authenticated. Scans all contracts with extracted text for GST gaps using
 * the deterministic checkGstClauses() function, then replaces open gst_findings
 * for each scanned contract with fresh results.
 *
 * Returns: { scanned: number, created: number }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkGstClauses } from '@/lib/contracts/gst-checker'

export async function POST() {
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

    // 1. Fetch all analysed contracts for this org
    const { data: contracts, error: contractsErr } = await supabase
      .from('contracts')
      .select('id')
      .eq('org_id', orgId)
      .not('analysis_completed_at', 'is', null)

    if (contractsErr) {
      console.error('[gst/rescan] contracts fetch error:', contractsErr)
      return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
    }

    const contractIds = (contracts ?? []).map((c) => c.id)
    if (contractIds.length === 0) {
      return NextResponse.json({ scanned: 0, created: 0 })
    }

    // 2. Fetch latest version text per contract (highest version_number)
    const { data: allVersions, error: versionsErr } = await supabase
      .from('contract_versions')
      .select('contract_id, extracted_text, version_number')
      .in('contract_id', contractIds)
      .not('extracted_text', 'is', null)
      .order('version_number', { ascending: false })

    if (versionsErr) {
      console.error('[gst/rescan] versions fetch error:', versionsErr)
      return NextResponse.json({ error: 'Failed to fetch contract text' }, { status: 500 })
    }

    // Deduplicate: keep highest version per contract
    // Use a plain object instead of Map to avoid --downlevelIteration requirement
    const latestText: Record<string, string> = {}
    for (const v of allVersions ?? []) {
      if (!(v.contract_id in latestText) && v.extracted_text) {
        latestText[v.contract_id] = v.extracted_text
      }
    }

    const entries = Object.entries(latestText)
    let totalCreated = 0

    // 3. For each contract: delete open findings + insert fresh ones
    for (const [contractId, text] of entries) {
      const findings = checkGstClauses(text)

      // Delete existing open findings for this contract
      await supabase
        .from('gst_findings')
        .delete()
        .eq('org_id', orgId)
        .eq('contract_id', contractId)
        .eq('status', 'open')

      if (findings.length === 0) continue

      const rows = findings.map((f) => ({
        org_id:       orgId,
        contract_id:  contractId,
        finding_type: f.finding_type,
        description:  f.description,
        severity:     f.severity,
        status:       'open' as const,
      }))

      const { error: insertErr } = await supabase.from('gst_findings').insert(rows)
      if (insertErr) {
        console.error('[gst/rescan] insert error for contract', contractId, insertErr)
      } else {
        totalCreated += rows.length
      }
    }

    return NextResponse.json({ scanned: entries.length, created: totalCreated })
  } catch (err) {
    console.error('[gst/rescan] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
