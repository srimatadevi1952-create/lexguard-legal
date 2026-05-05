/**
 * GET /api/regulatory/dd/[id]/export
 *
 * Generates a CSV export of the DD checklist for the given matter.
 * Using CSV (no additional package dependency) — compatible with Excel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new NextResponse('Unauthorised', { status: 401 })
    }

    // Fetch matter info
    const { data: matter, error: matterErr } = await supabase
      .from('dd_matters')
      .select('name, target_name, deal_lead, transaction_type, sector, size_bracket, target_close_date, completion_pct')
      .eq('id', params.id)
      .single()

    if (matterErr || !matter) {
      return new NextResponse('Matter not found', { status: 404 })
    }

    // Fetch items
    const { data: items, error: itemsErr } = await supabase
      .from('dd_checklist_items')
      .select('category, item_text, status, risk, finding_summary, notes')
      .eq('matter_id', params.id)
      .order('category')
      .order('sort_order')

    if (itemsErr || !items) {
      return new NextResponse('Failed to fetch checklist', { status: 500 })
    }

    // Build CSV
    const escCsv = (v: string | null | undefined): string => {
      if (!v) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const headerLines = [
      `DD Matter: ${matter.name}`,
      `Target: ${matter.target_name}`,
      `Deal Lead: ${matter.deal_lead}`,
      `Transaction: ${matter.transaction_type} | Sector: ${matter.sector} | Size: ${matter.size_bracket}`,
      `Close Date: ${matter.target_close_date ?? 'TBD'} | Completion: ${matter.completion_pct}%`,
      `Exported: ${new Date().toLocaleDateString('en-IN')}`,
      ``,
    ]

    const cols = ['Category', 'Item', 'Status', 'Risk', 'Finding Summary', 'Notes']
    const rows = items.map((item) => [
      item.category,
      item.item_text,
      item.status,
      item.risk,
      item.finding_summary ?? '',
      item.notes ?? '',
    ])

    const csvLines = [
      ...headerLines,
      cols.map(escCsv).join(','),
      ...rows.map((r) => r.map(escCsv).join(',')),
    ]

    const csv = csvLines.join('\r\n')
    const filename = `DD_${matter.name.replace(/[^a-z0-9]/gi, '_')}_checklist.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[dd/export] unexpected error:', err)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
