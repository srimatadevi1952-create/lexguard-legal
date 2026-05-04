-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0009 — Add analysis_failed and analysing to contract_execution_status
-- ════════════════════════════════════════════════════════════════════════════

-- These values were missing from the enum, causing PATCH 400 errors when the
-- pipeline tried to write analysis_failed, and blocking analysing/polling flow.

ALTER TYPE public.contract_execution_status ADD VALUE IF NOT EXISTS 'analysis_failed';
ALTER TYPE public.contract_execution_status ADD VALUE IF NOT EXISTS 'analysing';
