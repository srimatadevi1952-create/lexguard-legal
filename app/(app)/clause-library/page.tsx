import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export const metadata: Metadata = { title: 'Clause Library' }

export default function ClauseLibraryPage() {
  return (
    <ComingSoon
      title="Clause Library"
      description="Firm-wide repository of pre-approved clauses, standard templates, and AI-extracted clause variants."
      icon={BookOpen}
      phase="Phase 1"
    />
  )
}
