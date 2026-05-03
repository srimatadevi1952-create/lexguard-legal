'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText, Upload, Plus, Search, ChevronDown, MoreHorizontal,
  Tag, Archive, RefreshCw, Download
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import type { ContractType, ContractExecutionStatus, RiskLevel } from '@/lib/supabase/types'

// ── Labels ────────────────────────────────────────────────────────────────────

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  nda:         'NDA',
  msa:         'MSA',
  sla:         'SLA',
  employment:  'Employment',
  vendor:      'Vendor',
  lease:       'Lease',
  shareholder: 'Shareholder',
  loan:        'Loan',
  jv:          'Joint Venture',
  other:       'Other',
}

export const STATUS_LABELS: Record<ContractExecutionStatus, string> = {
  draft:        'Draft',
  under_review: 'Under Review',
  executed:     'Executed',
  archived:     'Archived',
}

const STATUS_COLORS: Record<ContractExecutionStatus, string> = {
  draft:        'bg-gray-100 text-gray-600',
  under_review: 'bg-blue-50 text-blue-700',
  executed:     'bg-green-50 text-green-700',
  archived:     'bg-gray-100 text-gray-400',
}

const RISK_COLORS: Record<RiskLevel, string> = {
  low:      'bg-green-50 text-green-700',
  medium:   'bg-amber-50 text-amber-700',
  high:     'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type OwnerRow = { full_name: string | null }

type RawContract = {
  id: string
  title: string
  counterparty: string | null
  contract_type: ContractType
  execution_status: ContractExecutionStatus
  risk_score: number | null
  risk_level: RiskLevel | null
  owner_id: string | null
  expiry_date: string | null
  updated_at: string
  // Supabase types nested FK joins as arrays; handle both forms
  owner: OwnerRow | OwnerRow[] | null
  contract_tag_assignments: Array<{
    tag_id: string
    contract_tags: Tag | Tag[] | null
  }>
}

type Tag = { id: string; name: string; color: string }

// ── Component ─────────────────────────────────────────────────────────────────

export function ContractsList({
  initialContracts,
}: {
  initialContracts: RawContract[]
  availableTags?: Tag[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractExecutionStatus | ''>('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return initialContracts.filter((c) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !c.title.toLowerCase().includes(q) &&
          !c.counterparty?.toLowerCase().includes(q)
        )
          return false
      }
      if (statusFilter && c.execution_status !== statusFilter) return false
      if (riskFilter && c.risk_level !== riskFilter) return false
      return true
    })
  }, [initialContracts, search, statusFilter, riskFilter])

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map((c) => c.id)))
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) { next.delete(id) } else { next.add(id) }
    setSelected(next)
  }

  // Empty state
  if (initialContracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)]">
        <div
          className="w-full max-w-xl border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center text-center cursor-pointer hover:border-brand-teal hover:bg-brand-teal-light/30 transition-colors"
          onClick={() => router.push('/contracts/upload')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            router.push('/contracts/upload')
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-teal-light flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-brand-teal" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No contracts yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Drag and drop a PDF or DOCX here, or use one of the options below.
          </p>
          <div className="flex gap-3">
            <Link
              href="/contracts/upload"
              className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-lg hover:bg-brand-teal-dark transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Upload className="w-4 h-4" />
              Upload contract
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); toast.info('Draft from intent coming in Phase 6') }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Draft from intent
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Contracts</h1>
          <p className="text-xs text-gray-500">{initialContracts.length} contract{initialContracts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.info('Draft from intent coming in Phase 6')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Draft from intent
          </button>
          <Link
            href="/contracts/upload"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload contract
          </Link>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search title or counterparty…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContractExecutionStatus | '')}
            className="appearance-none pl-2.5 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
          >
            <option value="">All statuses</option>
            {(Object.entries(STATUS_LABELS) as [ContractExecutionStatus, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskLevel | '')}
            className="appearance-none pl-2.5 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
          >
            <option value="">All risk levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-brand-teal-light rounded-lg">
            <span className="text-xs text-brand-teal font-medium">{selected.size} selected</span>
            <button
              onClick={() => toast.info('Reanalyse queued')}
              className="ml-1 p-1 rounded hover:bg-white/50 transition-colors"
              title="Reanalyse"
            >
              <RefreshCw className="w-3 h-3 text-brand-teal" />
            </button>
            <button
              onClick={() => toast.info('Export coming soon')}
              className="p-1 rounded hover:bg-white/50 transition-colors"
              title="Export"
            >
              <Download className="w-3 h-3 text-brand-teal" />
            </button>
            <button
              onClick={() => toast.info('Tag coming soon')}
              className="p-1 rounded hover:bg-white/50 transition-colors"
              title="Tag"
            >
              <Tag className="w-3 h-3 text-brand-teal" />
            </button>
            <button
              onClick={() => toast.info('Archive coming soon')}
              className="p-1 rounded hover:bg-white/50 transition-colors"
              title="Archive"
            >
              <Archive className="w-3 h-3 text-brand-teal" />
            </button>
          </div>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                />
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Title</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Counterparty</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Type</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Risk</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Status</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Renewal</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide text-[10px]">Activity</th>
              <th className="w-8 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No contracts match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const tags = c.contract_tag_assignments
                  .flatMap((a) => {
                    if (!a.contract_tags) return []
                    return Array.isArray(a.contract_tags) ? a.contract_tags : [a.contract_tags]
                  }) as Tag[]

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.has(c.id) ? 'bg-brand-teal-light/30' : ''}`}
                    onClick={() => router.push(`/contracts/${c.id}`)}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                      />
                    </td>

                    <td className="px-3 py-2 max-w-[220px]">
                      <div className="font-medium text-gray-900 truncate">{c.title}</div>
                      {tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {tags.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: t.color + '22', color: t.color }}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">
                      {c.counterparty ?? <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-3 py-2 text-gray-600">
                      {CONTRACT_TYPE_LABELS[c.contract_type]}
                    </td>

                    <td className="px-3 py-2">
                      {c.risk_level ? (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${RISK_COLORS[c.risk_level]}`}>
                          {c.risk_score !== null && `${c.risk_score} · `}
                          {c.risk_level.charAt(0).toUpperCase() + c.risk_level.slice(1)}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">Pending</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[c.execution_status]}`}>
                        {STATUS_LABELS[c.execution_status]}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-gray-500">
                      {c.expiry_date
                        ? format(new Date(c.expiry_date), 'd MMM yyyy')
                        : <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-3 py-2 text-gray-400">
                      {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                    </td>

                    <td className="px-3 py-2 relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === c.id ? null : c.id)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {dropdownOpen === c.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(null)} />
                          <div className="absolute right-8 top-0 z-20 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-xs">
                            <button
                              onClick={() => { router.push(`/contracts/${c.id}`); setDropdownOpen(null) }}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => { toast.info('Reanalyse queued'); setDropdownOpen(null) }}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                            >
                              Reanalyse
                            </button>
                            <button
                              onClick={() => { toast.info('Export coming soon'); setDropdownOpen(null) }}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => { toast.info('Archive coming soon'); setDropdownOpen(null) }}
                              className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50"
                            >
                              Archive
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 mt-2 text-right">
        Showing {filtered.length} of {initialContracts.length} contracts
      </p>
    </div>
  )
}
