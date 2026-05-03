'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  AlertTriangle, AlertCircle, Info, CheckCircle,
  MessageSquare, FileText,
  Send, Copy, Check, RefreshCw, Download, Archive,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/supabase/audit'
import type {
  Contract, ContractVersion, ContractClause, ContractFlag,
  ContractSummary, ContractChatMessage, AuditLogEntry,
  FlagSeverity, FlagCategory, RiskLevel,
} from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_BG: Record<RiskLevel, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-green-100 text-green-700 border-green-200',
}

const SEVERITY_HIGHLIGHT: Record<FlagSeverity, string> = {
  critical: 'bg-red-100 border-l-2 border-red-500',
  high:     'bg-orange-50 border-l-2 border-orange-400',
  medium:   'bg-amber-50 border-l-2 border-amber-400',
  low:      'bg-gray-50 border-l-2 border-gray-300',
}

const SEVERITY_DOT: Record<FlagSeverity, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-amber-400',
  low:      'bg-gray-400',
}

const SEVERITY_ORDER: Record<FlagSeverity, number> = {
  critical: 3, high: 2, medium: 1, low: 0,
}

const CATEGORY_LABELS: Record<FlagCategory, string> = {
  dpdp:          'DPDP Act',
  gst:           'GST',
  contract_act:  'Contract Act',
  it_act:        'IT Act',
  companies_act: 'Companies Act',
  labour:        'Labour Law',
  sebi:          'SEBI',
  fema:          'FEMA',
  commercial:    'Commercial',
  drafting:      'Drafting',
}

type Tab = 'flags' | 'summary' | 'chat' | 'history' | 'compliance'

// Build text highlight segments from clauses + flags
type TextSegment = {
  text: string
  clauseId?: string
  severity?: FlagSeverity
}

function buildSegments(
  fullText: string,
  clauses: ContractClause[],
  flags: ContractFlag[],
): TextSegment[] {
  const clauseSeverity = new Map<string, FlagSeverity>()
  flags.forEach((f) => {
    if (!f.clause_id) return
    const cur = clauseSeverity.get(f.clause_id)
    if (!cur || SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[cur]) {
      clauseSeverity.set(f.clause_id, f.severity)
    }
  })

  const positioned = clauses
    .filter((c) => c.char_start != null && c.char_end != null && c.char_end > c.char_start)
    .sort((a, b) => a.char_start! - b.char_start!)

  if (!positioned.length) return [{ text: fullText }]

  const segments: TextSegment[] = []
  let cursor = 0

  for (const clause of positioned) {
    const start = clause.char_start!
    const end = Math.min(clause.char_end!, fullText.length)
    if (start > cursor) segments.push({ text: fullText.slice(cursor, start) })
    segments.push({
      text: fullText.slice(start, end),
      clauseId: clause.id,
      severity: clauseSeverity.get(clause.id),
    })
    cursor = end
  }

  if (cursor < fullText.length) segments.push({ text: fullText.slice(cursor) })
  return segments
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  contract: Contract & { contract_versions: ContractVersion[] }
  clauses: ContractClause[]
  flags: ContractFlag[]
  summary: ContractSummary | null
  chatMessages: ContractChatMessage[]
  auditLog: AuditLogEntry[]
  userId: string
}

// ── Main component ────────────────────────────────────────────────────────────

export function ContractDetail({
  contract,
  clauses,
  flags: initialFlags,
  summary,
  chatMessages: initialMessages,
  auditLog,
  userId,
}: Props) {
  const router = useRouter()
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null)
  const [activeFlagId, setActiveFlagId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(`lastTab_${contract.id}`) as Tab) ?? 'flags'
    }
    return 'flags'
  })
  const [summaryLang, setSummaryLang] = useState<'en' | 'hi'>('en')
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [flags, setFlags] = useState(initialFlags)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState(initialMessages)
  const [chatLoading, setChatLoading] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)

  const centerRef = useRef<HTMLDivElement>(null)
  const clauseRefs = useRef<Record<string, HTMLSpanElement>>({})
  const chatEndRef = useRef<HTMLDivElement>(null)

  const latestVersion = [...(contract.contract_versions ?? [])].sort(
    (a, b) => b.version_number - a.version_number
  )[0]
  const contractText = latestVersion?.extracted_text ?? ''

  const segments = buildSegments(contractText, clauses, flags)
  const topClauses = clauses.filter((c) => !c.parent_id)
  const childClauses = Object.fromEntries(
    clauses.filter((c) => c.parent_id).reduce((map, c) => {
      const arr = map.get(c.parent_id!) ?? []
      arr.push(c)
      map.set(c.parent_id!, arr)
      return map
    }, new Map<string, ContractClause[]>())
  )

  // Persist tab choice
  useEffect(() => {
    localStorage.setItem(`lastTab_${contract.id}`, tab)
  }, [tab, contract.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Scroll centre pane to clause
  function scrollToClause(clauseId: string) {
    const el = clauseRefs.current[clauseId]
    if (el && centerRef.current) {
      centerRef.current.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
    }
    setActiveClauseId(clauseId)
  }

  // Click flag in right pane → scroll to clause
  function openFlag(flag: ContractFlag) {
    setActiveFlagId(flag.id)
    if (flag.clause_id) scrollToClause(flag.clause_id)
  }

  // Accept / dismiss flag
  async function handleFlagAction(flag: ContractFlag, action: 'accepted' | 'rejected') {
    const supabase = createClient()
    await supabase
      .from('contract_flags')
      .update({ is_resolved: true, resolved_by: userId, resolved_at: new Date().toISOString() })
      .eq('id', flag.id)

    const orgId = contract.org_id
    await logAudit(supabase, {
      orgId,
      entityType: 'contract_flag',
      entityId: flag.id,
      action: `ai_suggestion_${action}`,
      before: { is_resolved: false },
      after: { is_resolved: true, action },
    })

    if (action === 'accepted' && flag.suggested_fix) {
      await navigator.clipboard.writeText(flag.suggested_fix).catch(() => null)
      toast.success('Suggested fix copied to clipboard')
    } else {
      toast.success('Flag dismissed')
    }

    setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, is_resolved: true } : f))
  }

  // Chat submit
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return
    const message = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), contract_id: contract.id, user_id: userId, role: 'user', content: message, created_at: new Date().toISOString() },
    ])

    try {
      const res = await fetch('/api/contracts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contract.id, message }),
      })
      const data = await res.json() as { answer?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Chat failed')
      setChatMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), contract_id: contract.id, user_id: userId, role: 'assistant', content: data.answer!, created_at: new Date().toISOString() },
      ])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Chat failed')
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, contract.id, userId])

  // ── Layout ────────────────────────────────────────────────────────────────

  const unresolvedFlags = flags.filter((f) => !f.is_resolved)
  const resolvedFlags = flags.filter((f) => f.is_resolved)

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-white shrink-0">
        {contract.risk_level && (
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${RISK_BG[contract.risk_level]}`}>
            {contract.risk_score !== null && <span className="text-base font-bold">{contract.risk_score}</span>}
            {contract.risk_level.charAt(0).toUpperCase() + contract.risk_level.slice(1)} Risk
          </span>
        )}
        {!contract.risk_level && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            Analysis pending
          </span>
        )}

        <div className="h-4 w-px bg-gray-200" />

        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[360px]">{contract.title}</h1>
          <p className="text-[10px] text-gray-400">
            {contract.counterparty && <>{contract.counterparty} · </>}
            {contract.contract_type.toUpperCase()}
            {contract.execution_status && (
              <> · <span className="capitalize">{contract.execution_status.replace('_', ' ')}</span></>
            )}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {unresolvedFlags.length} unresolved flag{unresolvedFlags.length !== 1 ? 's' : ''}
          </span>
          <div className="relative">
            <button
              onClick={() => setActionsOpen(!actionsOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Actions <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-xs">
                  <button onClick={() => { toast.info('Download coming soon'); setActionsOpen(false) }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"><Download className="w-3.5 h-3.5 text-gray-400" /> Download</button>
                  <button onClick={() => { router.push('/contracts/upload'); setActionsOpen(false) }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-gray-400" /> Reanalyse</button>
                  <button onClick={() => { toast.info('Archive coming soon'); setActionsOpen(false) }} className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-2"><Archive className="w-3.5 h-3.5" /> Archive</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Three-pane area ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── LEFT PANE: Clause outline ──────────────────────────────────────── */}
        <aside
          className={`shrink-0 border-r border-gray-100 bg-white overflow-y-auto transition-all duration-200 ${leftCollapsed ? 'w-8' : 'w-[260px]'}`}
        >
          {leftCollapsed ? (
            <button
              onClick={() => setLeftCollapsed(false)}
              className="w-full h-full flex items-start justify-center pt-4"
              title="Expand outline"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ) : (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Outline
                </span>
                <button onClick={() => setLeftCollapsed(true)} title="Collapse">
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              {clauses.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">No clauses extracted yet.</p>
              ) : (
                <nav className="space-y-0.5">
                  {topClauses.map((clause) => (
                    <ClauseTreeItem
                      key={clause.id}
                      clause={clause}
                      childItems={childClauses[clause.id] ?? []}
                      grandchildren={childClauses}
                      flags={flags}
                      activeId={activeClauseId}
                      onSelect={scrollToClause}
                      depth={0}
                    />
                  ))}
                </nav>
              )}
            </div>
          )}
        </aside>

        {/* ── CENTRE PANE: Contract text with highlights ─────────────────────── */}
        <main
          ref={centerRef}
          className="flex-1 overflow-y-auto bg-gray-50 p-6 min-w-0"
        >
          {!contractText ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Contract text not yet extracted.</p>
              <p className="text-xs text-gray-400 mt-1">
                {contract.analysis_completed_at ? 'Extraction may have failed.' : 'Run analysis to extract text.'}
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="font-serif text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                {segments.map((seg, i) => {
                  if (!seg.clauseId) return <span key={i}>{seg.text}</span>
                  const clauseFlags = flags.filter((f) => f.clause_id === seg.clauseId && !f.is_resolved)
                  return (
                    <span
                      key={i}
                      ref={(el) => { if (el && seg.clauseId) clauseRefs.current[seg.clauseId] = el }}
                      className={`relative cursor-pointer rounded transition-colors ${
                        seg.severity ? SEVERITY_HIGHLIGHT[seg.severity] : ''
                      } ${activeClauseId === seg.clauseId ? 'ring-1 ring-brand-teal ring-offset-1' : ''}`}
                      onClick={() => {
                        if (seg.clauseId) {
                          setActiveClauseId(seg.clauseId)
                          const firstFlag = clauseFlags[0]
                          if (firstFlag) {
                            setActiveFlagId(firstFlag.id)
                            setTab('flags')
                          }
                        }
                      }}
                      title={clauseFlags.length > 0 ? `${clauseFlags.length} flag(s) — click to view` : undefined}
                    >
                      {seg.text}
                      {clauseFlags.length > 0 && (
                        <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold ml-0.5 align-middle ${
                          seg.severity === 'critical' ? 'bg-red-500' : seg.severity === 'high' ? 'bg-orange-400' : 'bg-amber-400'
                        }`}>
                          {clauseFlags.length}
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT PANE: Tabs ───────────────────────────────────────────────── */}
        <aside className="w-[320px] shrink-0 border-l border-gray-100 bg-white flex flex-col overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b border-gray-100 shrink-0">
            {([
              ['flags', 'Flags', unresolvedFlags.length],
              ['summary', 'Summary', null],
              ['chat', 'Chat', null],
              ['history', 'History', null],
              ['compliance', 'Compliance', null],
            ] as [Tab, string, number | null][]).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2 text-[10px] font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-brand-teal text-brand-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {count !== null && count > 0 && (
                  <span className="ml-1 px-1 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-bold">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Flags tab ────────────────────────────────────────────────── */}
            {tab === 'flags' && (
              <div className="p-3 space-y-2">
                {unresolvedFlags.length === 0 && resolvedFlags.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No flags found.</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {contract.analysis_completed_at ? 'This contract appears clean.' : 'Analysis not yet run.'}
                    </p>
                  </div>
                )}
                {unresolvedFlags
                  .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])
                  .map((flag) => (
                    <FlagCard
                      key={flag.id}
                      flag={flag}
                      active={activeFlagId === flag.id}
                      onClick={() => openFlag(flag)}
                      onAccept={() => handleFlagAction(flag, 'accepted')}
                      onDismiss={() => handleFlagAction(flag, 'rejected')}
                    />
                  ))}
                {resolvedFlags.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 py-1">
                      {resolvedFlags.length} resolved flag{resolvedFlags.length !== 1 ? 's' : ''}
                    </summary>
                    <div className="mt-1 space-y-1">
                      {resolvedFlags.map((f) => (
                        <div key={f.id} className="px-2 py-1.5 rounded bg-gray-50 text-[10px] text-gray-400 line-through">
                          {f.title}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* ── Summary tab ──────────────────────────────────────────────── */}
            {tab === 'summary' && (
              <div className="p-4">
                {!summary ? (
                  <p className="text-xs text-gray-500 text-center py-8">
                    Summary not yet generated. Run analysis first.
                  </p>
                ) : (
                  <>
                    {/* Language toggle */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Summary</span>
                      <button
                        onClick={() => setSummaryLang(summaryLang === 'en' ? 'hi' : 'en')}
                        className="flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50"
                      >
                        <span className={summaryLang === 'en' ? 'text-brand-teal' : 'text-gray-400'}>EN</span>
                        <span className="text-gray-300">/</span>
                        <span className={summaryLang === 'hi' ? 'text-brand-teal' : 'text-gray-400 font-devanagari'}>हिं</span>
                      </button>
                    </div>

                    {/* Short summary */}
                    <div className="text-xs text-gray-700 leading-relaxed mb-3">
                      {summaryLang === 'en'
                        ? (summaryExpanded ? summary.summary_en_long : summary.summary_en_short)
                        : (summaryExpanded ? summary.summary_hi_long : summary.summary_hi_short)
                      }
                    </div>
                    <button
                      onClick={() => setSummaryExpanded(!summaryExpanded)}
                      className="text-[10px] text-brand-teal hover:underline flex items-center gap-1 mb-4"
                    >
                      {summaryExpanded
                        ? <><ChevronUp className="w-3 h-3" /> Show less</>
                        : <><ChevronDown className="w-3 h-3" /> Read full (500 words)</>
                      }
                    </button>

                    {/* Key terms */}
                    {summary.key_terms && Object.keys(summary.key_terms).length > 0 && (
                      <>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Key Terms</div>
                        <table className="w-full text-[11px]">
                          <tbody className="divide-y divide-gray-50">
                            {Object.entries(summary.key_terms as Record<string, string | string[] | undefined>)
                              .filter(([, v]) => v)
                              .map(([key, value]) => (
                                <tr key={key}>
                                  <td className="py-1.5 pr-2 text-gray-500 capitalize font-medium w-24">{key}</td>
                                  <td className="py-1.5 text-gray-800">
                                    {Array.isArray(value) ? value.join(', ') : value}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Chat tab ─────────────────────────────────────────────────── */}
            {tab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Ask questions about this contract.</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Powered by Claude AI. Cites clause numbers.
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-brand-teal text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 px-3 py-2 rounded-xl rounded-bl-none text-xs text-gray-500">
                        <span className="inline-flex gap-1">
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-gray-100 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                    placeholder="Ask about this contract…"
                    disabled={chatLoading}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50"
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-2 bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── History tab ──────────────────────────────────────────────── */}
            {tab === 'history' && (
              <div className="p-3 space-y-2">
                {auditLog.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No audit trail yet.</p>
                ) : (
                  auditLog.map((entry) => (
                    <div key={entry.id} className="flex gap-2 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-gray-700 capitalize">{entry.action.replace(/_/g, ' ')}</span>
                        <span className="text-gray-400 ml-2">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Compliance tab ────────────────────────────────────────────── */}
            {tab === 'compliance' && (
              <div className="p-3">
                {flags.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No flags to summarise.</p>
                ) : (
                  <div className="space-y-3">
                    {(Object.entries(CATEGORY_LABELS) as [FlagCategory, string][]).map(([cat, label]) => {
                      const catFlags = flags.filter((f) => f.category === cat && !f.is_resolved)
                      if (!catFlags.length) return null
                      const maxSev = catFlags.reduce<FlagSeverity>((max, f) =>
                        SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[max] ? f.severity : max,
                        'low'
                      )
                      return (
                        <div key={cat} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[maxSev]}`} />
                            <span className="text-xs text-gray-700">{label}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${
                            maxSev === 'critical' ? 'bg-red-50 text-red-600'
                            : maxSev === 'high' ? 'bg-orange-50 text-orange-600'
                            : maxSev === 'medium' ? 'bg-amber-50 text-amber-600'
                            : 'bg-gray-50 text-gray-500'
                          }`}>
                            {catFlags.length} {maxSev}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </aside>
      </div>
    </div>
  )
}

// ── Clause tree item ──────────────────────────────────────────────────────────

function ClauseTreeItem({
  clause, childItems, grandchildren, flags, activeId, onSelect, depth,
}: {
  clause: ContractClause
  childItems: ContractClause[]
  grandchildren: Record<string, ContractClause[]>
  flags: ContractFlag[]
  activeId: string | null
  onSelect: (id: string) => void
  depth: number
}) {
  const [open, setOpen] = useState(depth === 0)
  const clauseFlags = flags.filter((f) => f.clause_id === clause.id && !f.is_resolved)
  const maxSev = clauseFlags.reduce<FlagSeverity | null>((max, f) =>
    !max || SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[max] ? f.severity : max, null
  )

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-[11px] transition-colors group ${
          activeId === clause.id
            ? 'bg-brand-teal-light text-brand-teal'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => onSelect(clause.id)}
      >
        {childItems.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
            className="shrink-0 text-gray-400"
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
        <span className="truncate flex-1">
          {clause.clause_number && <span className="text-gray-400 mr-1">{clause.clause_number}</span>}
          {clause.heading ?? clause.body.slice(0, 40)}
        </span>
        {maxSev && (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[maxSev]}`} />
        )}
      </div>
      {open && childItems.map((child) => (
        <ClauseTreeItem
          key={child.id}
          clause={child}
          childItems={grandchildren[child.id] ?? []}
          grandchildren={grandchildren}
          flags={flags}
          activeId={activeId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

// ── Flag card ─────────────────────────────────────────────────────────────────

function FlagCard({
  flag, active, onClick, onAccept, onDismiss,
}: {
  flag: ContractFlag
  active: boolean
  onClick: () => void
  onAccept: () => void
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copyFix() {
    if (!flag.suggested_fix) return
    await navigator.clipboard.writeText(flag.suggested_fix)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`rounded-lg border cursor-pointer transition-all ${
        active ? 'border-brand-teal shadow-sm' : 'border-gray-100 hover:border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className={`px-3 py-2 rounded-t-lg ${SEVERITY_HIGHLIGHT[flag.severity]}`}>
        <div className="flex items-start gap-2">
          {flag.severity === 'critical' && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
          {flag.severity === 'high' && <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />}
          {flag.severity === 'medium' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
          {flag.severity === 'low' && <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-gray-700 capitalize">{flag.severity}</span>
              <span className="text-[9px] text-gray-400">·</span>
              <span className="text-[9px] text-gray-500">{CATEGORY_LABELS[flag.category]}</span>
            </div>
            <p className="text-xs font-semibold text-gray-900 mt-0.5">{flag.title}</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 space-y-2">
        <p className="text-[11px] text-gray-600 leading-relaxed">{flag.description}</p>

        {flag.exact_quote && (
          <blockquote className="text-[10px] text-gray-500 italic border-l-2 border-gray-200 pl-2">
            &ldquo;{flag.exact_quote.slice(0, 120)}{flag.exact_quote.length > 120 ? '…' : ''}&rdquo;
          </blockquote>
        )}

        {flag.suggested_fix && (
          <div className="bg-green-50 rounded p-2">
            <p className="text-[9px] font-semibold text-green-700 uppercase tracking-wide mb-1">Suggested fix</p>
            <p className="text-[11px] text-green-800 leading-relaxed">{flag.suggested_fix}</p>
          </div>
        )}

        {flag.flag_references && Array.isArray(flag.flag_references) && flag.flag_references.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(flag.flag_references as Array<{ citation?: string; reference?: string }>).slice(0, 3).map((r, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-medium">
                {r.citation ?? r.reference ?? JSON.stringify(r)}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onAccept(); copyFix() }}
            className="flex items-center gap-1 px-2 py-1 bg-brand-teal text-white rounded text-[10px] font-medium hover:bg-brand-teal-dark transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            Insert fix
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss() }}
            className="flex items-center gap-1 px-2 py-1 border border-gray-200 text-gray-600 rounded text-[10px] font-medium hover:bg-gray-50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
