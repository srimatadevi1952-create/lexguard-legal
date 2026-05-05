import type { Metadata } from 'next'
import Link from 'next/link'
import { FileSearch, Plus, ChevronRight, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Due Diligence — LexGuard Legal' }

interface DDMatter {
  id:               string
  name:             string
  target_name:      string
  deal_lead:        string
  transaction_type: string
  sector:           string
  size_bracket:     string
  target_close_date: string | null
  status:           string
  completion_pct:   number
  created_at:       string
}

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-600',
  abandoned: 'bg-red-50 text-red-600',
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(iso)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

export default async function DDPage() {
  const supabase = createClient()

  const { data: matters, error } = await supabase
    .from('dd_matters')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error('[dd/page] query error:', error)

  const rows = (matters ?? []) as DDMatter[]

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-brand-teal" />
            Due Diligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Structured DD checklists for M&amp;A transactions — deterministically generated from transaction type, sector, and deal size.
          </p>
        </div>
        <Link
          href="/regulatory/dd/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-xl hover:bg-brand-teal-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New DD matter
        </Link>
      </div>

      {/* Table / empty state */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No DD matters yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Create your first matter to generate a checklist</p>
          <Link
            href="/regulatory/dd/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-xl hover:bg-brand-teal-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New DD matter
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Matter / Target', 'Type', 'Sector', 'Close date', 'Progress', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => {
                const days = m.target_close_date ? daysUntil(m.target_close_date) : null
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Target: {m.target_name}</p>
                      <p className="text-xs text-slate-400">Lead: {m.deal_lead}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-slate-700">{m.transaction_type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-slate-600">{m.sector.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.target_close_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-slate-700">
                              {new Date(m.target_close_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            {m.status === 'active' && days !== null && (
                              <p className={`text-xs ${days < 0 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-slate-400'}`}>
                                {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-teal rounded-full transition-all"
                            style={{ width: `${m.completion_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{m.completion_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[m.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/regulatory/dd/${m.id}`}
                        className="flex items-center gap-1 text-brand-teal hover:underline text-xs font-medium"
                      >
                        Open <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
