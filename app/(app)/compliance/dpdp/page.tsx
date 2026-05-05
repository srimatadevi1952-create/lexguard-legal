import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DpdpClient } from '@/components/compliance/dpdp-client'
import type {
  CompliancePosture, ComplianceItem, DprRequest,
  DpdpBreach, DpdpNotice,
} from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'DPDP Act 2023 — Compliance' }

export default async function DpdpPage() {
  const supabase = createClient()

  // Get DPDP regime ID
  const { data: regime } = await supabase
    .from('compliance_regimes')
    .select('id')
    .eq('code', 'dpdp')
    .single()

  const regimeId = regime?.id ?? ''

  const [
    { data: posture },
    { data: items },
    { data: dprRequests },
    { data: breaches },
    { data: notices },
    { data: contractFlags },
  ] = await Promise.all([
    supabase
      .from('compliance_postures')
      .select('*')
      .eq('regime_id', regimeId)
      .maybeSingle(),

    supabase
      .from('compliance_items')
      .select('*')
      .eq('regime_id', regimeId)
      .order('due_date', { ascending: true, nullsFirst: false }),

    supabase
      .from('dpr_requests')
      .select('*')
      .order('sla_deadline', { ascending: true }),

    supabase
      .from('dpdp_breaches')
      .select('*')
      .order('discovered_at', { ascending: false }),

    supabase
      .from('dpdp_notices')
      .select('*')
      .order('updated_at', { ascending: false }),

    supabase
      .from('contract_flags')
      .select(`
        id, contract_id, severity, category, title, description,
        exact_quote, is_resolved, created_at,
        contracts!contract_id(id, title, counterparty, contract_type)
      `)
      .eq('category', 'dpdp')
      .eq('is_resolved', false)
      .order('severity', { ascending: false })
      .limit(50),
  ])

  return (
    <DpdpClient
      posture={(posture ?? null) as CompliancePosture | null}
      items={(items ?? []) as ComplianceItem[]}
      dprRequests={(dprRequests ?? []) as DprRequest[]}
      breaches={(breaches ?? []) as DpdpBreach[]}
      notices={(notices ?? []) as DpdpNotice[]}
      contractFlags={(contractFlags ?? []) as unknown as Parameters<typeof DpdpClient>[0]['contractFlags']}
      regimeId={regimeId}
    />
  )
}
