import type { Metadata } from 'next'
import { Briefcase } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export const metadata: Metadata = { title: 'M&A & Regulatory' }

export default function MaRegulatoryPage() {
  return (
    <ComingSoon
      title="M&A & Regulatory"
      description="Due diligence workflow, regulatory approval tracking (CCI/SEBI/RBI), and deal-room management."
      icon={Briefcase}
      phase="Phase 3"
    />
  )
}
