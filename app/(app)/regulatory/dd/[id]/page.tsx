import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DDMatterDetail } from '@/components/regulatory/dd-matter-detail'
import type { DDMatter, DDItem } from '@/components/regulatory/dd-matter-detail'

export const metadata: Metadata = { title: 'DD Matter — LexGuard Legal' }

export default async function DDMatterPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [matterRes, itemsRes] = await Promise.all([
    supabase
      .from('dd_matters')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('dd_checklist_items')
      .select('*')
      .eq('matter_id', params.id)
      .order('category')
      .order('sort_order'),
  ])

  if (matterRes.error || !matterRes.data) {
    notFound()
  }

  const matter = matterRes.data as DDMatter
  const items  = (itemsRes.data ?? []) as DDItem[]

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Link
        href="/regulatory/dd"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="w-4 h-4" />
        DD matters
      </Link>

      <DDMatterDetail matter={matter} initialItems={items} />
    </div>
  )
}
