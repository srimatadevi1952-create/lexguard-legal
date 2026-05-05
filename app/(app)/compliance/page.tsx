import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ShieldAlert, Receipt, Building2, TrendingUp, Users, Globe,
  TrendingDown, Minus, ChevronRight, AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { ComplianceRegime, CompliancePosture, ComplianceItem } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Compliance — LexGuard Legal' }

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldAlert, Receipt, Building2, TrendingUp, Users, Globe,
}

const REGIME_HREF: Record<string, string> = {
  dpdp:          '/compliance/dpdp',
  gst:           '/compliance/gst',
  companies_act: '/compliance/companies-act',
  sebi_lodr:     '/compliance/sebi',
  labour:        '/compliance/labour',
  fema:          '/compliance/fema',
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200'
  if (score >= 60) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />
  if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-slate-400" />
}

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  return `in ${diff}d`
}

export default async function CompliancePage() {
  const supabase = createClient()

  const [{ data: regimes }, { data: postures }, { data: items }] = await Promise.all([
    supabase.from('compliance_regimes').select('*').order('order_index'),
    supabase.from('compliance_postures').select('*'),
    supabase.from('compliance_items').select('regime_id, status, due_date').in('status', ['open', 'in_progress']),
  ])

  const postureByRegime = Object.fromEntries(
    (postures ?? []).map((p: CompliancePosture) => [p.regime_id, p])
  )

  // Per-regime: open item count + nearest deadline
  const regimeStats: Record<string, { openCount: number; nextDeadline: string | null }> = {}
  for (const item of (items ?? []) as Pick<ComplianceItem, 'regime_id' | 'status' | 'due_date'>[]) {
    if (!regimeStats[item.regime_id]) regimeStats[item.regime_id] = { openCount: 0, nextDeadline: null }
    regimeStats[item.regime_id].openCount++
    if (item.due_date) {
      const cur = regimeStats[item.regime_id].nextDeadline
      if (!cur || item.due_date < cur) regimeStats[item.regime_id].nextDeadline = item.due_date
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Compliance Suite</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track your organisation's regulatory posture across all key Indian compliance regimes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(regimes ?? []).map((regime: ComplianceRegime) => {
          const posture = postureByRegime[regime.id]
          const score = posture?.score ?? null
          const trend = posture?.trend ?? 'stable'
          const stats = regimeStats[regime.id] ?? { openCount: 0, nextDeadline: null }
          const Icon = ICON_MAP[regime.icon_name] ?? ShieldAlert
          const href = REGIME_HREF[regime.code] ?? '/compliance'
          const assessed = posture?.last_assessed_at != null

          return (
            <Link
              key={regime.id}
              href={href}
              className={`group relative block rounded-xl border p-5 transition hover:shadow-md hover:border-brand-teal ${
                assessed ? scoreBg(score ?? 0) : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-teal/10">
                    <Icon className="h-5 w-5 text-brand-teal" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm leading-tight">{regime.name}</p>
                    {posture?.last_assessed_at && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Assessed {new Date(posture.last_assessed_at).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-teal transition mt-0.5" />
              </div>

              <div className="flex items-end justify-between">
                <div>
                  {assessed && score !== null ? (
                    <>
                      <p className={`text-4xl font-bold leading-none ${scoreColor(score)}`}>{score}</p>
                      <p className="text-xs text-slate-500 mt-1">/ 100 score</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-slate-400" />
                      <p className="text-sm text-slate-400">Not assessed</p>
                    </div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1">
                    <TrendIcon trend={trend} />
                    <span className="text-xs text-slate-500 capitalize">{trend}</span>
                  </div>
                  {stats.openCount > 0 && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">{stats.openCount}</span> open issue{stats.openCount !== 1 ? 's' : ''}
                    </p>
                  )}
                  {stats.nextDeadline && (
                    <p className="text-xs text-slate-500">
                      Next: <span className="font-medium">{daysUntil(stats.nextDeadline)}</span>
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
