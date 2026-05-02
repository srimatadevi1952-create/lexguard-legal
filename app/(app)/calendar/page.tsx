import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export const metadata: Metadata = { title: 'Calendar' }

export default function CalendarPage() {
  return (
    <ComingSoon
      title="Legal Calendar"
      description="Unified calendar aggregating court dates, regulatory deadlines, contract renewals, and compliance milestones."
      icon={CalendarDays}
      phase="Phase 4"
    />
  )
}
