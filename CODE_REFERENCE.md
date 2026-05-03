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

## API Routes

<!-- app/api/* route handlers, request/response shapes added here -->

---

## Components

<!-- Shared component inventory with props and file paths added here -->

---

## Utilities

<!-- lib/* helper functions, type definitions, constants added here -->
