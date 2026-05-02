import type { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export const metadata: Metadata = { title: 'Contracts' }

export default function ContractsPage() {
  return (
    <ComingSoon
      title="Contract Intelligence"
      description="AI-powered contract review, redlining, clause extraction, and risk scoring — built for Indian law."
      icon={FileText}
      phase="Phase 1"
    />
  )
}
