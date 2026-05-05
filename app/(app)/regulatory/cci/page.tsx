'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2, CheckCircle2, AlertTriangle, Info, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// CCI Threshold constants — Competition Act 2002, as amended 2024
// All INR values in Crores. Worldwide values converted at ~₹83.5 = USD 1.
// ---------------------------------------------------------------------------
const T = {
  combinedAssetsIndia:    2500,     // Section 5(a)(i)
  combinedTurnoverIndia:  7500,     // Section 5(a)(ii)
  wwAssetsINR:            10437.5,  // USD 1.25 bn ≈ ₹10,437.5 Cr  [Section 5(b)(i)]
  wwAssetsIndiaMin:       1250,
  wwTurnoverINR:          31312.5,  // USD 3.75 bn ≈ ₹31,312.5 Cr  [Section 5(b)(ii)]
  wwTurnoverIndiaMin:     3750,
  groupAssetsIndia:       10000,    // Section 5(c)(i)
  groupTurnoverIndia:     30000,    // Section 5(c)(ii)
  targetAssetsExempt:     450,      // Schedule I small-target
  targetTurnoverExempt:   1250,
  dvtDealValue:           2000,     // DVT 2024 amendment
  dvtIndiaPct:            10,       // target India turnover > 10% of global
}

interface FormData {
  acquirerName:             string
  acquirerAssetsIndia:      string
  acquirerAssetsWW:         string
  acquirerTurnoverIndia:    string
  acquirerTurnoverWW:       string
  targetName:               string
  targetAssetsIndia:        string
  targetAssetsWW:           string
  targetTurnoverIndia:      string
  targetTurnoverWW:         string
  targetIndiaTurnoverPct:   string
  groupAssetsIndia:         string
  groupAssetsWW:            string
  groupTurnoverIndia:       string
  groupTurnoverWW:          string
  dealValue:                string
  transactionType:          string
}

const EMPTY: FormData = {
  acquirerName: '', acquirerAssetsIndia: '', acquirerAssetsWW: '',
  acquirerTurnoverIndia: '', acquirerTurnoverWW: '',
  targetName: '', targetAssetsIndia: '', targetAssetsWW: '',
  targetTurnoverIndia: '', targetTurnoverWW: '', targetIndiaTurnoverPct: '',
  groupAssetsIndia: '', groupAssetsWW: '', groupTurnoverIndia: '', groupTurnoverWW: '',
  dealValue: '', transactionType: 'acquisition',
}

interface Verdict {
  verdict: 'filing_required' | 'exempt' | 'borderline'
  formType: string | null
  triggeredTests: string[]
  exemptReasons: string[]
  summary: string
}

function n(v: string): number { return parseFloat(v) || 0 }

function computeVerdict(f: FormData): Verdict | null {
  // Need at least names and some financials
  if (!f.acquirerName.trim() || !f.targetName.trim()) return null

  const triggeredTests: string[] = []
  const exemptReasons: string[] = []

  const combinedAssetsIndia   = n(f.acquirerAssetsIndia) + n(f.targetAssetsIndia)
  const combinedTurnoverIndia = n(f.acquirerTurnoverIndia) + n(f.targetTurnoverIndia)
  const combinedAssetsWW      = n(f.acquirerAssetsWW) + n(f.targetAssetsWW)
  const combinedTurnoverWW    = n(f.acquirerTurnoverWW) + n(f.targetTurnoverWW)

  // Small target exemption (Schedule I)
  const isSmallTarget =
    n(f.targetAssetsIndia) > 0 && n(f.targetTurnoverIndia) > 0 &&
    n(f.targetAssetsIndia) <= T.targetAssetsExempt &&
    n(f.targetTurnoverIndia) <= T.targetTurnoverExempt

  if (isSmallTarget) {
    exemptReasons.push(
      `Small target exemption (Schedule I): target assets in India ≤ ₹${T.targetAssetsExempt} Cr ` +
      `AND turnover in India ≤ ₹${T.targetTurnoverExempt} Cr`
    )
  }

  // Combined party test
  if (combinedAssetsIndia >= T.combinedAssetsIndia) {
    triggeredTests.push(`Combined assets in India ≥ ₹${T.combinedAssetsIndia} Cr (₹${combinedAssetsIndia.toFixed(0)} Cr) [Section 5(a)(i)]`)
  }
  if (combinedTurnoverIndia >= T.combinedTurnoverIndia) {
    triggeredTests.push(`Combined turnover in India ≥ ₹${T.combinedTurnoverIndia} Cr (₹${combinedTurnoverIndia.toFixed(0)} Cr) [Section 5(a)(ii)]`)
  }

  // Worldwide tests
  if (combinedAssetsWW >= T.wwAssetsINR && combinedAssetsIndia >= T.wwAssetsIndiaMin) {
    triggeredTests.push(
      `Combined worldwide assets ≥ USD 1.25 Bn (₹${combinedAssetsWW.toFixed(0)} Cr) AND India assets ≥ ₹${T.wwAssetsIndiaMin} Cr [Section 5(b)(i)]`
    )
  }
  if (combinedTurnoverWW >= T.wwTurnoverINR && combinedTurnoverIndia >= T.wwTurnoverIndiaMin) {
    triggeredTests.push(
      `Combined worldwide turnover ≥ USD 3.75 Bn (₹${combinedTurnoverWW.toFixed(0)} Cr) AND India turnover ≥ ₹${T.wwTurnoverIndiaMin} Cr [Section 5(b)(ii)]`
    )
  }

  // Group test
  if (n(f.groupAssetsIndia) >= T.groupAssetsIndia) {
    triggeredTests.push(`Group assets in India ≥ ₹${T.groupAssetsIndia} Cr [Section 5(c)(i)]`)
  }
  if (n(f.groupTurnoverIndia) >= T.groupTurnoverIndia) {
    triggeredTests.push(`Group turnover in India ≥ ₹${T.groupTurnoverIndia} Cr [Section 5(c)(ii)]`)
  }

  // Deal Value Threshold — 2024 amendment (not subject to small-target exemption)
  const dvtTriggered =
    n(f.dealValue) > T.dvtDealValue &&
    n(f.targetIndiaTurnoverPct) > T.dvtIndiaPct
  if (dvtTriggered) {
    triggeredTests.push(
      `Deal value > ₹${T.dvtDealValue} Cr (₹${n(f.dealValue).toFixed(0)} Cr) AND target India turnover > ${T.dvtIndiaPct}% of global ` +
      `[Deal Value Threshold, Competition Amendment Act 2023]`
    )
  }

  if (triggeredTests.length === 0) {
    return {
      verdict: 'exempt',
      formType: null,
      triggeredTests: [],
      exemptReasons: ['No threshold breached under Competition Act 2002.'],
      summary: 'CCI filing is NOT required. No threshold under Section 5 or the Deal Value Threshold is met.',
    }
  }

  // Small target exemption applies (except for DVT)
  const nonDvtTests = triggeredTests.filter((t) => !t.includes('Deal Value Threshold'))
  if (isSmallTarget && nonDvtTests.length === triggeredTests.length) {
    // All triggered tests are non-DVT → exemption applies fully
    return {
      verdict: 'exempt',
      formType: null,
      triggeredTests,
      exemptReasons,
      summary:
        'Financial thresholds are breached, but the small target exemption (Schedule I) applies. ' +
        'CCI filing is NOT required — unless deal value exceeds ₹2,000 Cr with substantial India operations.',
    }
  }

  if (isSmallTarget && dvtTriggered) {
    return {
      verdict: 'borderline',
      formType: 'Form I',
      triggeredTests,
      exemptReasons,
      summary:
        'Small target exemption applies to financial thresholds, but the Deal Value Threshold is triggered. ' +
        'Legal advice required to determine whether DVT filing obligation overrides the exemption.',
    }
  }

  // Full filing required
  // Form II for transactions where: market share of parties > 15% (horizontal) or > 25% (vertical)
  // We cannot determine this without market data — default Form I, note Form II may apply
  return {
    verdict: 'filing_required',
    formType: 'Form I',
    triggeredTests,
    exemptReasons,
    summary:
      `CCI filing IS REQUIRED. ${triggeredTests.length} threshold(s) breached. ` +
      'Default: Form I (Short Form). Form II (Long Form) required if combined market share ' +
      'exceeds 15% (horizontal) or 25% (vertical) in any relevant market.',
  }
}

interface Assessment {
  id: string
  acquirer_name: string
  target_name: string
  deal_value: number | null
  transaction_type: string | null
  verdict: string
  form_type: string | null
  triggered_tests: string[]
  created_at: string
}

function verdictBadge(v: string) {
  if (v === 'filing_required') return 'bg-red-100 text-red-700 border border-red-200'
  if (v === 'exempt') return 'bg-green-100 text-green-700 border border-green-200'
  return 'bg-amber-100 text-amber-700 border border-amber-200'
}

function verdictLabel(v: string) {
  if (v === 'filing_required') return 'Filing Required'
  if (v === 'exempt') return 'Exempt'
  return 'Borderline'
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  )
}

function Field({
  label, name, value, onChange, placeholder, type = 'text',
}: {
  label: string
  name: keyof FormData
  value: string
  onChange: (k: keyof FormData, v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
      />
    </div>
  )
}

export default function CciPage() {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [history, setHistory] = useState<Assessment[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  function set(k: keyof FormData, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  const verdict = useMemo(() => computeVerdict(form), [form])

  // Load history on mount
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('cci_assessments')
      .select('id, acquirer_name, target_name, deal_value, transaction_type, verdict, form_type, triggered_tests, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setHistory((data ?? []) as Assessment[])
        setHistoryLoading(false)
      })
  }, [saved])

  async function handleSave() {
    if (!verdict) return
    setSaving(true)
    setSaveError(null)

    try {
      const res = await fetch('/api/regulatory/cci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acquirer_name:           form.acquirerName,
          acquirer_assets_india:   n(form.acquirerAssetsIndia) || null,
          acquirer_assets_ww:      n(form.acquirerAssetsWW) || null,
          acquirer_turnover_india: n(form.acquirerTurnoverIndia) || null,
          acquirer_turnover_ww:    n(form.acquirerTurnoverWW) || null,
          target_name:             form.targetName,
          target_assets_india:     n(form.targetAssetsIndia) || null,
          target_assets_ww:        n(form.targetAssetsWW) || null,
          target_turnover_india:   n(form.targetTurnoverIndia) || null,
          target_turnover_ww:      n(form.targetTurnoverWW) || null,
          target_india_turnover_pct: n(form.targetIndiaTurnoverPct) || null,
          group_assets_india:      n(form.groupAssetsIndia) || null,
          group_assets_ww:         n(form.groupAssetsWW) || null,
          group_turnover_india:    n(form.groupTurnoverIndia) || null,
          group_turnover_ww:       n(form.groupTurnoverWW) || null,
          deal_value:              n(form.dealValue) || null,
          transaction_type:        form.transactionType || null,
          verdict:                 verdict.verdict,
          form_type:               verdict.formType,
          triggered_tests:         verdict.triggeredTests,
          exempt_reasons:          verdict.exemptReasons,
        }),
      })

      const body = await res.json() as { id?: string; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Failed to save')
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ma-regulatory" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">CCI Threshold Checker</h1>
          <p className="text-sm text-slate-500">
            Competition Commission of India filing requirement under Competition Act 2002 (as amended 2024)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form — left 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Panel 1: Acquirer */}
          <Panel title="Panel 1 — Acquirer">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Acquirer / Buyer Name" name="acquirerName" value={form.acquirerName} onChange={set} placeholder="e.g. Reliance Industries Ltd" />
              </div>
              <Field label="Assets in India (₹ Cr)" name="acquirerAssetsIndia" value={form.acquirerAssetsIndia} onChange={set} type="number" placeholder="0" />
              <Field label="Assets Worldwide (₹ Cr)" name="acquirerAssetsWW" value={form.acquirerAssetsWW} onChange={set} type="number" placeholder="0" />
              <Field label="Turnover in India (₹ Cr)" name="acquirerTurnoverIndia" value={form.acquirerTurnoverIndia} onChange={set} type="number" placeholder="0" />
              <Field label="Turnover Worldwide (₹ Cr)" name="acquirerTurnoverWW" value={form.acquirerTurnoverWW} onChange={set} type="number" placeholder="0" />
            </div>
          </Panel>

          {/* Panel 2: Target */}
          <Panel title="Panel 2 — Target">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Target / Seller Name" name="targetName" value={form.targetName} onChange={set} placeholder="e.g. Zomato Ltd" />
              </div>
              <Field label="Assets in India (₹ Cr)" name="targetAssetsIndia" value={form.targetAssetsIndia} onChange={set} type="number" placeholder="0" />
              <Field label="Assets Worldwide (₹ Cr)" name="targetAssetsWW" value={form.targetAssetsWW} onChange={set} type="number" placeholder="0" />
              <Field label="Turnover in India (₹ Cr)" name="targetTurnoverIndia" value={form.targetTurnoverIndia} onChange={set} type="number" placeholder="0" />
              <Field label="Turnover Worldwide (₹ Cr)" name="targetTurnoverWW" value={form.targetTurnoverWW} onChange={set} type="number" placeholder="0" />
              <div className="sm:col-span-2">
                <Field
                  label="Target India Turnover as % of Global (for Deal Value Threshold)"
                  name="targetIndiaTurnoverPct"
                  value={form.targetIndiaTurnoverPct}
                  onChange={set}
                  type="number"
                  placeholder="e.g. 35"
                />
                <p className="text-xs text-slate-400 mt-1">Required only for DVT check — leave blank if not applicable.</p>
              </div>
            </div>
          </Panel>

          {/* Panel 3: Group */}
          <Panel title="Panel 3 — Combined Group (post-transaction)">
            <p className="text-xs text-slate-400 mb-4">
              Enter the combined group&apos;s consolidated assets and turnover after the proposed transaction.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Group Assets in India (₹ Cr)" name="groupAssetsIndia" value={form.groupAssetsIndia} onChange={set} type="number" placeholder="0" />
              <Field label="Group Assets Worldwide (₹ Cr)" name="groupAssetsWW" value={form.groupAssetsWW} onChange={set} type="number" placeholder="0" />
              <Field label="Group Turnover in India (₹ Cr)" name="groupTurnoverIndia" value={form.groupTurnoverIndia} onChange={set} type="number" placeholder="0" />
              <Field label="Group Turnover Worldwide (₹ Cr)" name="groupTurnoverWW" value={form.groupTurnoverWW} onChange={set} type="number" placeholder="0" />
            </div>
          </Panel>

          {/* Panel 4: Transaction */}
          <Panel title="Panel 4 — Transaction Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Deal Value / Transaction Value (₹ Cr)" name="dealValue" value={form.dealValue} onChange={set} type="number" placeholder="0" />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Transaction Type</label>
                <select
                  value={form.transactionType}
                  onChange={(e) => set('transactionType', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
                >
                  <option value="acquisition">Acquisition of shares / voting rights</option>
                  <option value="control">Acquisition of control</option>
                  <option value="merger">Merger</option>
                  <option value="amalgamation">Amalgamation</option>
                  <option value="demerger">Demerger</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </Panel>

          {/* Save */}
          {verdict && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark disabled:opacity-60 transition"
              >
                {saving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : saved
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <Save className="h-4 w-4" />
                }
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save Assessment'}
              </button>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
          )}
        </div>

        {/* Verdict — right 1/3 */}
        <div className="space-y-4">
          <div className="sticky top-6">
            {!verdict ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <Info className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Enter acquirer and target names to see the verdict.</p>
              </div>
            ) : (
              <div className={`rounded-xl border-2 p-5 space-y-4 ${
                verdict.verdict === 'filing_required' ? 'border-red-300 bg-red-50' :
                verdict.verdict === 'exempt' ? 'border-green-300 bg-green-50' :
                'border-amber-300 bg-amber-50'
              }`}>
                <div className="flex items-center gap-2">
                  {verdict.verdict === 'filing_required'
                    ? <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                    : verdict.verdict === 'exempt'
                      ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      : <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  }
                  <span className={`font-semibold text-base ${
                    verdict.verdict === 'filing_required' ? 'text-red-700' :
                    verdict.verdict === 'exempt' ? 'text-green-700' : 'text-amber-700'
                  }`}>
                    {verdict.verdict === 'filing_required' ? 'CCI Filing Required'
                     : verdict.verdict === 'exempt' ? 'Exempt — No Filing'
                     : 'Borderline — Seek Advice'}
                  </span>
                </div>

                <p className="text-sm text-slate-700">{verdict.summary}</p>

                {verdict.formType && (
                  <div className="rounded-lg bg-white/70 border border-slate-200 px-3 py-2">
                    <p className="text-xs font-medium text-slate-600">Prescribed Form</p>
                    <p className="text-sm font-semibold text-slate-800">{verdict.formType}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {verdict.formType === 'Form I'
                        ? 'Short Form — standard cases without significant overlaps'
                        : 'Long Form — complex cases with horizontal/vertical overlaps'}
                    </p>
                  </div>
                )}

                {verdict.triggeredTests.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Triggered tests:</p>
                    <ul className="space-y-1">
                      {verdict.triggeredTests.map((t, i) => (
                        <li key={i} className="text-xs text-slate-700 flex gap-1.5">
                          <span className="text-red-500 mt-0.5 shrink-0">▲</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {verdict.exemptReasons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Exemptions:</p>
                    <ul className="space-y-1">
                      {verdict.exemptReasons.map((r, i) => (
                        <li key={i} className="text-xs text-slate-700 flex gap-1.5">
                          <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
                  <strong>Statute:</strong> Competition Act 2002, Section 5 (as amended by Competition Amendment Act 2023, w.e.f. 2024).
                  Thresholds: USD 1 ≈ ₹83.5. Consult competition counsel before relying on this assessment.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Past Assessments</h2>
        {historyLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
            No saved assessments yet.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Acquirer</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Target</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Deal (₹ Cr)</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Verdict</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Form</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.acquirer_name}</td>
                    <td className="px-4 py-3 text-slate-700">{a.target_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.deal_value != null ? a.deal_value.toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${verdictBadge(a.verdict)}`}>
                        {verdictLabel(a.verdict)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{a.form_type ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(a.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
