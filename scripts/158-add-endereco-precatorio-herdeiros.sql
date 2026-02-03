-- ==============================================================================
-- MIGRATION: 158-add-endereco-precatorio-herdeiros.sql
-- PURPOSE: Add endereco field to precatorio_herdeiros
-- ==============================================================================

BEGIN;

ALTER TABLE public.precatorio_herdeiros
  ADD COLUMN IF NOT EXISTS endereco TEXT;

COMMIT;
