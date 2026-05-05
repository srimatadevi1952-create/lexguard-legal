import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CalendarClient } from '@/components/calendar/calendar-client'
import type { CalendarEvent } from '@/components/calendar/calendar-client'

export const metadata: Metadata = { title: 'Legal Calendar — LexGuard Legal' }

export default async function CalendarPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  console.log('[calendar/page] auth user:', user?.id ?? 'NONE')

  const { data: eventsRaw, error: eventsErr } = await supabase
    .from('calendar_events')
    .select('*')
    .order('due_date')

  console.log('[calendar/page] query result — count:', eventsRaw?.length ?? 0, 'error:', eventsErr ?? null)

  const events = (eventsRaw ?? []) as CalendarEvent[]

  // Stats
  const open      = events.filter((e) => e.status === 'open').length
  const overdue   = events.filter((e) => {
    if (e.status !== 'open') return false
    return new Date(e.due_date) < new Date(new Date().toDateString())
  }).length
  const thisMonth = events.filter((e) => {
    const d = new Date(e.due_date)
    const n = new Date()
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && e.status === 'open'
  }).length

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-brand-teal" />
            Legal Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Unified view of compliance deadlines, contract renewals, DPR SLAs, and regulatory notices.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Open events</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{open}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Due this month</p>
          <p className="text-2xl font-bold text-brand-teal mt-1">{thisMonth}</p>
        </div>
        <div className={`rounded-xl border p-4 ${overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${overdue > 0 ? 'text-red-600' : 'text-slate-900'}`}>{overdue}</p>
        </div>
      </div>

      {/* Main calendar */}
      <CalendarClient initialEvents={events} />
    </div>
  )
}
