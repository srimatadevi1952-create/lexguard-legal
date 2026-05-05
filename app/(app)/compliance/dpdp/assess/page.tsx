'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// 60 questions across 10 DPDP pillars (6 per pillar)
// ---------------------------------------------------------------------------
const PILLARS = [
  {
    id: 'notice', name: 'Notice', actRef: 'Section 5-7',
    description: 'Does your organisation provide adequate notice to data principals?',
    questions: [
      'Do you display a privacy notice before or at the time of collecting personal data?',
      'Is the notice available in at least English and one other Indian language?',
      'Does the notice specify the purpose(s) for which personal data is being processed?',
      "Does the notice identify the Data Fiduciary's name and contact details for grievances?",
      'Is there a mechanism to update notices when processing purposes change materially?',
      'Are copies of all versions of privacy notices maintained for audit purposes?',
    ],
  },
  {
    id: 'consent', name: 'Consent', actRef: 'Section 6',
    description: 'Is consent obtained, recorded, and withdrawable in accordance with the Act?',
    questions: [
      'Is consent obtained from data principals before processing their personal data?',
      'Is consent free, specific, informed, and unambiguous (not bundled with T&Cs)?',
      'Can data principals easily withdraw their consent at any time?',
      'Are records of consent (who, when, for what purpose) maintained?',
      'Is fresh consent obtained if processing purposes change materially?',
      'Is consent of a parent/guardian obtained before processing data of a child under 18?',
    ],
  },
  {
    id: 'rights', name: 'Rights', actRef: 'Section 11-13',
    description: 'Can data principals exercise their rights: access, correction, erasure, nomination?',
    questions: [
      'Is there a process to handle requests for access to personal data within 30 days?',
      'Is there a process to handle requests for correction of inaccurate personal data?',
      'Is there a process to handle requests for erasure of personal data?',
      'Are data principals informed of their right to nominate a person to exercise rights post-mortem?',
      'Are rights requests logged and tracked against SLA deadlines?',
      'Do you have a written Data Principal Rights Policy published on your website?',
    ],
  },
  {
    id: 'security', name: 'Security', actRef: 'Section 8(4)',
    description: 'Have reasonable security safeguards been implemented for personal data?',
    questions: [
      'Have you implemented reasonable security safeguards to protect personal data?',
      'Is personal data encrypted at rest and in transit?',
      'Is access to personal data restricted to authorised personnel on a need-to-know basis?',
      'Are security assessments or audits conducted at least annually?',
      'Is there a documented incident response procedure for data security events?',
      'Are security measures reviewed whenever new processing activities begin?',
    ],
  },
  {
    id: 'accountability', name: 'Accountability', actRef: 'Section 10',
    description: 'Has your organisation established internal accountability for DPDP compliance?',
    questions: [
      'Has a Data Protection Officer or equivalent been designated (where required)?',
      'Is there a documented Data Processing Register listing all processing activities?',
      'Are Data Protection Impact Assessments (DPIAs) conducted for high-risk processing?',
      'Are records of processing activities maintained as required by the Act?',
      'Are staff who handle personal data trained on DPDP obligations at least annually?',
      'Is there a senior management owner accountable for DPDP compliance?',
    ],
  },
  {
    id: 'grievance', name: 'Grievance', actRef: 'Section 13',
    description: 'Is there a functioning grievance redressal mechanism for data principals?',
    questions: [
      'Have you appointed a Grievance Officer with contact details published on your website?',
      'Is there a process to acknowledge grievance complaints within 48 hours?',
      'Are grievances resolved within the timeline specified in the Act (not exceeding 30 days)?',
      'Are grievance records maintained for a minimum of 3 years?',
      'Can grievances be submitted in multiple Indian languages?',
      'Is the Grievance Officer reachable via email and a physical/virtual address?',
    ],
  },
  {
    id: 'breach', name: 'Breach Notification', actRef: 'Section 40',
    description: 'Can your organisation detect, assess, and notify breaches within 72 hours?',
    questions: [
      'Is there a documented procedure to detect and respond to personal data breaches?',
      'Can your organisation notify the Data Protection Board within 72 hours of discovery?',
      'Is there a process to assess whether a breach meets the notification threshold?',
      'Do you maintain a Breach Register recording all incidents (notifiable or not)?',
      'Is there a template for notifying affected data principals of a breach?',
      'Are breach notification obligations included in Data Processor agreements?',
    ],
  },
  {
    id: 'processor', name: 'Data Processors', actRef: 'Section 8(2)',
    description: 'Are Data Processor relationships governed by compliant agreements?',
    questions: [
      'Have you identified all third parties who process personal data on your behalf?',
      'Are written Data Processing Agreements (DPAs) in place with all Data Processors?',
      'Do DPAs require processors to process data only on documented instructions?',
      'Do DPAs require processors to implement adequate security measures?',
      'Do DPAs require processors to assist in responding to data principal rights requests?',
      "Are processors' security and compliance practices reviewed periodically?",
    ],
  },
  {
    id: 'retention', name: 'Retention', actRef: 'Section 8(7)',
    description: 'Is personal data deleted when the purpose of processing is fulfilled?',
    questions: [
      'Is there a documented Data Retention Policy specifying retention periods per data category?',
      'Is personal data deleted or anonymised once the purpose of processing is fulfilled?',
      'Are retention schedules aligned with applicable legal or regulatory requirements?',
      'Is there an automated or manual process to implement data deletion at end of retention?',
      'Are retention periods communicated to data principals in the privacy notice?',
      'Are archived/backup data also subject to retention and deletion controls?',
    ],
  },
  {
    id: 'cross_border', name: 'Cross-Border Transfers', actRef: 'Section 16',
    description: 'Are cross-border personal data transfers controlled and documented?',
    questions: [
      'Have you identified all instances where personal data is transferred outside India?',
      'Are cross-border transfers restricted to countries/territories permitted by the Central Government?',
      'Do contracts with overseas entities include DPDP-compliant data transfer clauses?',
      'Are data principals informed of any cross-border transfers in the privacy notice?',
      'Is there a process to assess adequacy of protection in destination countries?',
      'Are cross-border transfer records maintained for audit purposes?',
    ],
  },
]

type Answer = 'yes' | 'no' | 'partially' | null

function scorePillar(answers: Answer[]): number {
  const filled = answers.filter((a) => a !== null)
  if (filled.length === 0) return 0
  const earned = filled.reduce((s, a) => s + (a === 'yes' ? 2 : a === 'partially' ? 1 : 0), 0)
  return Math.round((earned / (filled.length * 2)) * 10)
}

export default function DpdpAssessPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0-9 = pillars, 10 = review
  const [answers, setAnswers] = useState<Answer[][]>(
    PILLARS.map((p) => p.questions.map(() => null))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPillar = PILLARS[step]
  const currentAnswers = answers[step] ?? []
  const progress = Math.round(((step) / PILLARS.length) * 100)

  const allAnswered = answers[step]?.every((a) => a !== null) ?? false
  const totalAnswered = answers.flat().filter((a) => a !== null).length
  const totalQuestions = PILLARS.reduce((s, p) => s + p.questions.length, 0)

  function setAnswer(qIdx: number, value: Answer) {
    setAnswers((prev) => {
      const next = prev.map((row) => [...row])
      next[step][qIdx] = value
      return next
    })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const payload = PILLARS.map((p, pIdx) => ({
        pillar_id: p.id,
        questions: p.questions,
        answers:   (answers[pIdx] ?? []).map((a) => a ?? 'no'),
      }))

      const res = await fetch('/api/compliance/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pillars: payload }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Failed to save assessment')
      }

      router.push('/compliance/dpdp?assessed=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 10) {
    // Review screen
    const totalScore = Math.round(
      answers.reduce((sum, ans) => sum + scorePillar(ans), 0) / PILLARS.length
    )
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep(9)} className="text-slate-400 hover:text-slate-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold text-slate-800">Assessment Review</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="text-center">
              <p className={`text-5xl font-bold ${
                totalScore >= 80 ? 'text-green-600' :
                totalScore >= 60 ? 'text-amber-500' : 'text-red-500'
              }`}>{totalScore}</p>
              <p className="text-xs text-slate-500 mt-1">Overall / 100</p>
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3">
              {PILLARS.map((p, pIdx) => {
                const s = scorePillar(answers[pIdx] ?? [])
                return (
                  <div key={p.id} className="text-center">
                    <p className={`text-lg font-bold ${
                      s >= 8 ? 'text-green-600' : s >= 6 ? 'text-amber-500' : 'text-red-500'
                    }`}>{s}<span className="text-xs text-slate-400">/10</span></p>
                    <p className="text-xs text-slate-500 leading-tight">{p.name}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {answers.flat().filter((a) => a === 'no').length} No answers and{' '}
            {answers.flat().filter((a) => a === 'partially').length} Partially answers will become
            action items in your compliance checklist.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setStep(9)}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 text-sm bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark disabled:opacity-60 flex items-center gap-2"
          >
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <CheckCircle2 className="h-4 w-4" />
            }
            Complete Assessment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/compliance/dpdp" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">DPDP Posture Assessment</h1>
          <p className="text-xs text-slate-400">{totalAnswered} / {totalQuestions} questions answered</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-teal rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stepper */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {PILLARS.map((p, i) => {
          const done = (answers[i] ?? []).every((a) => a !== null)
          return (
            <button
              key={p.id}
              onClick={() => setStep(i)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                i === step
                  ? 'bg-brand-teal text-white'
                  : done
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {p.name}
            </button>
          )
        })}
      </div>

      {/* Pillar card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <div className="mb-1">
          <span className="text-xs text-slate-400 font-medium">{currentPillar.actRef}</span>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">{currentPillar.name}</h2>
        <p className="text-sm text-slate-500 mb-6">{currentPillar.description}</p>

        <div className="space-y-5">
          {currentPillar.questions.map((q, qIdx) => {
            const ans = currentAnswers[qIdx] ?? null
            return (
              <div key={qIdx}>
                <p className="text-sm text-slate-700 mb-2">
                  <span className="text-xs text-slate-400 mr-2">{qIdx + 1}.</span>
                  {q}
                </p>
                <div className="flex gap-2">
                  {(['yes', 'partially', 'no'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(qIdx, opt)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                        ans === opt
                          ? opt === 'yes'
                            ? 'bg-green-600 border-green-600 text-white'
                            : opt === 'partially'
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-red-500 border-red-500 text-white'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt === 'yes' ? 'Yes' : opt === 'partially' ? 'Partially' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {step < PILLARS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setStep(10)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark"
          >
            Review & Submit
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
