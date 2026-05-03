import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ContractsList } from '@/components/contracts/contracts-list'

export const metadata: Metadata = { title: 'Contracts — LexGuard Legal' }

export default async function ContractsPage() {
  const supabase = createClient()

  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      id, title, counterparty, contract_type, execution_status,
      risk_score, risk_level, owner_id, expiry_date, updated_at,
      owner:users!owner_id(full_name),
      contract_tag_assignments(tag_id, contract_tags(id, name, color))
    `)
    .order('updated_at', { ascending: false })
    .limit(50)

  const { data: tags } = await supabase
    .from('contract_tags')
    .select('id, name, color')
    .order('name')

  return (
    <ContractsList
      initialContracts={contracts ?? []}
      availableTags={tags ?? []}
    />
  )
}
