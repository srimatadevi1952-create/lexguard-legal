'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scale, Building2, ChevronDown } from 'lucide-react'
import type { OrgType } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ORG_TYPE_LABELS: Record<OrgType, string> = {
  solo:            'Solo Advocate',
  boutique:        'Boutique Firm (2–20 lawyers)',
  large_firm:      'Large Law Firm (20+ lawyers)',
  corporate_legal: 'Corporate Legal Team',
  other:           'Other',
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const GSTIN_RE  = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const PAN_RE    = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
const PINCODE_RE = /^[0-9]{6}$/

const schema = z.object({
  name:         z.string().min(2, 'Organisation name must be at least 2 characters'),
  legal_name:   z.string().optional(),
  type:         z.enum(['solo', 'boutique', 'large_firm', 'corporate_legal', 'other'] as const),
  gstin:        z.union([
    z.string().regex(GSTIN_RE, 'Invalid GSTIN — expected 15-character format (e.g. 29ABCDE1234F1Z5)'),
    z.literal(''),
  ]).optional(),
  pan:          z.union([
    z.string().regex(PAN_RE, 'Invalid PAN — expected 10-character format (e.g. ABCDE1234F)'),
    z.literal(''),
  ]).optional(),
  address_line1: z.string().optional(),
  city:          z.string().optional(),
  state:         z.string().optional(),
  pincode:       z.union([
    z.string().regex(PINCODE_RE, 'Pincode must be exactly 6 digits'),
    z.literal(''),
  ]).optional(),
})

type OnboardingFormData = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'solo' },
  })

  async function onSubmit(data: OnboardingFormData) {
    setLoading(true)
    const supabase = createClient()

    const address =
      data.address_line1 || data.city || data.state || data.pincode
        ? {
            line1:   data.address_line1 || null,
            city:    data.city          || null,
            state:   data.state         || null,
            pincode: data.pincode       || null,
            country: 'India',
          }
        : null

    const { error } = await supabase.rpc('create_organization', {
      p_name:       data.name,
      p_legal_name: data.legal_name  || null,
      p_type:       data.type,
      p_gstin:      data.gstin       || null,
      p_pan:        data.pan         || null,
      p_address:    address,
    })

    if (error) {
      toast.error(error.message || 'Failed to create organisation. Please try again.')
      setLoading(false)
      return
    }

    toast.success('Organisation created — welcome to LexGuard Legal!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-brand-teal-light flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-teal mb-4 shadow-lg">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-teal">
              Para Systems AI
            </p>
            <h1 className="text-2xl font-bold text-brand-teal-dark">LexGuard Legal</h1>
            <p className="text-sm text-gray-500">Let&apos;s set up your organisation</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-brand-teal-light flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-brand-teal" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Organisation details</h2>
              <p className="text-xs text-gray-500">You can update these later in Settings</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Row 1: name + type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Organisation name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Sharma & Associates"
                  {...register('name')}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Organisation type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    {...register('type')}
                    className="w-full appearance-none px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition bg-white"
                  >
                    {(Object.entries(ORG_TYPE_LABELS) as [OrgType, string][]).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.type && (
                  <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>
                )}
              </div>
            </div>

            {/* Legal name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Legal / registered name
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Sharma & Associates LLP"
                {...register('legal_name')}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition"
              />
            </div>

            {/* GSTIN + PAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  GSTIN
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                  {...register('gstin')}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition"
                />
                {errors.gstin && (
                  <p className="mt-1 text-xs text-red-500">{errors.gstin.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  PAN
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  {...register('pan')}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition"
                />
                {errors.pan && (
                  <p className="mt-1 text-xs text-red-500">{errors.pan.message}</p>
                )}
              </div>
            </div>

            {/* Address section */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Registered address
                <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">(optional)</span>
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Address line 1"
                  {...register('address_line1')}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      {...register('city')}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition"
                    />
                  </div>

                  <div className="relative">
                    <select
                      {...register('state')}
                      className="w-full appearance-none px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition bg-white text-gray-500"
                    >
                      <option value="">State / UT</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Pincode"
                      maxLength={6}
                      {...register('pincode')}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition"
                    />
                    {errors.pincode && (
                      <p className="mt-1 text-xs text-red-500">{errors.pincode.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-teal hover:bg-brand-teal-dark text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Creating organisation…' : 'Create organisation & continue'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Srimatadevi Systems LLP. All rights reserved.
        </p>
      </div>
    </div>
  )
}
