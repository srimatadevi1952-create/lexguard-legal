'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, FileSearch, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------
const STEPS = ['Matter info', 'Transaction shape', 'Confirm']

const SECTORS = [
  { value: 'tech',          label: 'Technology / SaaS' },
  { value: 'pharma',        label: 'Pharma / Healthcare' },
  { value: 'real_estate',   label: 'Real Estate / Infra' },
  { value: 'fs',            label: 'Financial Services' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'other',         label: 'Other' },
]

const TRANSACTION_TYPES = [
  { value: 'share',      label: 'Share acquisition' },
  { value: 'asset',      label: 'Asset acquisition' },
  { value: 'merger',     label: 'Merger / Amalgamation' },
  { value: 'slump_sale', label: 'Slump sale' },
]

const SIZE_BRACKETS = [
  { value: 'small', label: 'Small (< ₹100 Cr)', items: '~60 items' },
  { value: 'mid',   label: 'Mid (₹100 Cr – ₹500 Cr)', items: '~80 items' },
  { value: 'large', label: 'Large (> ₹500 Cr)', items: '100+ items' },
]

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function NewDDPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name:             '',
    target_name:      '',
    deal_lead:        '',
    transaction_type: 'share',
    sector:           'tech',
    size_bracket:     'mid',
    target_close_date: '',
  })

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function canProceed(): boolean {
    if (step === 0) return !!form.name.trim() && !!form.target_name.trim() && !!form.deal_lead.trim()
    if (step === 1) return !!form.transaction_type && !!form.sector && !!form.size_bracket
    return true
  }

  async function handleGenerate() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/regulatory/dd', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create DD matter')
        return
      }
      toast.success(`Checklist generated — ${data.items_created} items`)
      router.push(`/regulatory/dd/${data.matter_id}`)
    } catch {
      toast.error('Unexpected error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedSector = SECTORS.find((s) => s.value === form.sector)
  const selectedType   = TRANSACTION_TYPES.find((t) => t.value === form.transaction_type)
  const selectedSize   = SIZE_BRACKETS.find((s) => s.value === form.size_bracket)

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back link */}
      <Link
        href="/regulatory/dd"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        DD matters
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
          <FileSearch className="w-5 h-5 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">New DD matter</h1>
          <p className="text-sm text-slate-500">Generate a structured due diligence checklist</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-2 ${idx <= step ? 'text-brand-teal' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                idx < step
                  ? 'bg-brand-teal border-brand-teal text-white'
                  : idx === step
                  ? 'border-brand-teal text-brand-teal bg-white'
                  : 'border-slate-200 text-slate-400 bg-white'
              }`}>
                {idx < step ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className="text-sm font-medium hidden sm:block">{label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${idx < step ? 'bg-brand-teal' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Matter info */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Matter information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Matter name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Project Falcon — TechCorp Acquisition"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Target company name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.target_name}
              onChange={(e) => update('target_name', e.target.value)}
              placeholder="e.g. TechCorp Pvt. Ltd."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Deal lead <span className="text-red-500">*</span>
            </label>
            <input
              value={form.deal_lead}
              onChange={(e) => update('deal_lead', e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
          </div>
        </div>
      )}

      {/* Step 1 — Transaction shape */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="font-semibold text-slate-900">Transaction shape</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Transaction type</label>
            <div className="grid grid-cols-2 gap-2">
              {TRANSACTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => update('transaction_type', t.value)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium text-left transition-colors ${
                    form.transaction_type === t.value
                      ? 'border-brand-teal bg-brand-teal-light text-brand-teal'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Target sector</label>
            <div className="grid grid-cols-2 gap-2">
              {SECTORS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => update('sector', s.value)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium text-left transition-colors ${
                    form.sector === s.value
                      ? 'border-brand-teal bg-brand-teal-light text-brand-teal'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Deal size bracket</label>
            <div className="grid grid-cols-1 gap-2">
              {SIZE_BRACKETS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => update('size_bracket', s.value)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm text-left transition-colors ${
                    form.size_bracket === s.value
                      ? 'border-brand-teal bg-brand-teal-light text-brand-teal'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-medium">{s.label}</span>
                  <span className={`text-xs ${form.size_bracket === s.value ? 'text-brand-teal/70' : 'text-slate-400'}`}>
                    {s.items}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Target close date (optional)
            </label>
            <input
              type="date"
              value={form.target_close_date}
              onChange={(e) => update('target_close_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <p className="text-xs text-slate-400 mt-1">A calendar event will be created for this date.</p>
          </div>
        </div>
      )}

      {/* Step 2 — Confirm */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Confirm and generate</h2>
          <p className="text-sm text-slate-500">
            Review the details below then click &quot;Generate checklist&quot; to create the matter and all checklist items.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
            <Row label="Matter name"   value={form.name} />
            <Row label="Target"        value={form.target_name} />
            <Row label="Deal lead"     value={form.deal_lead} />
            <Row label="Transaction"   value={selectedType?.label ?? form.transaction_type} />
            <Row label="Sector"        value={selectedSector?.label ?? form.sector} />
            <Row label="Size bracket"  value={selectedSize ? `${selectedSize.label} (${selectedSize.items})` : form.size_bracket} />
            {form.target_close_date && (
              <Row label="Target close" value={new Date(form.target_close_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
            )}
          </div>

          <div className="bg-brand-teal-light rounded-lg p-4 text-sm text-brand-teal">
            <p className="font-medium mb-1">What happens next</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>A DD matter record will be created for {form.target_name}</li>
              <li>A structured checklist ({selectedSize?.items}) will be generated instantly</li>
              {form.target_close_date && <li>A calendar reminder will be set for the close date</li>}
              <li>You can track progress, assign items, and add findings in the matter view</li>
              <li>Export the full checklist to Excel/CSV at any time</li>
            </ul>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-1 px-5 py-2 bg-brand-teal text-white text-sm font-medium rounded-xl hover:bg-brand-teal-dark transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-brand-teal text-white text-sm font-medium rounded-xl hover:bg-brand-teal-dark transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
            {submitting ? 'Generating…' : 'Generate checklist'}
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value}</span>
    </div>
  )
}
