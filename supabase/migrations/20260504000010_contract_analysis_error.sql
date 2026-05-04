-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0010 — Add analysis_error column to contracts
-- ════════════════════════════════════════════════════════════════════════════

-- Stores the actual error message from the analysis pipeline so the UI
-- can surface the root cause instead of a generic "please try again".

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS analysis_error TEXT;
