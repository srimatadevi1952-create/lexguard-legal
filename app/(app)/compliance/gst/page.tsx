import type { Metadata } from 'next'
import Link from 'next/link'
import { Receipt, ChevronLeft, ExternalLink, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { GstFinding } from '@/lib/supabase/types'
import type { SlimFlag } from '@/components/compliance/regime-page'

// GstFinding with joined contract
type GstFindingRow = GstFinding & {
  contracts?: { id: string; title: string } | { id: string; title: string }[] | null
}

export const metadata: Metadata = { title: 'GST Compliance' }

const FINDING_TYPE_LABELS: Record<string, string> = {
  missing_gst_clause:        'Missing GST Clause',
  incorrect_rate:            'Incorrect Rate',
  reverse_charge_missing:    'Reverse Charge Missing',
  place_of_supply_ambiguous: 'Place of Supply Ambiguous',
  other:                     'Other',
}

function severityBadge(s: string) {
  const c = { high: 'bg-orange-100 text-orange-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-sky-100 text-sky-700' }[s]
    ?? 'bg-slate-100 text-slate-600'
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c}`
}

function statusBadge(s: string) {
  return s === 'resolved'
    ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700'
    : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700'
}

export default async function GstPage() {
  const supabase = createClient()

  const [{ data: findingsRaw }, { data: flagsRaw }] = await Promise.all([
    supabase
      .from('gst_findings')
      .select('*, contracts!contract_id(id, title, counterparty)')
      .order('created_at', { ascending: false }),

    supabase
      .from('contract_flags')
      .select('id, contract_id, title, severity, contracts!contract_id(id, title)')
      .eq('category', 'gst')
      .eq('is_resolved', false)
      .limit(30),
  ])

  const findings = (findingsRaw ?? []) as unknown as GstFindingRow[]
  const contractFlags = (flagsRaw ?? []) as unknown as SlimFlag[]

  // Group findings by type for the portfolio summary
  const summaryByType: Record<string, number> = {}
  for (const f of findings) {
    if (f.status === 'open') {
      summaryByType[f.finding_type] = (summaryByType[f.finding_type] ?? 0) + 1
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/compliance" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-teal" />
            GST Compliance
          </h1>
          <p className="text-sm text-slate-500">GST issues detected across your contract portfolio</p>
        </div>
      </div>

      {/* Portfolio Summary */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Portfolio Gap Summary</h2>
        {Object.keys(summaryByType).length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No open GST findings. Add findings manually or they will be populated from contract analysis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(summaryByType).map(([type, count]) => (
              <div key={type} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-sm text-slate-500 mt-1">{FINDING_TYPE_LABELS[type] ?? type}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Per-contract GST findings */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          GST Findings by Contract
          <span className="ml-2 text-xs font-normal text-slate-400">
            ({(findings ?? []).length} total)
          </span>
        </h2>
        {findings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            No findings logged yet.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Contract</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Issue</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Severity</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {findings.map((f) => {
                  const contract = Array.isArray(f.contracts) ? f.contracts[0] : f.contracts
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {contract ? (
                          <Link href={`/contracts/${f.contract_id}`}
                            className="text-brand-teal hover:underline flex items-center gap-1 text-sm">
                            {contract.title}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{FINDING_TYPE_LABELS[f.finding_type]}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{f.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={severityBadge(f.severity)}>{f.severity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(f.status)}>{f.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Contract-derived flags */}
      {contractFlags.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            Unresolved GST Flags from Contract Analysis
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
                            className="text-brand-teal hover:underline flex items-center gap-1">
                            {contract.title}
                            <ExternalLink className="h-3 w-3" />
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
    </div>
  )
}
