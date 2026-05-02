import type { Metadata } from 'next'
import { Settings } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Firm profile, user management, notification preferences, integrations, and billing."
      icon={Settings}
      phase="Phase 0 (post-launch)"
    />
  )
}
