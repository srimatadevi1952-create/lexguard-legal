import type { Metadata } from 'next'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { RegimePage, type SlimFlag } from '@/components/compliance/regime-page'

export const metadata: Metadata = { title: 'Companies Act 2013 — Compliance' }

export default async function CompaniesActPage() {
  const supabase = createClient()

  const { data: regime } = await supabase
    .from('compliance_regimes').select('id').eq('code', 'companies_act').single()
  const regimeId = regime?.id ?? ''

  const [{ data: posture }, { data: items }, { data: flags }] = await Promise.all([
    supabase.from('compliance_postures').select('*').eq('regime_id', regimeId).maybeSingle(),
    supabase.from('compliance_items').select('*').eq('regime_id', regimeId).order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('contract_flags').select('id, contract_id, title, severity, contracts!contract_id(id, title)')
      .eq('category', 'companies_act').eq('is_resolved', false).limit(20),
  ])

  return (
    <RegimePage
      regimeCode="companies_act"
      regimeName="Companies Act 2013"
      icon={Building2}
      posture={posture ?? null}
      items={items ?? []}
      contractFlags={(flags ?? []) as unknown as SlimFlag[]}
    />
  )
}
