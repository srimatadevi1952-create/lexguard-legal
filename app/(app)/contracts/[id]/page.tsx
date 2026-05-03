import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContractDetail } from '@/components/contracts/contract-detail'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = createClient()
  const { data } = await supabase
    .from('contracts')
    .select('title')
    .eq('id', params.id)
    .single()
  return { title: data ? `${data.title} — LexGuard Legal` : 'Contract' }
}

export default async function ContractDetailPage({ params }: Props) {
  const supabase = createClient()

  const [
    contractResult,
    clausesResult,
    flagsResult,
    summaryResult,
    chatResult,
    auditResult,
  ] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, contract_versions(*)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('contract_clauses')
      .select('*')
      .eq('contract_id', params.id)
      .order('order_index'),
    supabase
      .from('contract_flags')
      .select('*')
      .eq('contract_id', params.id)
      .order('severity'),
    supabase
      .from('contract_summaries')
      .select('*')
      .eq('contract_id', params.id)
      .maybeSingle(),
    supabase
      .from('contract_chat_messages')
      .select('*')
      .eq('contract_id', params.id)
      .order('created_at')
      .limit(100),
    supabase
      .from('audit_log')
      .select('*')
      .eq('entity_type', 'contract')
      .eq('entity_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!contractResult.data) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ContractDetail
      contract={contractResult.data}
      clauses={clausesResult.data ?? []}
      flags={flagsResult.data ?? []}
      summary={summaryResult.data ?? null}
      chatMessages={chatResult.data ?? []}
      auditLog={auditResult.data ?? []}
      userId={user?.id ?? ''}
    />
  )
}
