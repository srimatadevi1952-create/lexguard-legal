import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callClaude } from '@/lib/claude'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json() as {
      contract_id?: string
      message?: string
    }
    const { contract_id, message } = body
    if (!contract_id || !message?.trim()) {
      return NextResponse.json({ error: 'contract_id and message are required' }, { status: 400 })
    }

    // Verify access + fetch contract text
    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .select('id, org_id, title, contract_versions(extracted_text, version_number)')
      .eq('id', contract_id)
      .single()

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const versions = contract.contract_versions as Array<{
      extracted_text: string | null; version_number: number
    }>
    const latestVersion = versions?.sort((a, b) => b.version_number - a.version_number)[0]
    const contractText = latestVersion?.extracted_text ?? '(Contract text not available)'

    // Fetch recent chat history (last 10 messages for context)
    const { data: history } = await supabase
      .from('contract_chat_messages')
      .select('role, content')
      .eq('contract_id', contract_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const contextMessages = (history ?? [])
      .reverse()
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')

    const prompt = `CONTRACT TITLE: ${contract.title}

CONTRACT TEXT (full):
${contractText.slice(0, 15000)}

${contextMessages ? `PREVIOUS CONVERSATION:\n${contextMessages}\n\n` : ''}USER QUESTION: ${message}

Answer the user's question based solely on the contract text above. Be precise, cite clause numbers where relevant, and apply Indian law principles.`

    const answer = await callClaude({
      model: 'claude-sonnet-4-6',
      system: 'You are an expert Indian contract lawyer. Answer questions about the provided contract text concisely and accurately. Always cite relevant clause numbers.',
      prompt,
      maxTokens: 2048,
    })

    // Save both messages to DB (use admin to bypass RLS for assistant message)
    const admin = createAdminClient()
    await admin.from('contract_chat_messages').insert([
      { contract_id, user_id: user.id, role: 'user' as const, content: message },
      { contract_id, user_id: user.id, role: 'assistant' as const, content: answer },
    ])

    return NextResponse.json({ answer })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    console.error('[chat] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
