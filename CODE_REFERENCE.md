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

## API Routes

<!-- app/api/* route handlers, request/response shapes added here -->

---

## Components

<!-- Shared component inventory with props and file paths added here -->

---

## Utilities

<!-- lib/* helper functions, type definitions, constants added here -->
