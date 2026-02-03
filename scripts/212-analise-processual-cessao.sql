-- Script 212: campos de cessao na analise processual
ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS analise_cessao_valor numeric(15,2),
  ADD COLUMN IF NOT EXISTS analise_cessao_percentual numeric(5,2);
