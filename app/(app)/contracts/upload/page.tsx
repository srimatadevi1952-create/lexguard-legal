'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Upload, FileText, X, ChevronDown, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ContractType } from '@/lib/supabase/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  nda: 'Non-Disclosure Agreement (NDA)',
  msa: 'Master Services Agreement (MSA)',
  sla: 'Service Level Agreement (SLA)',
  employment: 'Employment Agreement',
  vendor: 'Vendor Agreement',
  lease: 'Lease Agreement',
  shareholder: "Shareholders' Agreement",
  loan: 'Loan Agreement',
  jv: 'Joint Venture Agreement',
  other: 'Other',
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
]

const ANALYSIS_STEPS = [
  'Uploading document…',
  'Extracting text from PDF…',
  'Identifying clause hierarchy…',
  'Checking Indian Contract Act compliance…',
  'Checking DPDP Act exposure…',
  'Checking GST clauses…',
  'Checking Companies Act obligations…',
  'Generating English summary…',
  'Translating to Hindi…',
  'Computing risk score…',
  'Finalising analysis…',
]

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

// ── Form schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  title:             z.string().min(2, 'Title must be at least 2 characters'),
  counterparty:      z.string().optional(),
  contract_type:     z.enum(['nda','msa','sla','employment','vendor','lease','shareholder','loan','jv','other'] as const),
  governing_law_state: z.string().optional(),
  execution_status:  z.enum(['draft','under_review','executed'] as const),
  effective_date:    z.string().optional(),
  expiry_date:       z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Step = 1 | 2 | 3

// ── Component ─────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [contractId, setContractId] = useState<string | null>(null)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contract_type: 'other', execution_status: 'draft' },
  })

  // ── File selection ──────────────────────────────────────────────────────────

  function handleFileSelect(selected: File) {
    if (!ALLOWED_TYPES.includes(selected.type)) {
      toast.error('Unsupported file type. Please upload PDF, DOCX, JPG or PNG.')
      return
    }
    if (selected.size > 50 * 1024 * 1024) {
      toast.error('File exceeds 50 MB limit.')
      return
    }
    setFile(selected)
    // Pre-fill title from filename
    const name = selected.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    setValue('title', name.charAt(0).toUpperCase() + name.slice(1))
    setStep(2)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  // ── Step 2 submit → upload + analyse ────────────────────────────────────────

  async function onSubmit(data: FormData) {
    if (!file) return
    setStep(3)
    setAnalysisStep(0)
    setAnalysisError(null)

    const supabase = createClient()

    try {
      // Get current user + org
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: orgId } = await supabase.rpc('current_org_id')
      if (!orgId) throw new Error('No active organisation')

      // 1. Create contract record
      const { data: contract, error: contractErr } = await supabase
        .from('contracts')
        .insert({
          org_id: orgId as string,
          title: data.title,
          counterparty: data.counterparty || null,
          contract_type: data.contract_type,
          governing_law_state: data.governing_law_state || null,
          execution_status: data.execution_status,
          effective_date: data.effective_date || null,
          expiry_date: data.expiry_date || null,
          owner_id: user.id,
        })
        .select('id')
        .single()

      if (contractErr || !contract) throw new Error(contractErr?.message ?? 'Failed to create contract')
      setContractId(contract.id)
      setAnalysisStep(1)

      // 2. Upload file to storage
      const ext = file.name.split('.').pop() ?? 'pdf'
      const filePath = `org_${orgId}/contracts/${contract.id}/v1.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('contracts')
        .upload(filePath, file, { contentType: file.type })

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
      setAnalysisStep(2)

      // 3. Create version record
      const { error: versionErr } = await supabase
        .from('contract_versions')
        .insert({
          contract_id: contract.id,
          version_number: 1,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size_bytes: file.size,
          created_by: user.id,
        })

      if (versionErr) throw new Error(`Failed to save version: ${versionErr.message}`)

      // 4. Kick off analysis — server returns 202 immediately and runs in background
      const res = await fetch('/api/contracts/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contract.id }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Analysis failed to start')
      }

      // 5. Animate progress steps while polling the status endpoint every 5s
      const animInterval = setInterval(() => {
        setAnalysisStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 2))
      }, 5000)

      await new Promise<void>((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/contracts/${contract.id}/status`)
            if (!statusRes.ok) return // transient error — keep polling

            const { status, } = await statusRes.json() as {
              status: 'analysing' | 'completed' | 'failed'
            }

            if (status === 'completed') {
              clearInterval(pollInterval)
              clearInterval(animInterval)
              resolve()
            } else if (status === 'failed') {
              clearInterval(pollInterval)
              clearInterval(animInterval)
              reject(new Error('Analysis failed — please try again or open the contract to retry'))
            }
            // status === 'analysing' → keep polling
          } catch {
            // Network error — keep polling silently
          }
        }, 5000)
      })

      // 6. Redirect to contract detail
      setAnalysisStep(ANALYSIS_STEPS.length - 1)
      await new Promise((r) => setTimeout(r, 600))
      router.push(`/contracts/${contract.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      setAnalysisError(msg)
      toast.error(msg)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step > 1 && step < 3 ? setStep((s) => (s - 1) as Step) : router.back()}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Upload Contract</h1>
          <p className="text-xs text-gray-500">
            {step === 1 && 'Select a file to upload'}
            {step === 2 && 'Fill in contract details'}
            {step === 3 && 'Running AI analysis…'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {([1, 2, 3] as Step[]).map((n) => (
            <div
              key={n}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors ${
                n < step ? 'bg-brand-teal text-white'
                : n === step ? 'bg-brand-teal text-white'
                : 'bg-gray-100 text-gray-400'
              }`}
            >
              {n < step ? <CheckCircle className="w-3.5 h-3.5" /> : n}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 1: File drop ────────────────────────────────────────────── */}
      {step === 1 && (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center text-center transition-colors ${
            dragOver
              ? 'border-brand-teal bg-brand-teal-light/40'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.jpg,.jpeg,.png"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <div className="w-14 h-14 rounded-2xl bg-brand-teal-light flex items-center justify-center mb-4">
            <Upload className="w-7 h-7 text-brand-teal" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Drop your contract here
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            PDF, DOCX — up to 50 MB. Image-based PDFs require text-based source.
          </p>
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark transition-colors"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
          >
            Browse files
          </button>
        </div>
      )}

      {/* ── Step 2: Metadata form ────────────────────────────────────────── */}
      {step === 2 && file && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          {/* File badge */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <FileText className="w-5 h-5 text-brand-teal shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={() => { setFile(null); setStep(1) }}
              className="p-1 rounded text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title + Counterparty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Contract title <span className="text-red-500">*</span>
              </label>
              <input
                {...register('title')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Counterparty</label>
              <input
                {...register('counterparty')}
                placeholder="Other party name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Contract type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  {...register('contract_type')}
                  className="w-full appearance-none px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                >
                  {(Object.entries(CONTRACT_TYPE_LABELS) as [ContractType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Execution status</label>
              <div className="relative">
                <select
                  {...register('execution_status')}
                  className="w-full appearance-none px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                >
                  <option value="draft">Draft</option>
                  <option value="under_review">Under Review</option>
                  <option value="executed">Executed</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Governing law */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Governing law state</label>
            <div className="relative">
              <select
                {...register('governing_law_state')}
                className="w-full appearance-none px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal text-gray-600"
              >
                <option value="">Select state / UT</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Effective date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                {...register('effective_date')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expiry date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                {...register('expiry_date')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-brand-teal text-white text-sm font-semibold rounded-lg hover:bg-brand-teal-dark transition-colors"
          >
            Analyse contract →
          </button>
        </form>
      )}

      {/* ── Step 3: Analysis progress ────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center">
          {analysisError ? (
            <>
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <X className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Analysis failed</h3>
              <p className="text-xs text-gray-500 mb-4 max-w-sm">{analysisError}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(2); setAnalysisError(null) }}
                  className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Go back
                </button>
                {contractId && (
                  <button
                    onClick={() => router.push(`/contracts/${contractId}`)}
                    className="px-4 py-2 text-xs font-medium bg-brand-teal text-white rounded-lg hover:bg-brand-teal-dark"
                  >
                    Open contract anyway
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Spinner */}
              <div className="w-16 h-16 rounded-full border-4 border-brand-teal-light border-t-brand-teal animate-spin mb-6" />
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Analysing with Claude AI
              </h3>
              <p className="text-xs text-brand-teal font-medium mb-6 h-5 transition-all">
                {ANALYSIS_STEPS[Math.min(analysisStep, ANALYSIS_STEPS.length - 1)]}
              </p>
              {/* Progress bar */}
              <div className="w-full max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-teal rounded-full transition-all duration-1000"
                  style={{ width: `${Math.round((analysisStep / (ANALYSIS_STEPS.length - 1)) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-3">
                This typically takes 30–90 seconds for a standard Indian-law contract.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
