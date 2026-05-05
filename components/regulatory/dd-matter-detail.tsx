'use client'

import { useState, useMemo } from 'react'
import { Download, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface DDMatter {
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
}

export interface DDItem {
  id:              string
  matter_id:       string
  category:        string
  item_text:       string
  status:          'pending' | 'in_progress' | 'completed' | 'not_applicable' | 'flagged'
  risk:            'low' | 'medium' | 'high' | 'critical'
  owner_id:        string | null
  finding_summary: string | null
  notes:           string | null
  sort_order:      number
}

// ---------------------------------------------------------------------------
// Styling maps
// ---------------------------------------------------------------------------
const RISK_BADGE: Record<DDItem['risk'], string> = {
  low:      'bg-slate-100 text-slate-500',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}


const STATUS_OPTIONS: { value: DDItem['status']; label: string }[] = [
  { value: 'pending',        label: 'Pending' },
  { value: 'in_progress',    label: 'In progress' },
  { value: 'completed',      label: 'Completed' },
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'flagged',        label: 'Flagged' },
]

// ---------------------------------------------------------------------------
// DDMatterDetail
// ---------------------------------------------------------------------------
export function DDMatterDetail({
  matter,
  initialItems,
}: {
  matter: DDMatter
  initialItems: DDItem[]
}) {
  const [items, setItems]             = useState<DDItem[]>(initialItems)
  const [selectedItem, setSelectedItem] = useState<DDItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [filterRisk, setFilterRisk]         = useState('all')
  const [expandedCats, setExpandedCats]     = useState<Set<string>>(new Set(['Corporate', 'Financial', 'Tax']))
  const [saving, setSaving]           = useState(false)
  const [exporting, setExporting]     = useState(false)

  // Drawer state
  const [drawerStatus,  setDrawerStatus]  = useState<DDItem['status']>('pending')
  const [drawerRisk,    setDrawerRisk]    = useState<DDItem['risk']>('medium')
  const [drawerFinding, setDrawerFinding] = useState('')
  const [drawerNotes,   setDrawerNotes]   = useState('')

  function openItem(item: DDItem) {
    setSelectedItem(item)
    setDrawerStatus(item.status)
    setDrawerRisk(item.risk)
    setDrawerFinding(item.finding_summary ?? '')
    setDrawerNotes(item.notes ?? '')
  }

  async function saveItem() {
    if (!selectedItem) return
    setSaving(true)
    try {
      const res = await fetch(`/api/regulatory/dd/${matter.id}/items`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          item_id:         selectedItem.id,
          status:          drawerStatus,
          risk:            drawerRisk,
          finding_summary: drawerFinding,
          notes:           drawerNotes,
        }),
      })
      if (!res.ok) {
        toast.error('Failed to save item')
        return
      }
      setItems((prev) => prev.map((it) =>
        it.id === selectedItem.id
          ? { ...it, status: drawerStatus, risk: drawerRisk, finding_summary: drawerFinding, notes: drawerNotes }
          : it
      ))
      toast.success('Item updated')
      setSelectedItem(null)
    } finally {
      setSaving(false)
    }
  }

  async function exportCSV() {
    setExporting(true)
    try {
      const res = await fetch(`/api/regulatory/dd/${matter.id}/export`)
      if (!res.ok) { toast.error('Export failed'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `DD_${matter.name.replace(/[^a-z0-9]/gi, '_')}_checklist.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  // Grouping
  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category))
    return Array.from(cats).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    return items
      .filter((i) => filterCategory === 'all' || i.category === filterCategory)
      .filter((i) => filterStatus   === 'all' || i.status   === filterStatus)
      .filter((i) => filterRisk     === 'all' || i.risk     === filterRisk)
  }, [items, filterCategory, filterStatus, filterRisk])

  const groupedItems = useMemo(() => {
    const groups: Record<string, DDItem[]> = {}
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [filteredItems])

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) { next.delete(cat) } else { next.add(cat) }
      return next
    })
  }

  // Stats
  const total      = items.length
  const applicable = items.filter((i) => i.status !== 'not_applicable').length
  const done       = items.filter((i) => i.status === 'completed').length
  const flagged    = items.filter((i) => i.status === 'flagged').length
  const pct        = applicable > 0 ? Math.round((done / applicable) * 100) : 0

  const daysLeft = matter.target_close_date
    ? Math.round((new Date(matter.target_close_date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{matter.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">Target: <span className="font-medium text-slate-700">{matter.target_name}</span></p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span>Deal lead: {matter.deal_lead}</span>
              <span>Type: {matter.transaction_type.replace('_', ' ')}</span>
              <span>Sector: {matter.sector.replace('_', ' ')}</span>
              {daysLeft !== null && (
                <span className={daysLeft < 0 ? 'text-red-600 font-medium' : daysLeft <= 30 ? 'text-orange-600 font-medium' : ''}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d to close`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>{done} of {applicable} items complete</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-teal rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-slate-500">{total} total items</span>
          {flagged > 0 && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertTriangle className="w-3 h-3" />
              {flagged} flagged
            </span>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
        >
          <option value="all">All risk levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filteredItems.length} items</span>
      </div>

      {/* Checklist grouped by category */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No items match the current filter</div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedItems).map(([cat, catItems]) => {
            const expanded = expandedCats.has(cat)
            const catDone  = catItems.filter((i) => i.status === 'completed').length
            const catApplicable = catItems.filter((i) => i.status !== 'not_applicable').length
            const hasFlagged = catItems.some((i) => i.status === 'flagged')

            return (
              <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {hasFlagged && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                    <span className="font-semibold text-slate-800">{cat}</span>
                    <span className="text-xs text-slate-400">{catDone}/{catApplicable} done</span>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openItem(item)}
                        className={`px-5 py-3 cursor-pointer border-l-4 transition-colors hover:bg-slate-50/80 ${
                          item.status === 'completed'      ? 'border-l-green-400'  :
                          item.status === 'flagged'        ? 'border-l-red-400'    :
                          item.status === 'in_progress'    ? 'border-l-blue-400'   :
                          item.status === 'not_applicable' ? 'border-l-slate-200'  :
                          'border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${
                              item.status === 'completed'      ? 'line-through text-slate-400' :
                              item.status === 'not_applicable' ? 'text-slate-400'              :
                              'text-slate-800'
                            }`}>
                              {item.item_text}
                            </p>
                            {item.finding_summary && (
                              <p className="text-xs text-slate-500 mt-1 italic">Finding: {item.finding_summary}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${RISK_BADGE[item.risk]}`}>
                              {item.risk}
                            </span>
                            <span className="text-xs text-slate-400 capitalize">{item.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Item detail drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-400 mb-1">{selectedItem.category}</p>
                <p className="text-sm font-semibold text-slate-900 leading-snug">{selectedItem.item_text}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-slate-100 rounded ml-3 shrink-0">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                  <select
                    value={drawerStatus}
                    onChange={(e) => setDrawerStatus(e.target.value as DDItem['status'])}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Risk level</label>
                  <select
                    value={drawerRisk}
                    onChange={(e) => setDrawerRisk(e.target.value as DDItem['risk'])}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Finding summary</label>
                <textarea
                  value={drawerFinding}
                  onChange={(e) => setDrawerFinding(e.target.value)}
                  rows={3}
                  placeholder="Summarise what was found during review…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
                <textarea
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional notes or actions required…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-teal"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={saveItem}
                disabled={saving}
                className="px-5 py-2 bg-brand-teal text-white text-sm font-medium rounded-xl hover:bg-brand-teal-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
