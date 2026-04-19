BEGIN;

-- ============================================================
-- Migration 245: Remove coluna "Documentos do credor" do Kanban
-- Todos os créditos em docs_credor voltam para triagem_interesse
-- ============================================================

-- Conjunto de valores válidos após a remoção de docs_credor
-- Usado em dois momentos: normalização de dados e criação de constraints

-- 1. Dropar constraints existentes (para liberar a normalização)
ALTER TABLE public.precatorios
  DROP CONSTRAINT IF EXISTS precatorios_status_kanban_check;

ALTER TABLE public.precatorios
  DROP CONSTRAINT IF EXISTS precatorios_localizacao_kanban_check;

-- 2. Mover créditos de docs_credor → triagem_interesse
UPDATE public.precatorios
SET
  status_kanban      = 'triagem_interesse',
  localizacao_kanban = 'triagem_interesse',
  updated_at         = now()
WHERE
  status_kanban = 'docs_credor'
  OR localizacao_kanban = 'docs_credor';

-- 3. Normalizar valores legados em localizacao_kanban que não existem
--    mais no conjunto válido (ex: aguardando_documentos, pre_calculo, etc.)
--    → fallback para NULL para não bloquear o constraint
UPDATE public.precatorios
SET
  localizacao_kanban = NULL,
  updated_at         = now()
WHERE localizacao_kanban IS NOT NULL
  AND localizacao_kanban NOT IN (
    'entrada',
    'triagem_interesse',
    'aguardando_oficio',
    'analise_processual_inicial',
    'pronto_calculo',
    'calculo_andamento',
    'calculo_concluido',
    'juridico',
    'proposta_negociacao',
    'proposta_aceita',
    'certidoes',
    'escrituras',
    'fechado',
    'pos_fechamento',
    'pausado_credor',
    'pausado_documentos',
    'sem_interesse',
    'reprovado',
    'nao_elegivel',
    'analise_juridica',
    'recalculo_pos_juridico',
    'encerrados'
  );

-- 4. Normalizar valores legados em status_kanban pelo mesmo motivo
UPDATE public.precatorios
SET
  status_kanban = NULL,
  updated_at    = now()
WHERE status_kanban IS NOT NULL
  AND status_kanban NOT IN (
    'entrada',
    'triagem_interesse',
    'aguardando_oficio',
    'analise_processual_inicial',
    'pronto_calculo',
    'calculo_andamento',
    'calculo_concluido',
    'juridico',
    'proposta_negociacao',
    'proposta_aceita',
    'certidoes',
    'escrituras',
    'fechado',
    'pos_fechamento',
    'pausado_credor',
    'pausado_documentos',
    'sem_interesse',
    'reprovado',
    'nao_elegivel',
    'analise_juridica',
    'recalculo_pos_juridico',
    'encerrados'
  );

-- 5. Recriar constraint de status_kanban
ALTER TABLE public.precatorios
  ADD CONSTRAINT precatorios_status_kanban_check CHECK (
    status_kanban IS NULL OR status_kanban IN (
      'entrada',
      'triagem_interesse',
      'aguardando_oficio',
      'analise_processual_inicial',
      'pronto_calculo',
      'calculo_andamento',
      'calculo_concluido',
      'juridico',
      'proposta_negociacao',
      'proposta_aceita',
      'certidoes',
      'escrituras',
      'fechado',
      'pos_fechamento',
      'pausado_credor',
      'pausado_documentos',
      'sem_interesse',
      'reprovado',
      'nao_elegivel',
      'analise_juridica',
      'recalculo_pos_juridico',
      'encerrados'
    )
  );

-- 6. Recriar constraint de localizacao_kanban
ALTER TABLE public.precatorios
  ADD CONSTRAINT precatorios_localizacao_kanban_check CHECK (
    localizacao_kanban IS NULL OR localizacao_kanban IN (
      'entrada',
      'triagem_interesse',
      'aguardando_oficio',
      'analise_processual_inicial',
      'pronto_calculo',
      'calculo_andamento',
      'calculo_concluido',
      'juridico',
      'proposta_negociacao',
      'proposta_aceita',
      'certidoes',
      'escrituras',
      'fechado',
      'pos_fechamento',
      'pausado_credor',
      'pausado_documentos',
      'sem_interesse',
      'reprovado',
      'nao_elegivel',
      'analise_juridica',
      'recalculo_pos_juridico',
      'encerrados'
    )
  );

COMMIT;
