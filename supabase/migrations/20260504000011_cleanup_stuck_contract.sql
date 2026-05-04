-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0011 — One-time cleanup of stuck analysing contract
-- ════════════════════════════════════════════════════════════════════════════

-- Contract 57f19e27 was stuck in execution_status='analysing' after the
-- Vercel function timed out before the catch block could run.
-- Safe to re-run (WHERE clause is precise).

UPDATE public.contracts
SET
  execution_status = 'analysis_failed',
  analysis_error   = 'Stuck in analysing for >5min, manually cleaned'
WHERE id = '57f19e27-e5c2-44b9-9e22-110711504d08'
  AND execution_status = 'analysing';
