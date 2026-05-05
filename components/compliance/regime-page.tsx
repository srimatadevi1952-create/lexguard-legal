import Link from 'next/link'
import { ChevronLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { ComplianceItem, CompliancePosture } from '@/lib/supabase/types'

// Minimal flag shape used in regime pages (partial select + joined contract)
export interface SlimFlag {
  id:          string
  contract_id: string
  title:       string
  severity:    string
  contracts?:  { id: string; title: string } | { id: string; title: string }[] | null
}

interface Props {
  regimeCode:   string
  regimeName:   string
  icon:         React.ElementType
  posture:      CompliancePosture | null
  items:        ComplianceItem[]
  contractFlags: SlimFlag[]
}

function priorityBadge(p: string) {
  const c = {
    critical: 'bg-red-100 text-red-700',
    high:     'bg-orange-100 text-orange-700',
    medium:   'bg-amber-100 text-amber-700',
    low:      'bg-sky-100 text-sky-700',
  }[p] ?? 'bg-slate-100 text-slate-600'
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c}`
}

function statusBadge(s: string) {
  const c = {
    open:        'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    done:        'bg-green-100 text-green-700',
    waived:      'bg-slate-100 text-slate-500',
  }[s] ?? 'bg-slate-100 text-slate-600'
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c}`
}

function severityBadge(s: string) {
  const c = {
    critical: 'bg-red-100 text-red-700',
    high:     'bg-orange-100 text-orange-700',
    medium:   'bg-amber-100 text-amber-700',
    low:      'bg-sky-100 text-sky-700',
  }[s] ?? 'bg-slate-100 text-slate-600'
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c}`
}

function daysUntil(dateStr: string): { label: string; cls: string } {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-600' }
  if (diff === 0) return { label: 'Due today', cls: 'text-red-600' }
  if (diff <= 7) return { label: `${diff}d left`, cls: 'text-amber-600' }
  return { label: `${diff}d left`, cls: 'text-slate-500' }
}

export function RegimePage({ regimeCode, regimeName, icon: Icon, posture, items, contractFlags }: Props) {
  const openItems = items.filter((i) => i.status === 'open' || i.status === 'in_progress')
  const doneItems = items.filter((i) => i.status === 'done' || i.status === 'waived')

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/compliance" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Icon className="h-6 w-6 text-brand-teal" />
            {regimeName}
          </h1>
          {posture?.last_assessed_at && (
            <p className="text-sm text-slate-500">
              Score: <span className="font-medium">{posture.score}/100</span> —{' '}
              Last assessed {new Date(posture.last_assessed_at).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>
      </div>

      {/* Score banner */}
      {posture && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${
          posture.score >= 80 ? 'bg-green-50 border-green-200' :
          posture.score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-4xl font-bold ${
            posture.score >= 80 ? 'text-green-600' :
            posture.score >= 60 ? 'text-amber-500' : 'text-red-500'
          }`}>{posture.score}</p>
          <div>
            <p className="text-sm font-medium text-slate-700">Compliance Score</p>
            <p className="text-xs text-slate-500 capitalize">{posture.trend} trend</p>
          </div>
        </div>
      )}

      {/* Open compliance items */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">
            Open Checklist ({openItems.length})
          </h2>
        </div>

        {openItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No open compliance items for {regimeName}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {openItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {item.status === 'in_progress'
                    ? <Clock className="h-4 w-4 text-amber-500" />
                    : <AlertCircle className="h-4 w-4 text-slate-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={priorityBadge(item.priority)}>{item.priority}</span>
                    <span className={statusBadge(item.status)}>
                      {item.status === 'in_progress' ? 'In Progress' : 'Open'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                </div>
                {item.due_date && (
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${daysUntil(item.due_date).cls}`}>
                      {daysUntil(item.due_date).label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(item.due_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contract flags */}
      {contractFlags.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            Contract Flags ({contractFlags.length})
          </h2>
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
                          <Link href={`/contracts/${flag.contract_id}`}
                            className="text-brand-teal hover:underline text-sm">
                            {contract.title}
                          </Link>
                        ) : <span className="text-slate-400">—</span>}
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
        </section>
      )}

      {/* Done items (collapsed) */}
      {doneItems.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-500 mb-2">
            Completed / Waived ({doneItems.length})
          </h2>
          <div className="space-y-1">
            {doneItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <p className="text-sm text-slate-500 line-through">{item.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MVP note */}
      <p className="text-xs text-slate-400 text-center">
        Full {regimeName} checker logic available in v1.1. Items above are manually added or assessment-derived.
      </p>
    </div>
  )
}
