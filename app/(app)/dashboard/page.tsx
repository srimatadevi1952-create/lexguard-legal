import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertCircle, Briefcase, CalendarDays, Sparkles, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard' }

const WIDGETS = [
  {
    title: 'Action Items',
    description: 'Pending tasks and approvals requiring your attention.',
    icon: AlertCircle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    badge: '0 items',
  },
  {
    title: 'Active Matters',
    description: 'Contracts and deals currently in progress.',
    icon: Briefcase,
    iconBg: 'bg-brand-teal-light',
    iconColor: 'text-brand-teal',
    badge: '0 matters',
  },
  {
    title: 'Compliance Calendar',
    description: 'Upcoming regulatory deadlines and filing dates.',
    icon: CalendarDays,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    badge: '0 due soon',
  },
  {
    title: 'AI Insights',
    description: 'Automated analysis and risk flags from LexGuard AI.',
    icon: Sparkles,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
    badge: 'No insights yet',
  },
]

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hasOrg = true
  if (user) {
    const { data } = await supabase
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'invited'])
      .limit(1)
    hasOrg = Array.isArray(data) && data.length > 0
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* No-org banner */}
      {!hasOrg && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            Your account isn&apos;t linked to an organisation yet.
          </p>
          <Link
            href="/onboarding"
            className="text-sm font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
          >
            Set up organisation →
          </Link>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome to LexGuard Legal. Your legal intelligence platform is being set up.
        </p>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {WIDGETS.map(({ title, description, icon: Icon, iconBg, iconColor, badge }) => (
          <div
            key={title}
            className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                {badge}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
            </div>
            <div className="mt-auto pt-3 border-t border-gray-50">
              <span className="text-xs text-brand-teal font-medium">Available in Phase 1 →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Status banner */}
      <div className="rounded-xl border border-brand-teal/20 bg-brand-teal-light p-5 flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg bg-brand-teal flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-teal-dark">
            Platform infrastructure deployed successfully
          </p>
          <p className="text-xs text-brand-teal mt-0.5">
            Phase 0 complete. Module development begins with Contract Intelligence in Phase 1.
          </p>
        </div>
      </div>
    </div>
  )
}
