-- =============================================================================
-- Migration 0014: CCI Assessments + Clause Library
-- Tables: cci_assessments, clauses, clause_insertions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.cci_verdict        AS ENUM ('filing_required', 'exempt', 'borderline');
CREATE TYPE public.clause_visibility  AS ENUM ('global', 'org_private');
CREATE TYPE public.clause_party_pos   AS ENUM ('drafter_favours', 'counterparty_favours', 'neutral');

-- ---------------------------------------------------------------------------
-- cci_assessments
-- (all monetary fields in INR Crores)
-- ---------------------------------------------------------------------------
CREATE TABLE public.cci_assessments (
  id                            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessed_by                   UUID    REFERENCES public.users(id),

  -- Acquirer
  acquirer_name                 TEXT    NOT NULL,
  acquirer_assets_india         NUMERIC,
  acquirer_assets_worldwide     NUMERIC,
  acquirer_turnover_india       NUMERIC,
  acquirer_turnover_worldwide   NUMERIC,

  -- Target
  target_name                   TEXT    NOT NULL,
  target_assets_india           NUMERIC,
  target_assets_worldwide       NUMERIC,
  target_turnover_india         NUMERIC,
  target_turnover_worldwide     NUMERIC,
  target_india_turnover_pct     NUMERIC, -- % of global turnover from India (for DVT)

  -- Group (post-transaction combined group)
  group_assets_india            NUMERIC,
  group_assets_worldwide        NUMERIC,
  group_turnover_india          NUMERIC,
  group_turnover_worldwide      NUMERIC,

  -- Transaction
  deal_value                    NUMERIC,
  transaction_type              TEXT,

  -- Verdict
  verdict                       public.cci_verdict NOT NULL,
  form_type                     TEXT,              -- 'Form I' | 'Form II' | NULL
  triggered_tests               TEXT[]  NOT NULL DEFAULT '{}',
  exempt_reasons                TEXT[]  NOT NULL DEFAULT '{}',
  notes                         TEXT,

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cci_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cci_assessments: org member select"
  ON public.cci_assessments FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = cci_assessments.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "cci_assessments: org member insert"
  ON public.cci_assessments FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = cci_assessments.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- clauses
-- global clauses have org_id = NULL; org_private clauses have org_id set
-- ---------------------------------------------------------------------------
CREATE TABLE public.clauses (
  id                        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID    REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                     TEXT    NOT NULL,
  category                  TEXT    NOT NULL,
  clause_text_en            TEXT    NOT NULL,
  clause_text_hi            TEXT,
  use_case                  TEXT,
  risk_notes                TEXT,
  party_position            public.clause_party_pos NOT NULL DEFAULT 'neutral',
  applicable_acts           TEXT[]  NOT NULL DEFAULT '{}',
  applicable_contract_types TEXT[]  NOT NULL DEFAULT '{}',
  statute_references        TEXT,
  visibility                public.clause_visibility NOT NULL DEFAULT 'global',
  created_by                UUID    REFERENCES public.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read global clauses
CREATE POLICY "clauses: read global"
  ON public.clauses FOR SELECT TO authenticated
  USING (visibility = 'global');

-- Org members can read their org_private clauses
CREATE POLICY "clauses: read org_private"
  ON public.clauses FOR SELECT
  USING (
    visibility = 'org_private'
    AND org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = clauses.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Only admin / senior_lawyer can insert org_private clauses
CREATE POLICY "clauses: insert org_private"
  ON public.clauses FOR INSERT
  WITH CHECK (
    visibility = 'org_private'
    AND org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = clauses.org_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'senior_lawyer')
    )
  );

-- Admin / senior_lawyer can update their own org_private clauses
CREATE POLICY "clauses: update org_private"
  ON public.clauses FOR UPDATE
  USING (
    visibility = 'org_private'
    AND org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = clauses.org_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'senior_lawyer')
    )
  );

-- ---------------------------------------------------------------------------
-- clause_insertions  (tracking when / where a clause was used)
-- ---------------------------------------------------------------------------
CREATE TABLE public.clause_insertions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clause_id    UUID NOT NULL REFERENCES public.clauses(id) ON DELETE CASCADE,
  inserted_by  UUID REFERENCES public.users(id),
  contract_id  UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clause_insertions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clause_insertions: org member select"
  ON public.clause_insertions FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = clause_insertions.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "clause_insertions: org member insert"
  ON public.clause_insertions FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = clause_insertions.org_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );
