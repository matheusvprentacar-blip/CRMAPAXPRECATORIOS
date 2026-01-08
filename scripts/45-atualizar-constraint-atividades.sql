-- ============================================
-- SCRIPT 45: ATUALIZAR CONSTRAINT ATIVIDADES
-- ============================================
-- FASE 2: Atualiza constraint da tabela atividades
-- para aceitar os novos tipos de eventos da timeline
-- ============================================

-- 1. Remover constraint antigo
ALTER TABLE public.atividades
DROP CONSTRAINT IF EXISTS atividades_tipo_check;

-- 2. Criar novo constraint com todos os tipos
ALTER TABLE public.atividades
ADD CONSTRAINT atividades_tipo_check 
CHECK (tipo IN (
  -- Tipos originais
  'criacao',
  'atualizacao',
  'calculo',
  'mudanca_status',
  'mudanca_localizacao',
  'comentario',
  'atraso_calculo',
  -- Novos tipos da FASE 2 (timeline)
  'inclusao_fila',
  'inicio_calculo',
  'atraso',
  'retomada',
  'finalizacao'
));

-- 3. Adicionar comentário
COMMENT ON CONSTRAINT atividades_tipo_check ON public.atividades IS 
'Tipos válidos: criacao, atualizacao, calculo, mudanca_status, mudanca_localizacao, comentario, atraso_calculo, inclusao_fila, inicio_calculo, atraso, retomada, finalizacao';

-- ============================================
-- FIM DO SCRIPT 45
-- ============================================
-- Resultado esperado:
-- ✅ Constraint antigo removido
-- ✅ Novo constraint criado com todos os tipos
-- ✅ Triggers da timeline funcionarão corretamente
-- ============================================
