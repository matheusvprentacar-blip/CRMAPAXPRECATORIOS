-- ============================================
-- FIX: Constraint atividades_tipo_check
-- ============================================
-- Corrige o constraint que está bloqueando
-- inserções na tabela atividades
-- ============================================

-- Ver o constraint atual
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.atividades'::regclass
  AND conname = 'atividades_tipo_check';

-- Dropar o constraint antigo
ALTER TABLE public.atividades 
DROP CONSTRAINT IF EXISTS atividades_tipo_check;

-- Recriar com TODOS os tipos possíveis
ALTER TABLE public.atividades
ADD CONSTRAINT atividades_tipo_check 
CHECK (tipo IN (
  'criacao',
  'mudanca_status',
  'comentario',
  'anexo',
  'calculo',
  'proposta',
  'negociacao',
  'aprovacao',
  'rejeicao',
  'envio_calculo',
  'conclusao_calculo',
  'upload_pdf',
  'anexo_pdf',
  'exclusao',
  'edicao',
  'atribuicao',
  'reatribuicao',
  'urgente',
  'atraso',
  'sla_status_anterior',
  'sla_status_atual',
  'mudanca_sla',
  'refazer_calculo'
));

-- Verificar o novo constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.atividades'::regclass
  AND conname = 'atividades_tipo_check';

-- ============================================
-- Resultado esperado:
-- atividades_tipo_check | CHECK (tipo IN ('criacao', 'mudanca_status', ...))
-- ============================================
