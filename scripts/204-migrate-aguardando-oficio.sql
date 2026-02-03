-- Script 204: migrate precatorios from aguardando_oficio to analise_processual_inicial
BEGIN;

-- 0) Garante que a constraint de kanban permite o novo status enquanto atualizamos
ALTER TABLE public.precatorios
  DROP CONSTRAINT IF EXISTS precatorios_status_kanban_check;

ALTER TABLE public.precatorios
  ADD CONSTRAINT precatorios_status_kanban_check
  CHECK (status_kanban IN (
    'entrada',
    'triagem_interesse',
    'aguardando_oficio',
    'analise_processual_inicial',
    'docs_credor',
    'pronto_calculo',
    'calculo_andamento',
    'juridico',
    'calculo_concluido',
    'proposta_negociacao',
    'proposta_aceita',
    'certidoes',
    'fechado',
    'pos_fechamento',
    'pausado_credor',
    'pausado_documentos',
    'sem_interesse',
    'reprovado'
  ));

-- 1. Atualiza o status principal e o kanban para a nova etapa
UPDATE public.precatorios
SET status = 'analise_processual_inicial',
    status_kanban = 'analise_processual_inicial'
WHERE status = 'aguardando_oficio'
   OR status_kanban = 'aguardando_oficio';

COMMIT;
