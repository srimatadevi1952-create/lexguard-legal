import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClauseLibraryClient } from '@/components/library/clause-library-client'
import type { Clause } from '@/components/library/clause-library-client'

export const metadata: Metadata = { title: 'Clause Library — LexGuard Legal' }

export default async function LibraryPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all clauses (RLS returns global + current org's private)
  const { data: clausesRaw } = await supabase
    .from('clauses')
    .select('*')
    .order('category')
    .order('title')

  const clauses = (clausesRaw ?? []) as Clause[]

  // Check if user is admin or senior_lawyer (for add-private-clause button)
  let canAddPrivate = false
  if (user) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    canAddPrivate = membership?.role === 'admin' || membership?.role === 'senior_lawyer'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-brand-teal" />
          Clause Library
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          50 pre-vetted, bilingual clauses across 10 categories. Search, filter, and copy into your drafts.
        </p>
      </div>

      <ClauseLibraryClient
        initialClauses={clauses}
        canAddPrivate={canAddPrivate}
      />
    </div>
  )
}
