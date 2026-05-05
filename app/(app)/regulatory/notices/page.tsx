import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, Plus, ChevronRight, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Regulator Notices — LexGuard Legal' }

interface RegulatorNotice {
  id:            string
  issuer:        string
  issuer_office: string | null
  notice_ref:    string | null
  notice_type:   string
  received_date: string
  deadline_date: string
  status:        'new' | 'in_progress' | 'responded' | 'closed'
  created_at:    string
}

const STATUS_STYLES: Record<string, string> = {
  new:         'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  responded:   'bg-green-100 text-green-700',
  closed:      'bg-slate-100 text-slate-500',
}

const ISSUER_LABELS: Record<string, string> = {
  mca:     'MCA',
  sebi:    'SEBI',
  cci:     'CCI',
  it_dept: 'IT Dept',
  gst:     'GST',
  rbi:     'RBI',
  dpb:     'DPB',
  state:   'State',
  labour:  'Labour',
  other:   'Other',
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((new Date(iso).getTime() - today.getTime()) / 86400000)
}

function DaysBadge({ days, status }: { days: number; status: string }) {
  if (status === 'responded' || status === 'closed') {
    return <span className="text-xs text-slate-400">Closed</span>
  }
  if (days < 0)  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{Math.abs(days)}d overdue</span>
  if (days === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Today</span>
  if (days <= 7)  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{days}d left</span>
  if (days <= 30) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">{days}d left</span>
  return <span className="px-2 py-0.5 rounded-full text-xs text-slate-500">{days}d left</span>
}

export default async function NoticesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: orgMember } = await admin
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  if (!orgMember) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-slate-500">No organisation found for your account. Please complete onboarding.</p>
      </div>
    )
  }

  const { data: notices } = await admin
    .from('regulator_notices')
    .select('id, issuer, issuer_office, notice_ref, notice_type, received_date, deadline_date, status, created_at')
    .eq('org_id', orgMember.org_id)
    .order('deadline_date', { ascending: true })

  const rows = (notices ?? []) as RegulatorNotice[]
  const open    = rows.filter((n) => n.status === 'new' || n.status === 'in_progress').length
  const urgent  = rows.filter((n) => {
    if (n.status === 'responded' || n.status === 'closed') return false
    return daysUntil(n.deadline_date) <= 7
  }).length

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-brand-teal" />
            Regulator Notices
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log, track, and prepare responses to regulatory notices from MCA, SEBI, CCI, IT Dept, GST, RBI, DPB, and others.
          </p>
        </div>
        <Link
          href="/regulatory/notices/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-xl hover:bg-brand-teal-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log notice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total notices</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{rows.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Open / In progress</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{open}</p>
        </div>
        <div className={`rounded-xl border p-4 ${urgent > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Due in ≤ 7 days</p>
          <p className={`text-2xl font-bold mt-1 ${urgent > 0 ? 'text-red-600' : 'text-slate-900'}`}>{urgent}</p>
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No notices logged yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Log a notice to generate a template response brief</p>
          <Link
            href="/regulatory/notices/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-xl hover:bg-brand-teal-dark"
          >
            <Plus className="w-4 h-4" />
            Log notice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Issuer', 'Type / Ref', 'Received', 'Deadline', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((n) => {
                const days = daysUntil(n.deadline_date)
                const isUrgent = (n.status === 'new' || n.status === 'in_progress') && days <= 7
                return (
                  <tr key={n.id} className={`hover:bg-slate-50 transition-colors ${isUrgent ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isUrgent && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        <div>
                          <p className="font-semibold text-slate-900">{ISSUER_LABELS[n.issuer] ?? n.issuer.toUpperCase()}</p>
                          {n.issuer_office && <p className="text-xs text-slate-400">{n.issuer_office}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{n.notice_type}</p>
                      {n.notice_ref && <p className="text-xs text-slate-400">Ref: {n.notice_ref}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(n.received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <p className="text-slate-700">
                          {new Date(n.deadline_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <DaysBadge days={days} status={n.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[n.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {n.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/regulatory/notices/${n.id}`}
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
