import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export const metadata: Metadata = { title: 'Compliance' }

export default function CompliancePage() {
  return (
    <ComingSoon
      title="Compliance Suite"
      description="Deadline-driven compliance calendar for RoC, GST, FEMA, labour law, and SEBI obligations."
      icon={ShieldCheck}
      phase="Phase 2"
    />
  )
}
