-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0008 — Contract Intelligence tables, RLS, storage bucket
-- ════════════════════════════════════════════════════════════════════════════

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE public.contract_type AS ENUM (
  'nda', 'msa', 'sla', 'employment', 'vendor', 'lease',
  'shareholder', 'loan', 'jv', 'other'
);

CREATE TYPE public.contract_execution_status AS ENUM (
  'draft', 'under_review', 'executed', 'archived'
);

CREATE TYPE public.flag_severity AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE public.risk_level AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE public.flag_category AS ENUM (
  'dpdp', 'gst', 'contract_act', 'it_act', 'companies_act',
  'labour', 'sebi', 'fema', 'commercial', 'drafting'
);

-- ── Core contracts table ──────────────────────────────────────────────────────

CREATE TABLE public.contracts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  counterparty          TEXT,
  contract_type         public.contract_type NOT NULL DEFAULT 'other',
  governing_law_state   TEXT,
  execution_status      public.contract_execution_status NOT NULL DEFAULT 'draft',
  risk_score            SMALLINT CHECK (risk_score BETWEEN 0 AND 100),
  risk_level            public.risk_level,
  owner_id              UUID REFERENCES public.users(id),
  effective_date        DATE,
  expiry_date           DATE,
  analysis_completed_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- ── Versions (one row per uploaded file) ─────────────────────────────────────

CREATE TABLE public.contract_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL DEFAULT 1,
  file_path       TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size_bytes BIGINT,
  extracted_text  TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, version_number)
);

-- ── Clause extraction results ─────────────────────────────────────────────────

CREATE TABLE public.contract_clauses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version_id    UUID NOT NULL REFERENCES public.contract_versions(id) ON DELETE CASCADE,
  clause_number TEXT,
  heading       TEXT,
  body          TEXT NOT NULL,
  parent_id     UUID REFERENCES public.contract_clauses(id),
  order_index   INTEGER NOT NULL DEFAULT 0,
  char_start    INTEGER,
  char_end      INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Risk flags ────────────────────────────────────────────────────────────────

CREATE TABLE public.contract_flags (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id             UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  clause_id               UUID REFERENCES public.contract_clauses(id),
  severity                public.flag_severity NOT NULL,
  category                public.flag_category NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  exact_quote             TEXT,
  suggested_fix           TEXT,
  suggested_fix_rationale TEXT,
  flag_references         JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_resolved             BOOLEAN NOT NULL DEFAULT false,
  resolved_by             UUID REFERENCES public.users(id),
  resolved_at             TIMESTAMPTZ,
  resolution_note         TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Bilingual summaries ───────────────────────────────────────────────────────

CREATE TABLE public.contract_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      UUID NOT NULL UNIQUE REFERENCES public.contracts(id) ON DELETE CASCADE,
  summary_en_short TEXT,
  summary_en_long  TEXT,
  summary_hi_short TEXT,
  summary_hi_long  TEXT,
  key_terms        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── AI chat history ───────────────────────────────────────────────────────────

CREATE TABLE public.contract_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id),
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tags & assignments ────────────────────────────────────────────────────────

CREATE TABLE public.contract_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE public.contract_tag_assignments (
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES public.contract_tags(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contract_id, tag_id)
);

-- ── Triggers ─────────────────────────────────────────────────────────────────

CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_contract_summaries_updated_at
  BEFORE UPDATE ON public.contract_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX contracts_org_id_active_idx
  ON public.contracts(org_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX contracts_expiry_idx
  ON public.contracts(expiry_date)
  WHERE deleted_at IS NULL;

CREATE INDEX contract_versions_contract_idx
  ON public.contract_versions(contract_id, version_number DESC);

CREATE INDEX contract_clauses_contract_order_idx
  ON public.contract_clauses(contract_id, order_index);

CREATE INDEX contract_flags_contract_idx
  ON public.contract_flags(contract_id);

CREATE INDEX contract_flags_clause_idx
  ON public.contract_flags(clause_id)
  WHERE clause_id IS NOT NULL;

CREATE INDEX contract_chat_messages_contract_idx
  ON public.contract_chat_messages(contract_id, created_at);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.contracts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_clauses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_flags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_summaries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_tag_assignments ENABLE ROW LEVEL SECURITY;

-- contracts
CREATE POLICY "contracts: read own org" ON public.contracts
  FOR SELECT USING (
    org_id = public.current_org_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "contracts: insert as active member" ON public.contracts
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "contracts: update as active member" ON public.contracts
  FOR UPDATE USING (org_id = public.current_org_id());

-- contract_versions (scope to org via contract)
CREATE POLICY "contract_versions: read own org" ON public.contract_versions
  FOR SELECT USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_versions: insert" ON public.contract_versions
  FOR INSERT WITH CHECK (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_versions: update" ON public.contract_versions
  FOR UPDATE USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

-- contract_clauses
CREATE POLICY "contract_clauses: read own org" ON public.contract_clauses
  FOR SELECT USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_clauses: insert" ON public.contract_clauses
  FOR INSERT WITH CHECK (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

-- contract_flags
CREATE POLICY "contract_flags: read own org" ON public.contract_flags
  FOR SELECT USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_flags: insert" ON public.contract_flags
  FOR INSERT WITH CHECK (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_flags: update as active member" ON public.contract_flags
  FOR UPDATE USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

-- contract_summaries
CREATE POLICY "contract_summaries: read own org" ON public.contract_summaries
  FOR SELECT USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_summaries: insert" ON public.contract_summaries
  FOR INSERT WITH CHECK (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_summaries: update" ON public.contract_summaries
  FOR UPDATE USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

-- contract_chat_messages
CREATE POLICY "contract_chat_messages: read own org" ON public.contract_chat_messages
  FOR SELECT USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_chat_messages: insert as self" ON public.contract_chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

-- contract_tags
CREATE POLICY "contract_tags: read own org" ON public.contract_tags
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY "contract_tags: manage" ON public.contract_tags
  FOR ALL USING (org_id = public.current_org_id());

-- contract_tag_assignments
CREATE POLICY "contract_tag_assignments: read own org" ON public.contract_tag_assignments
  FOR SELECT USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

CREATE POLICY "contract_tag_assignments: manage" ON public.contract_tag_assignments
  FOR ALL USING (
    contract_id IN (SELECT id FROM public.contracts WHERE org_id = public.current_org_id())
  );

-- ── Storage bucket ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts',
  'contracts',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: restrict access to own org path (org_{uuid}/contracts/...)
CREATE POLICY "contracts storage: upload as active member"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.role() = 'authenticated'
    AND (string_to_array(name, '/'))[1] = 'org_' || (
      SELECT active_org_id::text
      FROM public.user_session_state
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contracts storage: read own org"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND auth.role() = 'authenticated'
    AND (string_to_array(name, '/'))[1] = 'org_' || (
      SELECT active_org_id::text
      FROM public.user_session_state
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contracts storage: delete own org"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contracts'
    AND auth.role() = 'authenticated'
    AND (string_to_array(name, '/'))[1] = 'org_' || (
      SELECT active_org_id::text
      FROM public.user_session_state
      WHERE user_id = auth.uid()
    )
  );
