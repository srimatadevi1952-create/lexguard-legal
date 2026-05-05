'use client'

import { useState } from 'react'
import { ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'

const REQUEST_TYPES = [
  { value: 'access',      label: 'Access — Request a copy of my personal data' },
  { value: 'correction',  label: 'Correction — Request correction of inaccurate data' },
  { value: 'erasure',     label: 'Erasure — Request deletion of my personal data' },
  { value: 'portability', label: 'Portability — Request data in machine-readable format' },
  { value: 'nomination',  label: 'Nomination — Nominate a person to exercise my rights' },
  { value: 'grievance',   label: 'Grievance — Lodge a complaint about data handling' },
]

export default function DprIntakePage() {
  const { org_slug } = useParams<{ org_slug: string }>()

  const [form, setForm] = useState({
    principal_name:  '',
    principal_email: '',
    request_type:    'access',
    description:     '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.principal_name || !form.principal_email || !form.description) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/compliance/dpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, org_slug }),
      })
      const data = await res.json() as { ticket_number?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit request. Please try again.')
        return
      }
      setTicketNumber(data.ticket_number ?? 'DPR-SUBMITTED')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (ticketNumber) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Request Submitted</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your data principal rights request has been received and will be processed within 30 days
            as required by the Digital Personal Data Protection Act, 2023.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
            <p className="text-xs text-slate-500 mb-1">Your Ticket Number</p>
            <p className="text-2xl font-bold font-mono text-brand-teal">{ticketNumber}</p>
            <p className="text-xs text-slate-400 mt-1">Please save this for future reference.</p>
          </div>
          <p className="text-xs text-slate-400">
            A confirmation will be sent to your email address. If you have questions, quote your
            ticket number when contacting the organisation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-teal mb-4">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Data Principal Rights Request</h1>
          <p className="text-slate-500 text-sm mt-2">
            Submit your rights request under the Digital Personal Data Protection Act, 2023.
            We will respond within 30 days.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.principal_name}
                onChange={(e) => setForm((f) => ({ ...f, principal_name: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="Your full name as per government ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={form.principal_email}
                onChange={(e) => setForm((f) => ({ ...f, principal_email: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="Your email address for updates"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type of Request <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.request_type}
                onChange={(e) => setForm((f) => ({ ...f, request_type: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
              >
                {REQUEST_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal resize-none"
                placeholder="Please describe your request in detail. Include any account identifiers that may help us locate your data."
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand-teal text-white rounded-xl font-medium text-sm hover:bg-brand-teal-dark disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Request
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          This request is processed under the Digital Personal Data Protection Act, 2023 (India).
          Your personal data will be used solely to process this request.
        </p>
      </div>
    </div>
  )
}
