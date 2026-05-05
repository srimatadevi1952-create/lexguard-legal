/**
 * POST /api/compliance/breach
 *
 * Authenticated. Creates a dpdp_breaches row and auto-generates a
 * DPB notification draft from a static template.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/supabase/audit'

function buildNotificationDraft(params: {
  orgName: string
  title: string
  description: string
  breachType: string
  affectedEstimate: number | null
  dataCategories: string[]
  discoveredAt: string
}) {
  const date = new Date(params.discoveredAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const categories = params.dataCategories.length > 0
    ? params.dataCategories.join(', ')
    : '[List data categories]'
  const affected = params.affectedEstimate !== null
    ? params.affectedEstimate.toString()
    : '[Estimate]'

  return `To:
Data Protection Board of India
Ministry of Electronics and Information Technology
New Delhi - 110001

NOTICE OF PERSONAL DATA BREACH
Ref: [INSERT ORG REF]

Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

1. IDENTITY OF DATA FIDUCIARY
   Organisation: ${params.orgName}
   Address: [INSERT ADDRESS]
   Grievance Officer: [INSERT NAME & CONTACT]

2. NATURE OF THE BREACH
   Type: ${params.breachType} breach
   Date of Discovery: ${date}
   Description: ${params.description}

3. CATEGORIES AND NUMBER OF AFFECTED DATA PRINCIPALS
   Estimated affected principals: ${affected}
   Data categories involved: ${categories}

4. LIKELY CONSEQUENCES
   [Describe the likely consequences of the personal data breach]

5. MEASURES TAKEN OR PROPOSED TO ADDRESS THE BREACH
   - [Describe immediate containment measures]
   - [Describe remediation steps]
   - [Describe measures to prevent recurrence]

6. CONTACT FOR FURTHER INFORMATION
   [INSERT GRIEVANCE OFFICER NAME]
   [INSERT EMAIL AND PHONE NUMBER]

Authorised Signatory: [NAME AND DESIGNATION]
Date: [INSERT DATE OF SIGNING]

This notice is submitted pursuant to Section 40 of the Digital Personal Data
Protection Act, 2023 within the mandatory 72-hour notification period.`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json() as {
      title?: string
      description?: string
      breach_type?: string
      severity?: string
      discovered_at?: string
      affected_principals_estimate?: number | null
      data_categories?: string[]
    }

    const {
      title, description, breach_type, severity,
      discovered_at, affected_principals_estimate, data_categories,
    } = body

    if (!title || !description || !breach_type || !discovered_at) {
      return NextResponse.json(
        { error: 'title, description, breach_type, and discovered_at are required' },
        { status: 400 },
      )
    }

    const validBreachTypes = ['confidentiality', 'integrity', 'availability']
    if (!validBreachTypes.includes(breach_type)) {
      return NextResponse.json({ error: 'Invalid breach_type' }, { status: 400 })
    }

    const validSeverities = ['low', 'medium', 'high', 'critical']
    const finalSeverity = validSeverities.includes(severity ?? '') ? severity : 'medium'

    // Get org info for notification draft
    const { data: orgIdRow } = await supabase.rpc('current_org_id')
    const orgId = orgIdRow as string | null
    if (!orgId) {
      return NextResponse.json({ error: 'No active organisation' }, { status: 400 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const notificationDraft = buildNotificationDraft({
      orgName:          org?.name ?? '[Organisation Name]',
      title:            title.trim(),
      description:      description.trim(),
      breachType:       breach_type,
      affectedEstimate: affected_principals_estimate ?? null,
      dataCategories:   data_categories ?? [],
      discoveredAt:     discovered_at,
    })

    const { data: breach, error: insertErr } = await supabase
      .from('dpdp_breaches')
      .insert({
        org_id:                       orgId,
        title:                        title.trim(),
        description:                  description.trim(),
        breach_type:                  breach_type as 'confidentiality' | 'integrity' | 'availability',
        severity:                     finalSeverity as 'low' | 'medium' | 'high' | 'critical',
        discovered_at:                discovered_at,
        affected_principals_estimate: affected_principals_estimate ?? null,
        data_categories:              data_categories ?? [],
        status:                       'discovered',
        notification_draft:           notificationDraft,
      })
      .select('id')
      .single()

    if (insertErr || !breach) {
      console.error('[breach/POST] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to create breach record' }, { status: 500 })
    }

    await logAudit(supabase, {
      orgId,
      entityType: 'dpdp_breach',
      entityId:   breach.id,
      action:     'created',
      after:      { title, breach_type, severity: finalSeverity },
    })

    return NextResponse.json({ id: breach.id, notification_draft: notificationDraft })
  } catch (err) {
    console.error('[breach/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
