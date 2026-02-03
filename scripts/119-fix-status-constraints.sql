-- Script 119: Fix Status Constraints to Match Kanban Columns
-- This script updates the check constraint on precatorios table to allow all Kanban column IDs as valid statuses

BEGIN;

-- 1. Drop existing constraint
ALTER TABLE public.precatorios DROP CONSTRAINT IF EXISTS precatorios_status_check;

-- 2. Add new constraint with ALL valid Kanban columns + legacy statuses
ALTER TABLE public.precatorios 
ADD CONSTRAINT precatorios_status_check 
CHECK (status IN (
  -- Legacy statuses
  'novo', 'em_contato', 'em_calculo', 'calculado', 'aguardando_cliente', 'concluido', 'cancelado',
  -- Outros legados encontrados em produção
  'fila_calculo',
  
  -- New Kanban columns
  'entrada',
  'triagem_interesse',
  'pronto_calculo',
  'calculo_andamento',
  'certidoes',
  'juridico',
  'calculo_concluido',
  'proposta_negociacao',
  'fechado',

  -- Paralelos / fim de fluxo
  'sem_interesse'
));

-- 3. Removed update to atividades constraint since code was adapted to use existing 'calculo' type.
-- This prevents constraint violations with existing data.

COMMIT;
