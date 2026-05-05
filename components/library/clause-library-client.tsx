'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Search, ChevronDown, ChevronUp, Copy, CheckCircle2, Plus, X, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export interface Clause {
  id: string
  org_id: string | null
  title: string
  category: string
  clause_text_en: string
  clause_text_hi: string | null
  use_case: string | null
  risk_notes: string | null
  party_position: 'drafter_favours' | 'counterparty_favours' | 'neutral'
  applicable_acts: string[]
  applicable_contract_types: string[]
  references: string | null
  visibility: 'global' | 'org_private'
}

const CATEGORIES = [
  'All',
  'Confidentiality',
  'IP & Licensing',
  'Termination',
  'Liability & Indemnity',
  'Dispute Resolution',
  'Force Majeure',
  'Data Protection / DPDP',
  'GST & Tax',
  'Employment',
  'Boilerplate / Governing Law',
]

const POSITION_LABELS: Record<string, string> = {
  drafter_favours:       'Drafter Favours',
  counterparty_favours:  'Counterparty Favours',
  neutral:               'Neutral',
}

const POSITION_COLORS: Record<string, string> = {
  drafter_favours:       'bg-blue-100 text-blue-700',
  counterparty_favours:  'bg-purple-100 text-purple-700',
  neutral:               'bg-slate-100 text-slate-600',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Confidentiality':            'bg-cyan-100 text-cyan-700',
  'IP & Licensing':             'bg-violet-100 text-violet-700',
  'Termination':                'bg-red-100 text-red-700',
  'Liability & Indemnity':      'bg-orange-100 text-orange-700',
  'Dispute Resolution':         'bg-teal-100 text-teal-700',
  'Force Majeure':              'bg-sky-100 text-sky-700',
  'Data Protection / DPDP':     'bg-green-100 text-green-700',
  'GST & Tax':                  'bg-yellow-100 text-yellow-700',
  'Employment':                 'bg-pink-100 text-pink-700',
  'Boilerplate / Governing Law':'bg-slate-100 text-slate-600',
}

function categoryBadge(cat: string) {
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-600'}`
}

function positionBadge(pos: string) {
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${POSITION_COLORS[pos] ?? 'bg-slate-100 text-slate-600'}`
}

// -----------------------------------------------------------------------
// Clause Card
// -----------------------------------------------------------------------
function ClauseCard({ clause }: { clause: Clause }) {
  const [expanded, setExpanded] = useState(false)
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [copied, setCopied] = useState(false)

  const text = lang === 'hi' && clause.clause_text_hi ? clause.clause_text_hi : clause.clause_text_en

  async function handleInsert() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Clause copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not access clipboard')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug">{clause.title}</p>
          {clause.use_case && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{clause.use_case}</p>
          )}
        </div>
        {clause.visibility === 'org_private' && (
          <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Private</span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className={categoryBadge(clause.category)}>{clause.category}</span>
        <span className={positionBadge(clause.party_position)}>{POSITION_LABELS[clause.party_position]}</span>
        {clause.clause_text_en && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">EN</span>
        )}
        {clause.clause_text_hi && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-600">हिं</span>
        )}
      </div>

      {/* Expand / collapse clause text */}
      <div>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 text-xs text-brand-teal hover:underline"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide clause text' : 'Show clause text'}
        </button>

        {expanded && (
          <div className="mt-2 space-y-2">
            {/* Language toggle */}
            {clause.clause_text_hi && (
              <div className="flex gap-1">
                {(['en', 'hi'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-0.5 rounded text-xs font-medium transition ${
                      lang === l
                        ? 'bg-brand-teal text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {l === 'en' ? 'EN' : 'हिं'}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
              {text}
            </div>

            {clause.risk_notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <p className="text-xs font-medium text-amber-700 mb-0.5">Risk notes</p>
                <p className="text-xs text-amber-600">{clause.risk_notes}</p>
              </div>
            )}

            {(clause.applicable_acts.length > 0 || clause.applicable_contract_types.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {clause.applicable_acts.map((a) => (
                  <span key={a} className="text-xs px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-100">{a}</span>
                ))}
                {clause.applicable_contract_types.map((t) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{t}</span>
                ))}
              </div>
            )}

            {clause.references && (
              <p className="text-xs text-slate-400">Ref: {clause.references}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={handleInsert}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-brand-teal text-white hover:bg-brand-teal-dark transition"
      >
        {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied!' : 'Insert into draft'}
      </button>
    </div>
  )
}

// -----------------------------------------------------------------------
// Add Private Clause Modal
// -----------------------------------------------------------------------
function AddClauseModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (clause: Clause) => void
}) {
  const [form, setForm] = useState({
    title: '', category: 'Confidentiality', clause_text_en: '', clause_text_hi: '',
    use_case: '', risk_notes: '', party_position: 'neutral',
    applicable_acts: '', applicable_contract_types: '', references: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.title.trim() || !form.clause_text_en.trim()) {
      setError('Title and English clause text are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/library/clauses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:                    form.title.trim(),
          category:                 form.category,
          clause_text_en:           form.clause_text_en.trim(),
          clause_text_hi:           form.clause_text_hi.trim() || null,
          use_case:                 form.use_case.trim() || null,
          risk_notes:               form.risk_notes.trim() || null,
          party_position:           form.party_position,
          applicable_acts:          form.applicable_acts.split(',').map((s) => s.trim()).filter(Boolean),
          applicable_contract_types: form.applicable_contract_types.split(',').map((s) => s.trim()).filter(Boolean),
          references:               form.references.trim() || null,
        }),
      })
      const body = await res.json() as { clause?: Clause; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Failed to save')
      if (body.clause) onSaved(body.clause)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Add Private Clause</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              placeholder="e.g. Mutual NDA — standard" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal">
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Party Position *</label>
              <select value={form.party_position} onChange={(e) => set('party_position', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal">
                <option value="neutral">Neutral</option>
                <option value="drafter_favours">Drafter Favours</option>
                <option value="counterparty_favours">Counterparty Favours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Clause Text (English) *</label>
            <textarea value={form.clause_text_en} onChange={(e) => set('clause_text_en', e.target.value)} rows={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              placeholder="[Clause heading]. The parties agree that…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Clause Text (Hindi — optional)</label>
            <textarea value={form.clause_text_hi} onChange={(e) => set('clause_text_hi', e.target.value)} rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              placeholder="हिंदी अनुवाद (वैकल्पिक)" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Use Case</label>
            <input value={form.use_case} onChange={(e) => set('use_case', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              placeholder="When to use this clause…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Risk Notes</label>
            <input value={form.risk_notes} onChange={(e) => set('risk_notes', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              placeholder="Risks, caveats, when NOT to use…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Applicable Acts (comma-separated)</label>
              <input value={form.applicable_acts} onChange={(e) => set('applicable_acts', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
                placeholder="e.g. Indian Contract Act 1872, DPDP Act 2023" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Applicable Contract Types (comma-separated)</label>
              <input value={form.applicable_contract_types} onChange={(e) => set('applicable_contract_types', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
                placeholder="e.g. NDA, MSA, Employment" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">References / Citations</label>
            <input value={form.references} onChange={(e) => set('references', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              placeholder="e.g. Section 27, Indian Contract Act 1872" />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Clause'}
          </button>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------
export function ClauseLibraryClient({
  initialClauses,
  canAddPrivate,
}: {
  initialClauses: Clause[]
  canAddPrivate: boolean
}) {
  const [clauses, setClauses] = useState<Clause[]>(initialClauses)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [position, setPosition] = useState('All')
  const [language, setLanguage] = useState('All')  // 'All' | 'EN' | 'HI'
  const [showModal, setShowModal] = useState(false)

  // Collect unique acts + contract types for filter options
  const allActs = useMemo(() => {
    const s = new Set<string>()
    clauses.forEach((c) => c.applicable_acts.forEach((a) => s.add(a)))
    return Array.from(s).sort()
  }, [clauses])

  const [selectedActs, setSelectedActs] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const allContractTypes = useMemo(() => {
    const s = new Set<string>()
    clauses.forEach((c) => c.applicable_contract_types.forEach((t) => s.add(t)))
    return Array.from(s).sort()
  }, [clauses])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return clauses.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q) && !c.clause_text_en.toLowerCase().includes(q)) return false
      if (category !== 'All' && c.category !== category) return false
      if (position !== 'All' && c.party_position !== position) return false
      if (language === 'HI' && !c.clause_text_hi) return false
      if (selectedActs.length > 0 && !selectedActs.some((a) => c.applicable_acts.includes(a))) return false
      if (selectedTypes.length > 0 && !selectedTypes.some((t) => c.applicable_contract_types.includes(t))) return false
      return true
    })
  }, [clauses, query, category, position, language, selectedActs, selectedTypes])

  function toggleAct(act: string) {
    setSelectedActs((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    )
  }
  function toggleType(t: string) {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((a) => a !== t) : [...prev, t]
    )
  }

  return (
    <>
      {showModal && (
        <AddClauseModal
          onClose={() => setShowModal(false)}
          onSaved={(c) => setClauses((prev) => [c, ...prev])}
        />
      )}

      <div className="flex gap-6">
        {/* Left filter sidebar */}
        <aside className="w-52 shrink-0 space-y-5">
          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</p>
            <div className="space-y-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition ${
                    category === c
                      ? 'bg-brand-teal text-white font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Party position */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Party Position</p>
            <div className="space-y-1">
              {['All', 'drafter_favours', 'counterparty_favours', 'neutral'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition ${
                    position === p
                      ? 'bg-brand-teal text-white font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p === 'All' ? 'All' : POSITION_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Language</p>
            <div className="space-y-1">
              {[['All', 'All'], ['EN', 'English'], ['HI', 'हिंदी']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setLanguage(val)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition ${
                    language === val
                      ? 'bg-brand-teal text-white font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Applicable acts */}
          {allActs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Applicable Acts</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allActs.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={selectedActs.includes(a)}
                      onChange={() => toggleAct(a)}
                      className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                    />
                    <span className="leading-tight">{a}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Contract types */}
          {allContractTypes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contract Types</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {allContractTypes.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(t)}
                      onChange={() => toggleType(t)}
                      className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                    />
                    <span className="leading-tight">{t}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search + add */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clauses by title or text…"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
              />
            </div>
            {canAddPrivate && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-brand-teal text-white rounded-xl hover:bg-brand-teal-dark transition shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add private clause
              </button>
            )}
          </div>

          {/* Count */}
          <p className="text-xs text-slate-400">
            Showing <strong className="text-slate-600">{filtered.length}</strong> of {clauses.length} clause{clauses.length !== 1 ? 's' : ''}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="text-sm text-slate-400">No clauses match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {filtered.map((c) => (
                <ClauseCard key={c.id} clause={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
