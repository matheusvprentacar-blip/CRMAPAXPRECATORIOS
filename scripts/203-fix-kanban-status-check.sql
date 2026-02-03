-- Script 203: Fix precatorios status check constraint to include ALL Kanban columns
-- This is necessary because 'status' and 'status_kanban' are synced by a trigger,
-- and the 'status' column has a restrictive CHECK constraint that is missing new columns.

BEGIN;

-- 1. Drop existing constraint
ALTER TABLE public.precatorios DROP CONSTRAINT IF EXISTS precatorios_status_check;

-- 2. Add new constraint with ALL valid Kanban columns + legacy statuses
ALTER TABLE public.precatorios 
ADD CONSTRAINT precatorios_status_check 
CHECK (status IN (
  -- Legacy statuses (keeping for safety)
  'novo', 'em_contato', 'em_calculo', 'calculado', 'aguardando_cliente', 'concluido', 'cancelado',
  'fila_calculo', 'sem_interesse',
  'pos_fechamento', 'pausado_credor', 'pausado_documentos', -- from statusIds in columns.ts

  -- New Kanban columns (from columns.ts)
  'entrada',
  'triagem_interesse',
  'aguardando_oficio',   -- Was missing!
  'docs_credor',         -- Was missing!
  'analise_processual_inicial',
  'pronto_calculo',
  'calculo_andamento',
  'juridico',
  'calculo_concluido',
  'proposta_negociacao',
  'proposta_aceita',     -- "Jurídico de fechamento"
  'certidoes',
  'fechado',
  'encerrados',
  'reprovado'
));

COMMIT;
