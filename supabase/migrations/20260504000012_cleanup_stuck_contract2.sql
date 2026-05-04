-- ════════════════════════════════════════════════════════════════════════════
-- Migration 0012 — Clean up second stuck analysing contract
-- ════════════════════════════════════════════════════════════════════════════

UPDATE public.contracts
SET
  execution_status = 'analysis_failed',
  analysis_error   = 'Stuck in analysing for >5min, manually cleaned'
WHERE id = '62a16979-a4fa-462e-aa19-651598a70d20'
  AND execution_status = 'analysing';
