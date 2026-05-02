import type { Metadata } from 'next'
import { Zap } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export const metadata: Metadata = { title: 'Execution' }

export default function ExecutionPage() {
  return (
    <ComingSoon
      title="Execution"
      description="End-to-end document execution with Leegality eSign integration, multi-party routing, and archival."
      icon={Zap}
      phase="Phase 5"
    />
  )
}
