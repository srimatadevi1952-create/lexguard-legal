'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, CheckCircle2, ExternalLink, Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface RegulatorNotice {
  id:                 string
  issuer:             string
  issuer_office:      string | null
  notice_ref:         string | null
  notice_type:        string
  received_date:      string
  deadline_date:      string
  specific_demands:   string | null
  notice_file_url:    string | null
  suggested_response: string | null
  final_response_url: string | null
  status:             string
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

const STATUS_STYLES: Record<string, string> = {
  new:         'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  responded:   'bg-green-100 text-green-700',
  closed:      'bg-slate-100 text-slate-500',
}

function daysUntil(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((new Date(iso).getTime() - today.getTime()) / 86400000)
}

export function NoticeDetail({ notice }: { notice: RegulatorNotice }) {
  const router = useRouter()
  const [copied, setCopied]       = useState(false)
  const [editing, setEditing]     = useState(false)
  const [briefText, setBriefText] = useState(notice.suggested_response ?? '')
  const [saving, setSaving]       = useState(false)
  const [status, setStatus]       = useState(notice.status)

  const days = daysUntil(notice.deadline_date)

  async function copyBrief() {
    await navigator.clipboard.writeText(briefText)
    setCopied(true)
    toast.success('Response brief copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveBrief() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('regulator_notices')
      .update({ suggested_response: briefText })
      .eq('id', notice.id)
    if (error) {
      toast.error('Failed to save brief')
    } else {
      toast.success('Brief saved')
      setEditing(false)
    }
    setSaving(false)
  }

  async function updateStatus(newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('regulator_notices')
      .update({ status: newStatus })
      .eq('id', notice.id)
    if (error) {
      toast.error('Failed to update status')
    } else {
      setStatus(newStatus)
      toast.success('Status updated')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-slate-900">{ISSUER_LABELS[notice.issuer] ?? notice.issuer.toUpperCase()}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
                {status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-slate-700 font-medium">{notice.notice_type}</p>
            {notice.issuer_office && <p className="text-sm text-slate-500">{notice.issuer_office}</p>}
            {notice.notice_ref    && <p className="text-sm text-slate-400 mt-1">Ref: {notice.notice_ref}</p>}
          </div>

          {/* Status control */}
          <select
            value={status}
            onChange={(e) => updateStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
          >
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="responded">Responded</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1">Received</p>
            <p className="font-medium text-slate-700">
              {new Date(notice.received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Response deadline</p>
            <p className="font-medium text-slate-700">
              {new Date(notice.deadline_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Days remaining</p>
            {status === 'responded' || status === 'closed'
              ? <p className="text-slate-400">Closed</p>
              : days < 0
              ? <p className="font-semibold text-red-600">{Math.abs(days)} days overdue</p>
              : days === 0
              ? <p className="font-semibold text-red-600">Due today</p>
              : <p className={`font-semibold ${days <= 7 ? 'text-orange-600' : 'text-slate-700'}`}>{days} days</p>
            }
          </div>
        </div>

        {/* Demands */}
        {notice.specific_demands && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Specific demands / allegations</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{notice.specific_demands}</p>
          </div>
        )}

        {/* Links */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          {notice.notice_file_url && (
            <a
              href={notice.notice_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand-teal hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View notice PDF
            </a>
          )}
          {notice.final_response_url && (
            <a
              href={notice.final_response_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-600 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Final response PDF
            </a>
          )}
        </div>
      </div>

      {/* Response brief */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Template Response Brief</h2>
            <p className="text-xs text-slate-400 mt-0.5">Generated by LexGuard Legal — review and finalise with counsel</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                editing
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {editing ? 'Editing' : 'Edit'}
            </button>
            <button
              onClick={copyBrief}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-teal border border-brand-teal/30 rounded-lg hover:bg-brand-teal-light transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {editing ? (
          <div className="p-5">
            <textarea
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              rows={30}
              className="w-full px-3 py-3 text-sm font-mono border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={saveBrief}
                disabled={saving}
                className="px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-lg hover:bg-brand-teal-dark disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save brief'}
              </button>
              <button
                onClick={() => { setBriefText(notice.suggested_response ?? ''); setEditing(false) }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            {briefText ? (
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono bg-slate-50 rounded-lg p-4 overflow-x-auto">
                {briefText}
              </pre>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No response brief generated</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
