# Code Reference

This file is appended during each build phase. It serves as a living index of key implementations — not documentation, but a precise map for AI-assisted development.

---

## Auth

### Supabase clients
| File | Usage |
|---|---|
| `lib/supabase/client.ts` | Browser (client component) — `createBrowserClient` |
| `lib/supabase/server.ts` | Server component / route handler — `createServerClient` + `cookies()` |
| `lib/supabase/middleware.ts` | Middleware session refresh — returns `{ supabaseResponse, user, supabase }` |

### Auth trigger
`public.handle_new_auth_user()` fires `AFTER INSERT ON auth.users` and inserts
a matching row in `public.users`.  Defined in migration 0002.

### Route protection
- **Middleware** (`middleware.ts`): unauthenticated → `/login`; authenticated on
  `/login` → `/dashboard`; authenticated on gated routes with no org → `/onboarding`.
- **`(app)/layout.tsx`**: defence-in-depth — re-checks org membership and
  redirects to `/onboarding` if none found.
- **`(auth)/onboarding/page.tsx`**: outside the `(app)` group so the org-check
  layout does not apply; middleware still requires authentication.

### Onboarding flow
1. New user signs up → `handle_new_auth_user` trigger populates `public.users`.
2. Middleware or layout detects zero `org_members` rows → redirects to `/onboarding`.
3. User fills form → client calls `supabase.rpc('create_organization', {...})`.
4. `create_organization()` (SECURITY DEFINER) atomically:
   - Inserts `organizations` row (plan_status='trial', trial_ends_at=now()+14d).
   - Inserts `org_members` row (role='admin', status='active').
   - Upserts `user_session_state` with the new `active_org_id`.
5. Client redirects to `/dashboard`.

---

## Database

### Migrations (`supabase/migrations/`)
| File | Contents |
|---|---|
| `20260503000001_organizations.sql` | `organizations` table + enums + `set_updated_at()` trigger fn |
| `20260503000002_users.sql` | `public.users` profile table + `handle_new_auth_user` trigger |
| `20260503000003_org_members.sql` | `org_members` table + SELECT / INSERT / UPDATE RLS |
| `20260503000004_organizations_rls.sql` | Organizations SELECT / UPDATE / INSERT RLS policies |
| `20260503000005_current_org_helper.sql` | `user_session_state` table + `current_org_id()` + `create_organization()` |
| `20260503000006_audit_log.sql` | `audit_log` table + append-only triggers + hash chain + `log_audit_event()` |
| `20260503000007_notifications.sql` | `notifications` table + RLS |

### Key SECURITY DEFINER functions
| Function | Purpose |
|---|---|
| `public.current_org_id()` | Returns caller's active org UUID from `user_session_state` |
| `public.create_organization(...)` | Atomically creates org + first admin member + sets active org |
| `public.log_audit_event(...)` | Appends to append-only `audit_log`; verifies active membership |

### RLS pattern
All RLS policies on multi-org tables reference `auth.uid()` directly or call
`public.current_org_id()` (which itself is SECURITY DEFINER and safe to use in policies).

```sql
-- Typical org-scoped SELECT policy:
CREATE POLICY "table: read as active member" ON public.some_table
  FOR SELECT USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = some_table.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );
```

### Audit logging pattern
Every significant write should call `logAudit()` from `lib/supabase/audit.ts`:

```typescript
import { logAudit } from '@/lib/supabase/audit'

await logAudit(supabase, {
  orgId:      activeOrgId,
  entityType: 'contract',
  entityId:   contractId,
  action:     'created',
  after:      { name: contract.name, status: 'draft' },
})
```

The hash chain ensures tamper-evidence: each row's `row_hash` covers
`id|org_id|user_id|entity_type|entity_id|action|before|after|created_at|prev_hash`
(SHA-256 via pgcrypto).  Any modification to a past row breaks the chain.

### Type generation
```bash
SUPABASE_PROJECT_REF=<ref> npm run types:gen
```
Hand-authored baseline lives in `lib/supabase/types.ts`.  Regenerate from live
schema after each migration batch.

---

## Contract Intelligence (Phase 1)

### Migration
`supabase/migrations/20260503000008_contracts.sql` — 8 tables, 5 enums, storage bucket, RLS.

### Tables
| Table | Purpose |
|---|---|
| `contracts` | One row per contract; holds metadata, risk_score, risk_level |
| `contract_versions` | One row per uploaded file; holds file_path + extracted_text |
| `contract_clauses` | Extracted clause hierarchy with char_start/char_end positions |
| `contract_flags` | Risk flags with severity, category, suggested_fix, flag_references |
| `contract_summaries` | EN + HI short/long summaries + key_terms JSONB |
| `contract_chat_messages` | Per-contract AI chat history |
| `contract_tags` | Org-scoped coloured tags |
| `contract_tag_assignments` | M2M contracts ↔ tags |

### Storage bucket
`contracts` (private, 50 MB max). Path pattern: `org_{org_id}/contracts/{contract_id}/v{n}.{ext}`.
RLS restricts access to matching `user_session_state.active_org_id`.

### Analysis pipeline (`lib/contracts/analysis.ts`)
```typescript
// Orchestrator — call from the API route
await runAnalysisPipeline(contractId)
// Steps: download → extractTextFromBuffer → extractClauses (Prompt A) →
//        analyseRisk (Prompt B) → generateEnglishSummary (Prompt C) →
//        translateToHindi (Prompt D) → persist → update contract
```
Risk score formula: `min(100, critical×20 + high×10 + medium×4 + low×1)`

### Claude wrapper (`lib/claude.ts`)
```typescript
import { callClaude, parseJsonResponse } from '@/lib/claude'
const text = await callClaude({ model: 'claude-opus-4-6', system: '...', prompt: '...' })
const data = parseJsonResponse<MyType>(text)  // handles raw JSON or ```json ... ``` blocks
```

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/contracts/analyse` | POST | Runs full analysis pipeline for a contract_id |
| `/api/contracts/chat` | POST | AI Q&A about a specific contract; persists messages |

Request body for `/analyse`: `{ contract_id: string }`
Request body for `/chat`: `{ contract_id: string, message: string }`

### Three-pane layout (`components/contracts/contract-detail.tsx`)
```tsx
// Server page fetches all data; passes to client component
<ContractDetail contract={...} clauses={...} flags={...} summary={...}
                chatMessages={...} auditLog={...} userId={...} />
// Left pane: clause outline tree with flag severity dots
// Centre pane: full text with inline colour-coded highlights (clause-level)
// Right pane: tabs → Flags | Summary | Chat | History | Compliance
```
- Tab preference persisted to `localStorage[lastTab_{contractId}]`
- Click clause in left pane → scrolls centre pane via `clauseRefs`
- Click highlighted clause in centre → opens flag in right pane
- "Insert fix" → copies to clipboard + marks flag resolved + logs audit event
- Hindi toggle is a button inside the Summary tab (not a separate page)

### Bilingual summary toggle pattern
```tsx
// summaryLang state: 'en' | 'hi'
const text = summaryLang === 'en' ? summary.summary_en_short : summary.summary_hi_short
// One-tap toggle button with EN / हिं labels
```

### Seed data
`supabase/seed_contracts.sql` — 5 demo contracts (MSA, NDA, SaaS, Employment, Lease)
with pre-populated clauses, flags, and summaries for `admin@democorp.com`.
Run after migrations AND after the demo user completes onboarding.

## Compliance Suite (Phase 2)

### Migration
`supabase/migrations/20260505000013_compliance.sql` — 8 tables, 13 enums, `slug` column on organizations.

### Tables
| Table | Purpose |
|---|---|
| `compliance_regimes` | Global reference data — 6 seeded regimes (dpdp, gst, companies_act, sebi_lodr, labour, fema) |
| `compliance_postures` | Per-org per-regime score (0-100) + pillar_scores JSONB + trend; UNIQUE (org_id, regime_id) |
| `compliance_items` | Action checklist items per org per regime; source enum: assessment/manual/contract_flag |
| `dpr_requests` | Data Principal Requests; ticket_number auto-generated by trigger (DPR-YYYY-NNNN) |
| `dpdp_breaches` | Breach register with static DPB notification_draft |
| `dpdp_notices` | Privacy notice documents (draft/published/needs_review/archived) |
| `dpdp_consents` | Consent record log with hashed principal identifiers |
| `gst_findings` | GST-specific issues per contract |

### Seed
`supabase/seed_compliance.sql` — 3 open DPRs, 1 breach, 8 compliance items, postures for all 6 regimes,
3 GST findings, 3 notice drafts, org slug set to 'democorp'.

### Posture Assessment Pattern
```typescript
// 10 pillars × 6 questions = 60 questions
// Score per pillar: earned = Yes×2 + Partially×1; pillar_score = Math.round((earned / (n×2)) × 10)
// Overall: Math.round(average of 10 pillar scores)
// Compliance items created for every No/Partially answer (status='open', source='assessment')
```
Wizard: `app/(app)/compliance/dpdp/assess/page.tsx` — client component, local state, submits to POST /api/compliance/assess.

### DPR Workflow Pattern
```
Public intake:    /dpr-intake/[org_slug] → POST /api/compliance/dpr (no auth, admin client)
Internal logging: DPR Inbox modal → POST /api/compliance/dpr/log (authenticated, RLS)
Responding:       DPR detail drawer → POST /api/compliance/dpr/respond (authenticated)
SLA:              30 days from created_at (DPDP Act, Section 11)
Ticket format:    DPR-YYYY-NNNN (DB trigger: generate_dpr_ticket())
```

### Breach Notification Template Structure
```typescript
// POST /api/compliance/breach → buildNotificationDraft({ orgName, title, description, breachType,
//   affectedEstimate, dataCategories, discoveredAt })
// Returns plain-text DPB notification pre-filled with org name and breach details.
// Saved to dpdp_breaches.notification_draft.
// Statutory basis: Section 40, DPDP Act 2023 (72-hour mandatory notification)
// Copyable from breach detail drawer in DPDP page.
```

### API Routes (Compliance)
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/compliance/dpr` | POST | None | Public DPR intake (org_slug lookup, admin client) |
| `/api/compliance/dpr/log` | POST | Session | Internal DPR logging by lawyers |
| `/api/compliance/dpr/respond` | POST | Session | Save response + update DPR status |
| `/api/compliance/assess` | POST | Session | Save DPDP assessment, compute scores, create items |
| `/api/compliance/breach` | POST | Session | Log breach + generate DPB notification draft |

### Pages
| Path | Type | Purpose |
|---|---|---|
| `app/(app)/compliance/page.tsx` | Server | 6-tile regime grid with live scores |
| `app/(app)/compliance/dpdp/page.tsx` | Server | DPDP flagship: fetches data, renders DpdpClient |
| `components/compliance/dpdp-client.tsx` | Client | 5 sections, DPR tabs, modals, breach drawer |
| `app/(app)/compliance/dpdp/assess/page.tsx` | Client | 60-question posture wizard |
| `app/(app)/compliance/gst/page.tsx` | Server | GST findings + contract flags |
| `app/(app)/compliance/companies-act/page.tsx` | Server | Uses RegimePage component |
| `app/(app)/compliance/sebi/page.tsx` | Server | Uses RegimePage component |
| `app/(app)/compliance/labour/page.tsx` | Server | Uses RegimePage component |
| `app/(app)/compliance/fema/page.tsx` | Server | Uses RegimePage component |
| `components/compliance/regime-page.tsx` | Server | Shared layout for lighter regime pages |
| `app/dpr-intake/[org_slug]/page.tsx` | Client/Public | Public intake form, no auth required |

---

## GST Clause Checker (Phase 2 extension)

### Deterministic checker pattern (`lib/contracts/gst-checker.ts`)
```typescript
import { checkGstClauses } from '@/lib/contracts/gst-checker'
const findings = checkGstClauses(contractText) // returns GstCheckResult[]
```
Eight regex/keyword checks (no AI):
1. GSTIN format (`/\b[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/`)
2. "Place of supply" keyword → `place_of_supply_ambiguous`
3. RCM / reverse charge keyword → `reverse_charge_missing`
4. GST rate (5/12/18/28%) alongside tax type → `incorrect_rate`
5. GST TDS (Section 51) for government contracts → `missing_gst_clause`
6. E-invoice / IRN keyword → `missing_gst_clause`
7. "Time of supply" keyword → `missing_gst_clause`
8. ITC / "input tax credit" keyword → `missing_gst_clause`

### Rescan API
`POST /api/compliance/gst/rescan` — fetches all analysed contracts, runs checker,
deletes existing open findings, inserts new ones. Returns `{ scanned, created }`.

### GST page extension
`components/compliance/gst-rescan-button.tsx` — client button component that calls
rescan API and triggers `router.refresh()` to reload server component data.

---

## CCI Threshold Checker (Phase 3 partial)

### Migration
`supabase/migrations/20260505000014_cci_clauses.sql` — `cci_assessments`, `clauses`,
`clause_insertions` tables + RLS policies.

### Threshold constants (all INR Crores)
| Test | Threshold | Statute |
|---|---|---|
| Combined assets India | ≥ ₹2,500 Cr | Section 5(a)(i) |
| Combined turnover India | ≥ ₹7,500 Cr | Section 5(a)(ii) |
| Worldwide assets | ≥ USD 1.25 Bn (~₹10,437 Cr) + India ≥ ₹1,250 Cr | Section 5(b)(i) |
| Worldwide turnover | ≥ USD 3.75 Bn (~₹31,312 Cr) + India ≥ ₹3,750 Cr | Section 5(b)(ii) |
| Group assets India | ≥ ₹10,000 Cr | Section 5(c)(i) |
| Group turnover India | ≥ ₹30,000 Cr | Section 5(c)(ii) |
| Small target exemption | Assets ≤ ₹450 Cr AND turnover ≤ ₹1,250 Cr | Schedule I |
| DVT (2024 amendment) | Deal value > ₹2,000 Cr + India turnover > 10% of global | Competition Amendment Act 2023 |

### Pages and API
| Path | Type | Purpose |
|---|---|---|
| `app/(app)/regulatory/cci/page.tsx` | Client | Single-page CCI form with live verdict |
| `app/(app)/ma-regulatory/page.tsx` | Server | Landing page with CCI tile (updated from stub) |
| `app/api/regulatory/cci/route.ts` | API | POST: persists CCI assessment to cci_assessments |

Verdict computed client-side with `useMemo` — no API round-trip for calculation.
History loaded via Supabase browser client on mount (`useEffect`).

---

## Clause Library (Phase 1 extension)

### Clause library search pattern
```tsx
// Server page fetches all clauses (RLS returns global + org_private for current org)
const { data: clauses } = await supabase.from('clauses').select('*').order('category').order('title')
// Passed to client component for in-memory filtering
```
Filtering is client-side (no re-fetch on filter change): search matches title + clause_text_en,
sidebar filters by category, party_position, language (HI availability), applicable_acts (checkbox),
applicable_contract_types (checkbox).

### Pages and API
| Path | Type | Purpose |
|---|---|---|
| `app/(app)/library/page.tsx` | Server | Fetches clauses + role check, renders ClauseLibraryClient |
| `components/library/clause-library-client.tsx` | Client | Search, filter, clause cards with EN/हिं toggle |
| `app/api/library/clauses/route.ts` | API | POST: create org_private clause (admin/senior_lawyer only) |

### Nav update
`components/layout/app-shell.tsx` — Clause Library nav item href changed from
`/clause-library` to `/library`.

### Seed
`supabase/seed_cci_clauses.sql`:
- 5 demo CCI assessments (3 filing_required, 1 exempt, 1 borderline) for democorp
- 50 global clauses across 10 categories (bilingual EN + HI)
- 2 org_private clauses for democorp

---

## Calendar (Prompt 5)

### Migration
`supabase/migrations/20260505000015_workflow.sql` — 9 enums + 5 tables:
`calendar_events`, `calendar_reminders`, `dd_matters`, `dd_checklist_items`, `regulator_notices`.

### Reminder cascade pattern
```typescript
// Create reminders for an event at offsets T-30, T-15, T-7, T-3, T-1, T-0
const offsets = [30, 15, 7, 3, 1, 0]
const rows = offsets.map((days) => {
  const sendAt = new Date(dueDate)
  sendAt.setDate(sendAt.getDate() - days)
  return { org_id, event_id, offset_days: days, scheduled_send_at: sendAt.toISOString(), status: 'scheduled', channel: 'email' }
})
await supabase.from('calendar_reminders').insert(rows)
```

### Process-reminders endpoint
`POST /api/calendar/process-reminders` — called by cron. Requires `x-cron-secret` header.
- Email: Resend REST API (`RESEND_API_KEY`, `RESEND_FROM`, `RESEND_TO_OVERRIDE` env vars)
- WhatsApp: scaffolded with `TODO` comment (requires DLT template approval via MSG91)
- In-app: inserts into `notifications` table using admin client

### Calendar UI
| Path | Type | Purpose |
|---|---|---|
| `app/(app)/calendar/page.tsx` | Server | Stats + passes all events to CalendarClient |
| `components/calendar/calendar-client.tsx` | Client | Month grid + list view + event detail modal |

Color codes: DPDP=red, MCA=blue, SEBI=purple, Labour=green, GST=orange, Contracts=teal, Custom=grey.

---

## M&A Due Diligence (Prompt 5)

### Deterministic checklist generator pattern
```typescript
import { generateDDChecklist } from '@/lib/dd/checklist-templates'
const items = generateDDChecklist(transactionType, sector, sizeBracket)
// Returns ChecklistTemplate[]: { category, item_text, risk }
// 50 common items + sector items (tech/pharma/RE/FS/mfg) + size items (small/mid/large)
// + transaction-type items (asset/slump_sale/merger) = 80-120+ items
```

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/regulatory/dd` | POST | Create matter + generate checklist items + calendar event |
| `/api/regulatory/dd/[id]/items` | PATCH | Update item status/risk/finding; recalculate completion_pct |
| `/api/regulatory/dd/[id]/export` | GET | CSV download of full checklist + findings |

### Pages
| Path | Type | Purpose |
|---|---|---|
| `app/(app)/regulatory/dd/page.tsx` | Server | List of DD matters with progress bars |
| `app/(app)/regulatory/dd/new/page.tsx` | Client | 3-step wizard (matter info → transaction shape → confirm) |
| `app/(app)/regulatory/dd/[id]/page.tsx` | Server | Fetches matter + items, renders DDMatterDetail |
| `components/regulatory/dd-matter-detail.tsx` | Client | Grouped checklist, item drawer, CSV export |

---

## Regulator Notice Response Assistant (Prompt 5)

### Template-based notice response pattern
```typescript
import { generateNoticeResponse } from '@/lib/regulatory/notice-templates'
const brief = generateNoticeResponse(issuer, noticeType, demands)
// issuer: 'mca'|'sebi'|'cci'|'it_dept'|'gst'|'rbi'|'dpb'|'state'|'labour'|'other'
// Returns structured plain-text brief with 5 sections:
//   1. Legal framework  2. Response structure  3. Documents  4. Tone  5. Risk flags
```

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/regulatory/notices` | POST | Create notice + generate brief + calendar event + reminders |

### Pages
| Path | Type | Purpose |
|---|---|---|
| `app/(app)/regulatory/notices/page.tsx` | Server | Notices inbox with urgency badges |
| `app/(app)/regulatory/notices/new/page.tsx` | Client | Log form with issuer dropdown |
| `app/(app)/regulatory/notices/[id]/page.tsx` | Server | Fetches notice, renders NoticeDetail |
| `components/regulatory/notice-detail.tsx` | Client | Shows/edits response brief, status control |

### Seed
`supabase/seed_workflow.sql`:
- 12 calendar events across all regime types (DPDP, MCA, SEBI, Labour, GST, Contracts)
- 1 active DD matter: Project Horizon — TechCorp Solutions (Tech, Large, 90d close)
- 2 regulator notices: MCA SCN under Section 206(4), IT Dept Section 148 reopening

---

## API Routes

<!-- app/api/* route handlers, request/response shapes added here -->

---

## Components

<!-- Shared component inventory with props and file paths added here -->

---

## Utilities

<!-- lib/* helper functions, type definitions, constants added here -->
