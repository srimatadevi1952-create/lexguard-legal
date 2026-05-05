'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldAlert, ClipboardList, Inbox, AlertTriangle, FileText,
  Plus, X, ChevronLeft, ExternalLink, Clock, CheckCircle2,
  XCircle, Loader2, Copy, Check,
} from 'lucide-react'
import type {
  CompliancePosture, ComplianceItem, DprRequest,
  DpdpBreach, DpdpNotice,
  DpdpPillarScores,
} from '@/lib/supabase/types'

// Partial flag shape from DPDP query (partial select + joined contract)
interface DpdpFlag {
  id:          string
  contract_id: string
  severity:    string
  category:    string
  title:       string
  description: string
  exact_quote: string | null
  is_resolved: boolean
  created_at:  string
  contracts?:  { id: string; title: string; counterparty: string | null; contract_type: string } |
               { id: string; title: string; counterparty: string | null; contract_type: string }[] | null
}

// ---------------------------------------------------------------------------
// Helper constants
// ---------------------------------------------------------------------------
const PILLAR_LABELS: Record<string, string> = {
  notice: 'Notice', consent: 'Consent', rights: 'Rights',
  security: 'Security', accountability: 'Accountability', grievance: 'Grievance',
  breach: 'Breach Notif.', processor: 'Processors', retention: 'Retention',
  cross_border: 'Cross-Border',
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  access: 'Access', correction: 'Correction', erasure: 'Erasure',
  nomination: 'Nomination', grievance: 'Grievance', portability: 'Portability',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', closed: 'Closed', rejected: 'Rejected',
}

const BREACH_TYPE_LABELS: Record<string, string> = {
  confidentiality: 'Confidentiality', integrity: 'Integrity', availability: 'Availability',
}

const BREACH_STATUS_LABELS: Record<string, string> = {
  discovered: 'Discovered', investigating: 'Investigating',
  reported: 'Reported to DPB', closed: 'Closed',
}

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', published: 'Published', needs_review: 'Needs Review', archived: 'Archived',
}

function severityBadge(severity: string) {
  const c = {
    critical: 'bg-red-100 text-red-700',
    high:     'bg-orange-100 text-orange-700',
    medium:   'bg-amber-100 text-amber-700',
    low:      'bg-sky-100 text-sky-700',
  }[severity] ?? 'bg-slate-100 text-slate-600'
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c}`
}

function statusBadge(status: string) {
  const c = {
    open:        'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    closed:      'bg-green-100 text-green-700',
    rejected:    'bg-slate-100 text-slate-600',
    discovered:  'bg-red-100 text-red-700',
    investigating: 'bg-orange-100 text-orange-700',
    reported:    'bg-purple-100 text-purple-700',
    draft:       'bg-slate-100 text-slate-600',
    published:   'bg-green-100 text-green-700',
    needs_review: 'bg-amber-100 text-amber-700',
  }[status] ?? 'bg-slate-100 text-slate-600'
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c}`
}

function daysUntilDeadline(deadline: string) {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-600 font-semibold' }
  if (diff === 0) return { label: 'Due today', cls: 'text-red-600 font-semibold' }
  if (diff <= 7) return { label: `${diff}d left`, cls: 'text-amber-600 font-semibold' }
  return { label: `${diff}d left`, cls: 'text-slate-500' }
}

function maskName(name: string): string {
  const parts = name.trim().split(' ')
  return parts.map((p, i) => i === parts.length - 1
    ? p[0] + '.'
    : p
  ).join(' ')
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  posture:       CompliancePosture | null
  items:         ComplianceItem[]
  dprRequests:   DprRequest[]
  breaches:      DpdpBreach[]
  notices:       DpdpNotice[]
  contractFlags: DpdpFlag[]
  regimeId:      string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DpdpClient({
  posture, items, dprRequests, breaches, notices, contractFlags, regimeId: _regimeId,
}: Props) {
  const [dprTab, setDprTab]                 = useState<'open' | 'in_progress' | 'closed'>('open')
  const [showDprModal, setShowDprModal]     = useState(false)
  const [showBreachModal, setShowBreachModal] = useState(false)
  const [selectedDpr, setSelectedDpr]       = useState<DprRequest | null>(null)
  const [selectedBreach, setSelectedBreach] = useState<DpdpBreach | null>(null)
  const [dprSaving, setDprSaving]           = useState(false)
  const [breachSaving, setBreachSaving]     = useState(false)
  const [responseText, setResponseText]     = useState('')
  const [responseStatus, setResponseStatus] = useState<'in_progress' | 'closed' | 'rejected'>('closed')
  const [responding, setResponding]         = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [localDprs, setLocalDprs]           = useState<DprRequest[]>(dprRequests)
  const [localBreaches, _setLocalBreaches]  = useState<DpdpBreach[]>(breaches)

  // New DPR form state
  const [dprForm, setDprForm] = useState({
    principal_name: '', principal_email: '',
    request_type: 'access', description: '',
  })
  // New breach form state
  const [breachForm, setBreachForm] = useState({
    title: '', description: '', breach_type: 'confidentiality',
    severity: 'medium', discovered_at: new Date().toISOString().slice(0, 16),
    affected_principals_estimate: '', data_categories: '',
  })

  const pillarScores = (posture?.pillar_scores as DpdpPillarScores) ?? {}
  const pillars = Object.keys(PILLAR_LABELS)

  const filteredDprs = localDprs.filter((d) =>
    dprTab === 'closed' ? ['closed', 'rejected'].includes(d.status) : d.status === dprTab
  )

  async function handleLogDpr() {
    if (!dprForm.principal_name || !dprForm.principal_email || !dprForm.description) return
    setDprSaving(true)
    try {
      const res = await fetch('/api/compliance/dpr/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dprForm),
      })
      if (res.ok) {
        window.location.reload()
      }
    } finally {
      setDprSaving(false)
      setShowDprModal(false)
    }
  }

  async function handleRespond() {
    if (!selectedDpr || !responseText.trim()) return
    setResponding(true)
    try {
      const res = await fetch('/api/compliance/dpr/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dpr_id: selectedDpr.id,
          response_text: responseText,
          new_status: responseStatus,
        }),
      })
      if (res.ok) {
        setLocalDprs((prev) => prev.map((d) =>
          d.id === selectedDpr.id
            ? { ...d, status: responseStatus, response_text: responseText, responded_at: new Date().toISOString() }
            : d
        ))
        setSelectedDpr(null)
        setResponseText('')
      }
    } finally {
      setResponding(false)
    }
  }

  async function handleLogBreach() {
    if (!breachForm.title || !breachForm.description || !breachForm.discovered_at) return
    setBreachSaving(true)
    try {
      const res = await fetch('/api/compliance/breach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...breachForm,
          affected_principals_estimate: breachForm.affected_principals_estimate
            ? parseInt(breachForm.affected_principals_estimate) : null,
          data_categories: breachForm.data_categories
            ? breachForm.data_categories.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          discovered_at: new Date(breachForm.discovered_at).toISOString(),
        }),
      })
      if (res.ok) {
        window.location.reload()
      }
    } finally {
      setBreachSaving(false)
      setShowBreachModal(false)
    }
  }

  function copyDraft(draft: string) {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/compliance" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-brand-teal" />
            DPDP Act 2023
          </h1>
          <p className="text-sm text-slate-500">Digital Personal Data Protection Act 2023 compliance posture</p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Section 1 — Posture Overview                                       */}
      {/* ================================================================= */}
      <section id="posture">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-brand-teal" />
            Posture Overview
          </h2>
          <Link
            href="/compliance/dpdp/assess"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm rounded-lg hover:bg-brand-teal-dark transition"
          >
            <ClipboardList className="h-4 w-4" />
            Run Posture Assessment
          </Link>
        </div>

        {posture ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="text-center">
                <p className={`text-6xl font-bold ${
                  posture.score >= 80 ? 'text-green-600' :
                  posture.score >= 60 ? 'text-amber-500' : 'text-red-500'
                }`}>{posture.score}</p>
                <p className="text-xs text-slate-500 mt-1">Overall / 100</p>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {pillars.map((p) => {
                    const s = pillarScores[p as keyof DpdpPillarScores] ?? 0
                    return (
                      <div key={p} className="text-center">
                        <div className={`text-lg font-bold ${
                          s >= 8 ? 'text-green-600' : s >= 6 ? 'text-amber-500' : 'text-red-500'
                        }`}>{s}<span className="text-xs text-slate-400">/10</span></div>
                        <p className="text-xs text-slate-500 leading-tight">{PILLAR_LABELS[p]}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            {posture.last_assessed_at && (
              <p className="text-xs text-slate-400">
                Last assessed: {new Date(posture.last_assessed_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No assessment completed yet</p>
            <p className="text-sm text-slate-400 mt-1">Run the 60-question posture assessment to get your DPDP compliance score.</p>
          </div>
        )}

        {/* Open items for this regime */}
        {items.filter((i) => i.status !== 'done' && i.status !== 'waived').length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">
              {items.filter((i) => i.status !== 'done' && i.status !== 'waived').length} action{' '}
              item{items.filter((i) => i.status !== 'done' && i.status !== 'waived').length !== 1 ? 's' : ''} open
            </p>
            {items.filter((i) => i.status !== 'done' && i.status !== 'waived').slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
                <span className={severityBadge(item.priority)}>{item.priority}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium truncate">{item.title}</p>
                  {item.due_date && (
                    <p className={`text-xs mt-0.5 ${daysUntilDeadline(item.due_date).cls}`}>
                      {daysUntilDeadline(item.due_date).label}
                    </p>
                  )}
                </div>
                <span className={statusBadge(item.status)}>{STATUS_LABELS[item.status]}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* Section 2 — Contract Exposure                                      */}
      {/* ================================================================= */}
      <section id="contracts">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-brand-teal" />
          Contract Exposure
          <span className="ml-auto text-xs font-normal text-slate-400">
            {contractFlags.length} DPDP flag{contractFlags.length !== 1 ? 's' : ''} across contracts
          </span>
        </h2>

        {contractFlags.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 text-sm">
            No unresolved DPDP flags found. Upload and analyse contracts to populate this section.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Contract</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Flag</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractFlags.map((flag) => {
                  const contract = Array.isArray(flag.contracts) ? flag.contracts[0] : flag.contracts
                  return (
                    <tr key={flag.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {contract ? (
                          <Link
                            href={`/contracts/${flag.contract_id}`}
                            className="text-brand-teal hover:underline flex items-center gap-1"
                          >
                            {contract.title}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{flag.title}</td>
                      <td className="px-4 py-3">
                        <span className={severityBadge(flag.severity)}>{flag.severity}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* Section 3 — DPR Inbox                                             */}
      {/* ================================================================= */}
      <section id="dpr">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-brand-teal" />
            Data Principal Requests
          </h2>
          <button
            onClick={() => setShowDprModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
          >
            <Plus className="h-4 w-4" />
            Log DPR
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-4">
          {(['open', 'in_progress', 'closed'] as const).map((tab) => {
            const count = localDprs.filter((d) =>
              tab === 'closed' ? ['closed', 'rejected'].includes(d.status) : d.status === tab
            ).length
            return (
              <button
                key={tab}
                onClick={() => setDprTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  dprTab === tab
                    ? 'border-brand-teal text-brand-teal'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {STATUS_LABELS[tab]}
                {count > 0 && (
                  <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {filteredDprs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 text-sm">
            No {STATUS_LABELS[dprTab].toLowerCase()} requests.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDprs.map((dpr) => {
              const sla = daysUntilDeadline(dpr.sla_deadline)
              return (
                <div
                  key={dpr.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:shadow-sm transition"
                  onClick={() => { setSelectedDpr(dpr); setResponseText(dpr.response_text ?? '') }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{dpr.ticket_number}</span>
                        <span className={severityBadge('medium')}>
                          {REQUEST_TYPE_LABELS[dpr.request_type]}
                        </span>
                        <span className={statusBadge(dpr.status)}>{STATUS_LABELS[dpr.status]}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mt-1">{maskName(dpr.principal_name)}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{dpr.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className={`text-xs ${sla.cls}`}>{sla.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(dpr.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* Section 4 — Breach Register                                        */}
      {/* ================================================================= */}
      <section id="breaches">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-brand-teal" />
            Breach Register
          </h2>
          <button
            onClick={() => setShowBreachModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
          >
            <Plus className="h-4 w-4" />
            Log Breach
          </button>
        </div>

        {localBreaches.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 text-sm">
            No breaches recorded. Use this register to document personal data security incidents.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Breach</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Severity</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">72h Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localBreaches.map((breach) => {
                  const discovered = new Date(breach.discovered_at)
                  const deadline72h = new Date(discovered.getTime() + 72 * 3600_000)
                  const deadline72hStatus = daysUntilDeadline(deadline72h.toISOString())
                  const past72h = deadline72h < new Date()

                  return (
                    <tr
                      key={breach.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedBreach(breach)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{breach.title}</p>
                        <p className="text-xs text-slate-400">
                          Discovered {discovered.toLocaleDateString('en-IN')}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {BREACH_TYPE_LABELS[breach.breach_type]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={severityBadge(breach.severity)}>{breach.severity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(breach.status)}>{BREACH_STATUS_LABELS[breach.status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        {past72h ? (
                          <span className="text-xs text-slate-400">Passed</span>
                        ) : (
                          <span className={`text-xs ${deadline72hStatus.cls}`}>{deadline72hStatus.label}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* Section 5 — Documentation                                          */}
      {/* ================================================================= */}
      <section id="docs">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-brand-teal" />
          Documentation
        </h2>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 grid grid-cols-3 text-xs font-medium text-slate-600">
            <span>Document</span>
            <span>Status</span>
            <span>Last Updated</span>
          </div>
          {notices.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              No notices yet. Documents created from the assessment or manually added will appear here.
            </div>
          ) : (
            notices.map((notice) => (
              <div key={notice.id} className="grid grid-cols-3 px-4 py-3 border-b border-slate-100 last:border-0 items-center">
                <p className="text-sm font-medium text-slate-800">{notice.title}</p>
                <span className={statusBadge(notice.status)}>{DOC_STATUS_LABELS[notice.status]}</span>
                <p className="text-xs text-slate-400">
                  {new Date(notice.updated_at).toLocaleDateString('en-IN')}
                </p>
              </div>
            ))
          )}
          {/* Static DPIA register placeholder */}
          <div className="grid grid-cols-3 px-4 py-3 border-b border-slate-100 items-center">
            <p className="text-sm font-medium text-slate-800">DPIA Register</p>
            <span className={statusBadge('draft')}>Draft</span>
            <p className="text-xs text-slate-400">—</p>
          </div>
          <div className="grid grid-cols-3 px-4 py-3 border-b border-slate-100 items-center">
            <p className="text-sm font-medium text-slate-800">Data Processor List</p>
            <span className={statusBadge('needs_review')}>Needs Review</span>
            <p className="text-xs text-slate-400">—</p>
          </div>
          <div className="grid grid-cols-3 px-4 py-3 items-center">
            <p className="text-sm font-medium text-slate-800">Consent Records</p>
            <span className={statusBadge('draft')}>Draft</span>
            <p className="text-xs text-slate-400">—</p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Modals & Drawers                                                   */}
      {/* ================================================================= */}

      {/* Log DPR Modal */}
      {showDprModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">Log New DPR</h3>
              <button onClick={() => setShowDprModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Principal Name</label>
                <input
                  value={dprForm.principal_name}
                  onChange={(e) => setDprForm((f) => ({ ...f, principal_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  placeholder="Full name of data principal"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={dprForm.principal_email}
                  onChange={(e) => setDprForm((f) => ({ ...f, principal_email: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  placeholder="principal@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Request Type</label>
                <select
                  value={dprForm.request_type}
                  onChange={(e) => setDprForm((f) => ({ ...f, request_type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                >
                  {Object.entries(REQUEST_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={dprForm.description}
                  onChange={(e) => setDprForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal resize-none"
                  placeholder="Describe the request in detail"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowDprModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >Cancel</button>
              <button
                onClick={handleLogDpr}
                disabled={dprSaving}
                className="px-4 py-2 text-sm bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark disabled:opacity-60 flex items-center gap-2"
              >
                {dprSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Log Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DPR Detail Drawer */}
      {selectedDpr && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white h-full w-full max-w-lg shadow-xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <p className="font-mono text-xs text-slate-500">{selectedDpr.ticket_number}</p>
                <h3 className="text-base font-semibold text-slate-800">{maskName(selectedDpr.principal_name)}</h3>
              </div>
              <button onClick={() => setSelectedDpr(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4 flex-1">
              <div className="flex gap-2 flex-wrap">
                <span className={severityBadge('medium')}>{REQUEST_TYPE_LABELS[selectedDpr.request_type]}</span>
                <span className={statusBadge(selectedDpr.status)}>{STATUS_LABELS[selectedDpr.status]}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Contact</p>
                <p className="text-sm text-slate-700">{selectedDpr.principal_email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Request Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedDpr.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">SLA Deadline</p>
                <p className={`text-sm font-medium ${daysUntilDeadline(selectedDpr.sla_deadline).cls}`}>
                  {new Date(selectedDpr.sla_deadline).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })} — {daysUntilDeadline(selectedDpr.sla_deadline).label}
                </p>
              </div>
              {selectedDpr.response_text && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Previous Response</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                    {selectedDpr.response_text}
                  </p>
                </div>
              )}

              {!['closed', 'rejected'].includes(selectedDpr.status) && (
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <p className="text-xs font-medium text-slate-600">Compose Response</p>
                  <textarea
                    rows={5}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal resize-none"
                    placeholder="Write your response to the data principal..."
                  />
                  <div className="flex items-center gap-3">
                    <select
                      value={responseStatus}
                      onChange={(e) => setResponseStatus(e.target.value as 'in_progress' | 'closed' | 'rejected')}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                    >
                      <option value="in_progress">Mark In Progress</option>
                      <option value="closed">Mark Closed</option>
                      <option value="rejected">Mark Rejected</option>
                    </select>
                    <button
                      onClick={handleRespond}
                      disabled={responding || !responseText.trim()}
                      className="flex-1 px-4 py-2 text-sm bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {responding
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : responseStatus === 'closed'
                          ? <CheckCircle2 className="h-3 w-3" />
                          : responseStatus === 'rejected'
                            ? <XCircle className="h-3 w-3" />
                            : null
                      }
                      Send & Update
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Breach Modal */}
      {showBreachModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">Log New Breach</h3>
              <button onClick={() => setShowBreachModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  value={breachForm.title}
                  onChange={(e) => setBreachForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  placeholder="Brief title for the breach"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={breachForm.description}
                  onChange={(e) => setBreachForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Breach Type</label>
                  <select
                    value={breachForm.breach_type}
                    onChange={(e) => setBreachForm((f) => ({ ...f, breach_type: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  >
                    <option value="confidentiality">Confidentiality</option>
                    <option value="integrity">Integrity</option>
                    <option value="availability">Availability</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
                  <select
                    value={breachForm.severity}
                    onChange={(e) => setBreachForm((f) => ({ ...f, severity: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date/Time Discovered</label>
                <input
                  type="datetime-local"
                  value={breachForm.discovered_at}
                  onChange={(e) => setBreachForm((f) => ({ ...f, discovered_at: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Estimated Affected Principals
                </label>
                <input
                  type="number"
                  value={breachForm.affected_principals_estimate}
                  onChange={(e) => setBreachForm((f) => ({ ...f, affected_principals_estimate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Data Categories (comma-separated)
                </label>
                <input
                  value={breachForm.data_categories}
                  onChange={(e) => setBreachForm((f) => ({ ...f, data_categories: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  placeholder="Name, Email, Financial data"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowBreachModal(false)} className="px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
              <button
                onClick={handleLogBreach}
                disabled={breachSaving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
              >
                {breachSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Log Breach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breach Detail Drawer */}
      {selectedBreach && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white h-full w-full max-w-lg shadow-xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-800">{selectedBreach.title}</h3>
                <p className="text-xs text-slate-500">
                  Discovered {new Date(selectedBreach.discovered_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <button onClick={() => setSelectedBreach(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4 flex-1">
              <div className="flex gap-2 flex-wrap">
                <span className={severityBadge(selectedBreach.severity)}>{selectedBreach.severity}</span>
                <span className={statusBadge(selectedBreach.status)}>
                  {BREACH_STATUS_LABELS[selectedBreach.status]}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                  {BREACH_TYPE_LABELS[selectedBreach.breach_type]}
                </span>
              </div>
              <p className="text-sm text-slate-700">{selectedBreach.description}</p>
              {selectedBreach.affected_principals_estimate !== null && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Affected principals:</span>{' '}
                  ~{selectedBreach.affected_principals_estimate}
                </p>
              )}
              {selectedBreach.data_categories.length > 0 && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Data categories:</span>{' '}
                  {selectedBreach.data_categories.join(', ')}
                </p>
              )}
              {selectedBreach.notification_draft && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      DPB Notification Draft
                    </p>
                    <button
                      onClick={() => copyDraft(selectedBreach.notification_draft!)}
                      className="inline-flex items-center gap-1 text-xs text-brand-teal hover:text-brand-teal-dark"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed border border-slate-200 max-h-64 overflow-y-auto">
                    {selectedBreach.notification_draft}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
