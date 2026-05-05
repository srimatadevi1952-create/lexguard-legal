import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NoticeDetail } from '@/components/regulatory/notice-detail'

export const metadata: Metadata = { title: 'Notice Detail — LexGuard Legal' }

export default async function NoticeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: notice, error } = await supabase
    .from('regulator_notices')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !notice) notFound()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link
        href="/regulatory/notices"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="w-4 h-4" />
        Regulator Notices
      </Link>

      <NoticeDetail notice={notice} />
    </div>
  )
}
