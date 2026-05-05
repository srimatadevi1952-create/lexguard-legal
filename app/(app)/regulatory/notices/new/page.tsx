'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const ISSUERS = [
  { value: 'mca',     label: 'MCA — Ministry of Corporate Affairs' },
  { value: 'sebi',    label: 'SEBI — Securities and Exchange Board of India' },
  { value: 'cci',     label: 'CCI — Competition Commission of India' },
  { value: 'it_dept', label: 'IT Dept — Income Tax Department' },
  { value: 'gst',     label: 'GST — GST Authority' },
  { value: 'rbi',     label: 'RBI — Reserve Bank of India' },
  { value: 'dpb',     label: 'DPB — Data Protection Board' },
  { value: 'state',   label: 'State Regulatory Authority' },
  { value: 'labour',  label: 'Labour Department / EPFO / ESIC' },
  { value: 'other',   label: 'Other' },
]

export default function NewNoticePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    issuer:           '',
    issuer_office:    '',
    notice_ref:       '',
    notice_type:      '',
    received_date:    '',
    deadline_date:    '',
    specific_demands: '',
    notice_file_url:  '',
  })

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const isValid = !!form.issuer && !!form.notice_type.trim() && !!form.received_date && !!form.deadline_date

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/regulatory/notices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create notice')
        return
      }
      toast.success('Notice logged with response brief generated')
      router.push(`/regulatory/notices/${data.notice_id}`)
    } catch {
      toast.error('Unexpected error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link
        href="/regulatory/notices"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Regulator Notices
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Log a regulator notice</h1>
          <p className="text-sm text-slate-500">A template response brief will be generated automatically</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notice details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Notice details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Issuer <span className="text-red-500">*</span>
            </label>
            <select
              value={form.issuer}
              onChange={(e) => update('issuer', e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal bg-white"
            >
              <option value="">Select issuer…</option>
              {ISSUERS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Issuer office (optional)</label>
            <input
              value={form.issuer_office}
              onChange={(e) => update('issuer_office', e.target.value)}
              placeholder="e.g. MCA RoC Delhi, SEBI Western Regional Office"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notice reference number (optional)</label>
            <input
              value={form.notice_ref}
              onChange={(e) => update('notice_ref', e.target.value)}
              placeholder="e.g. ROC/Delhi/14/2025-26"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Notice type <span className="text-red-500">*</span>
            </label>
            <input
              value={form.notice_type}
              onChange={(e) => update('notice_type', e.target.value)}
              required
              placeholder="e.g. Show Cause Notice under Section 206(4), Companies Act 2013"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Received date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.received_date}
                onChange={(e) => update('received_date', e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Response deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.deadline_date}
                onChange={(e) => update('deadline_date', e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Specific demands / allegations</label>
            <textarea
              value={form.specific_demands}
              onChange={(e) => update('specific_demands', e.target.value)}
              rows={4}
              placeholder="Summarise the key allegations or information requested in the notice…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <p className="text-xs text-slate-400 mt-1">
              The more detail you provide, the more targeted the generated response brief will be.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notice file URL (optional)</label>
            <input
              value={form.notice_file_url}
              onChange={(e) => update('notice_file_url', e.target.value)}
              placeholder="https://…"
              type="url"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <p className="text-xs text-slate-400 mt-1">
              Upload the notice PDF to Supabase Storage or an external URL and paste the link here.
            </p>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-brand-teal-light rounded-xl p-4 text-sm text-brand-teal">
          <p className="font-medium mb-1">What happens on submit</p>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>A template response brief is generated for the selected issuer</li>
            <li>A calendar event is created for the deadline with T-30/15/7/3/1/0 reminders</li>
            <li>You can edit and finalise the response in the notice detail page</li>
            <li>Upload your final response PDF when it is sent</li>
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-teal text-white text-sm font-medium rounded-xl hover:bg-brand-teal-dark transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {submitting ? 'Generating…' : 'Log notice & generate brief'}
          </button>
          <Link
            href="/regulatory/notices"
            className="px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
