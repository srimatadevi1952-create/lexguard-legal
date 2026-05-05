import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, Scale, FileSearch, ChevronRight, Building2 } from 'lucide-react'

export const metadata: Metadata = { title: 'M&A & Regulatory — LexGuard Legal' }

const TOOLS = [
  {
    href:        '/regulatory/cci',
    icon:        Scale,
    title:       'CCI Threshold Checker',
    description: 'Determine CCI filing requirement under Competition Act 2002. Checks all Section 5 thresholds and the 2024 Deal Value Threshold in under 90 seconds.',
    badge:       'Live',
    badgeCls:    'bg-green-100 text-green-700',
  },
  {
    href:        '/regulatory/dd',
    icon:        FileSearch,
    title:       'Due Diligence Checklist',
    description: '100-300 item structured DD checklist generated deterministically from transaction type, sector, and deal size. Track progress, add findings, export to CSV.',
    badge:       'Live',
    badgeCls:    'bg-green-100 text-green-700',
  },
  {
    href:        '/regulatory/notices',
    icon:        Building2,
    title:       'Regulator Notice Assistant',
    description: 'Log MCA, SEBI, CCI, IT Dept, GST, RBI, and DPB notices. Auto-generates a template response brief with legal framework, document checklist, and risk flags.',
    badge:       'Live',
    badgeCls:    'bg-green-100 text-green-700',
  },
]

export default function MaRegulatoryPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/10">
          <Briefcase className="h-5 w-5 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">M&amp;A &amp; Regulatory</h1>
          <p className="text-sm text-slate-500">
            Due diligence, regulatory approvals (CCI / SEBI / RBI), and deal-room management.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          const isLive = tool.badge === 'Live'
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group block rounded-xl border p-5 transition ${
                isLive
                  ? 'border-slate-200 bg-white hover:shadow-md hover:border-brand-teal'
                  : 'border-dashed border-slate-200 bg-slate-50 cursor-not-allowed pointer-events-none'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-teal/10">
                  <Icon className="h-5 w-5 text-brand-teal" />
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tool.badgeCls}`}>
                  {tool.badge}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{tool.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{tool.description}</p>
                </div>
                {isLive && (
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-teal transition shrink-0 mt-0.5" />
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
