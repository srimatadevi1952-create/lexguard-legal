'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CalendarEvent {
  id:                string
  title:             string
  description:       string | null
  event_type:        'dpdp' | 'mca' | 'sebi' | 'labour' | 'gst' | 'contracts' | 'custom'
  source_table:      string | null
  source_id:         string | null
  due_date:          string          // ISO date 'YYYY-MM-DD'
  owner_id:          string | null
  status:            'open' | 'completed' | 'snoozed'
  statute_reference: string | null
  notes:             string | null
  linked_contract_id: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TYPE_COLORS: Record<CalendarEvent['event_type'], { dot: string; badge: string; label: string }> = {
  dpdp:      { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',     label: 'DPDP'      },
  mca:       { dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700',   label: 'MCA'       },
  sebi:      { dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700', label: 'SEBI'    },
  labour:    { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700', label: 'Labour'    },
  gst:       { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', label: 'GST'    },
  contracts: { dot: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700',   label: 'Contract'  },
  custom:    { dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600',   label: 'Custom'    },
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = parseDate(iso)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function DaysRemaining({ days }: { days: number }) {
  if (days < 0)  return <span className="text-red-600 font-semibold text-xs">{Math.abs(days)}d overdue</span>
  if (days === 0) return <span className="text-red-600 font-semibold text-xs">Today</span>
  if (days <= 7)  return <span className="text-orange-600 font-semibold text-xs">{days}d</span>
  return <span className="text-slate-500 text-xs">{days}d</span>
}

// ---------------------------------------------------------------------------
// CalendarClient
// ---------------------------------------------------------------------------
export function CalendarClient({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewMode, setViewMode]       = useState<'month' | 'list'>('month')
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [events, setEvents]           = useState<CalendarEvent[]>(initialEvents)
  const [filterType, setFilterType]   = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('open')
  const [markingDone, setMarkingDone] = useState<string | null>(null)

  // Events by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      if (!map[ev.due_date]) map[ev.due_date] = []
      map[ev.due_date].push(ev)
    }
    return map
  }, [events])

  // Calendar grid cells (42 = 6 rows × 7 cols)
  const gridDates = useMemo(() => {
    const year  = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const first = new Date(year, month, 1)
    const startOffset = first.getDay()  // 0=Sun
    const cells: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length < 42) cells.push(null)
    return cells
  }, [currentMonth])

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  // Filtered list for list view
  const listEvents = useMemo(() => {
    return events
      .filter((ev) => filterType === 'all' || ev.event_type === filterType)
      .filter((ev) => filterStatus === 'all' || ev.status === filterStatus)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
  }, [events, filterType, filterStatus])

  const drawerEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  async function markComplete(eventId: string) {
    setMarkingDone(eventId)
    const supabase = createClient()
    const { error } = await supabase
      .from('calendar_events')
      .update({ status: 'completed' })
      .eq('id', eventId)

    if (error) {
      toast.error('Failed to update event')
    } else {
      setEvents((prev) => prev.map((ev) => ev.id === eventId ? { ...ev, status: 'completed' } : ev))
      setSelectedEvent((ev) => ev?.id === eventId ? { ...ev, status: 'completed' } : ev)
      toast.success('Event marked complete')
    }
    setMarkingDone(null)
  }

  return (
    <div className="space-y-4">
      {/* Header / view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Month
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 flex-wrap">
          {Object.entries(TYPE_COLORS).map(([type, { dot, label }]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MONTH VIEW ────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h2 className="text-base font-semibold text-slate-900">
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
              {gridDates.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="h-24 bg-slate-50 border-r border-b border-slate-100" />
                }

                const iso         = isoDate(date)
                const isToday     = iso === isoDate(today)
                const dayEvents   = eventsByDate[iso] ?? []
                const isSelected  = selectedDate === iso
                const isCurrentM  = date.getMonth() === currentMonth.getMonth()

                return (
                  <div
                    key={iso}
                    onClick={() => setSelectedDate(isSelected ? null : iso)}
                    className={`h-24 p-1.5 border-r border-b border-slate-100 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-teal-light'
                        : isToday
                        ? 'bg-amber-50'
                        : 'hover:bg-slate-50'
                    } ${!isCurrentM ? 'opacity-40' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-xs font-medium ${
                          isToday
                            ? 'w-5 h-5 bg-brand-teal text-white rounded-full flex items-center justify-center'
                            : 'text-slate-700'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{dayEvents.length - 2}</span>
                      )}
                    </div>

                    {/* Event dots */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const { dot } = TYPE_COLORS[ev.event_type]
                        return (
                          <div
                            key={ev.id}
                            className="flex items-center gap-1 truncate"
                            title={ev.title}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${ev.status === 'completed' ? 'opacity-40' : ''}`} />
                            <span className={`text-[10px] truncate ${ev.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {ev.title}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day drawer */}
          {selectedDate && (
            <div className="w-80 shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-900">
                  {parseDate(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {drawerEvents.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                  <p className="text-sm text-slate-400">No events on this date</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {drawerEvents.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      onMarkComplete={markComplete}
                      isMarking={markingDone === ev.id}
                      onSelect={() => setSelectedEvent(ev)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
            >
              <option value="all">All types</option>
              {Object.entries(TYPE_COLORS).map(([type, { label }]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="snoozed">Snoozed</option>
            </select>
            <span className="text-xs text-slate-500 ml-auto">{listEvents.length} events</span>
          </div>

          {listEvents.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No events match the current filter</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Date', 'Days', 'Event', 'Type', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listEvents.map((ev) => {
                  const days = daysUntil(ev.due_date)
                  const { badge, label } = TYPE_COLORS[ev.event_type]
                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(ev)}
                    >
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {parseDate(ev.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {ev.status === 'completed'
                          ? <span className="text-xs text-slate-400">Done</span>
                          : <DaysRemaining days={days} />
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className={`font-medium text-slate-800 ${ev.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                          {ev.title}
                        </p>
                        {ev.statute_reference && (
                          <p className="text-xs text-slate-400 mt-0.5">{ev.statute_reference}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusIcon status={ev.status} />
                      </td>
                      <td className="px-4 py-3">
                        {ev.status !== 'completed' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markComplete(ev.id) }}
                            disabled={markingDone === ev.id}
                            className="text-xs text-brand-teal hover:underline disabled:opacity-50"
                          >
                            Done
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── EVENT DETAIL MODAL ─────────────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[selectedEvent.event_type].badge}`}>
                    {TYPE_COLORS[selectedEvent.event_type].label}
                  </span>
                  <StatusIcon status={selectedEvent.status} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-slate-100 rounded shrink-0">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Due date</p>
                  <p className="font-medium text-slate-800">
                    {parseDate(selectedEvent.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Days remaining</p>
                  {selectedEvent.status === 'completed'
                    ? <p className="text-slate-400 text-sm">Completed</p>
                    : <DaysRemaining days={daysUntil(selectedEvent.due_date)} />
                  }
                </div>
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.statute_reference && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Statute reference</p>
                  <p className="text-sm text-slate-700">{selectedEvent.statute_reference}</p>
                </div>
              )}

              {selectedEvent.notes && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedEvent.notes}</p>
                </div>
              )}

              {selectedEvent.source_table && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Source: <span className="capitalize">{selectedEvent.source_table.replace('_', ' ')}</span>
                    {selectedEvent.source_id && (
                      <span className="ml-1 font-mono text-slate-300">{selectedEvent.source_id.slice(0, 8)}</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-5 pb-5">
              {selectedEvent.status !== 'completed' && (
                <button
                  onClick={() => markComplete(selectedEvent.id)}
                  disabled={markingDone === selectedEvent.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-lg hover:bg-brand-teal-dark transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark complete
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function EventCard({
  event,
  onMarkComplete,
  isMarking,
  onSelect,
}: {
  event: CalendarEvent
  onMarkComplete: (id: string) => void
  isMarking: boolean
  onSelect: () => void
}) {
  const { dot, badge, label } = TYPE_COLORS[event.event_type]
  const days = daysUntil(event.due_date)
  return (
    <div className="p-3 hover:bg-slate-50 cursor-pointer" onClick={onSelect}>
      <div className="flex items-start gap-2">
        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot} ${event.status === 'completed' ? 'opacity-40' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${event.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${badge}`}>{label}</span>
            {event.status !== 'completed' && <DaysRemaining days={days} />}
          </div>
        </div>
        {event.status !== 'completed' && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkComplete(event.id) }}
            disabled={isMarking}
            title="Mark complete"
            className="p-1 hover:bg-green-50 rounded text-slate-300 hover:text-green-600 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: CalendarEvent['status'] }) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="w-3.5 h-3.5" /> Done
      </span>
    )
  }
  if (status === 'snoozed') {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600">
        <Clock className="w-3.5 h-3.5" /> Snoozed
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500">
      <AlertCircle className="w-3.5 h-3.5" /> Open
    </span>
  )
}
