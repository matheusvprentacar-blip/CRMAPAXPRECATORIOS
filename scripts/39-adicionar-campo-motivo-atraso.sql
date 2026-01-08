-- ============================================
-- Script 39: Adicionar Campo Motivo de Atraso no Cálculo
-- ============================================
-- Descrição: Adiciona campos para registrar quando um operador
--            de cálculo não consegue processar um precatório
--            imediatamente e precisa justificar o atraso.
-- ============================================

-- 0. PRIMEIRO: Garantir que a coluna urgente existe (do script 23)
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS urgente BOOLEAN DEFAULT false;

-- 1. Adicionar coluna para motivo do atraso
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS motivo_atraso_calculo TEXT;

-- 2. Adicionar coluna para data/hora do registro do atraso
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS data_atraso_calculo TIMESTAMP WITH TIME ZONE;

-- 3. Adicionar coluna para quem registrou o atraso
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS registrado_atraso_por UUID REFERENCES auth.users(id);

-- 4. Criar índice para consultas de precatórios com atraso
CREATE INDEX IF NOT EXISTS idx_precatorios_atraso_calculo 
ON public.precatorios(motivo_atraso_calculo, data_atraso_calculo)
WHERE motivo_atraso_calculo IS NOT NULL;

-- 5. Adicionar comentários para documentação
COMMENT ON COLUMN public.precatorios.motivo_atraso_calculo IS 
'Justificativa do operador de cálculo quando não consegue processar o precatório imediatamente. Exemplos: Titular falecido, Penhora identificada, Documentação incompleta, etc.';

COMMENT ON COLUMN public.precatorios.data_atraso_calculo IS 
'Data e hora em que o atraso foi registrado pelo operador de cálculo';

COMMENT ON COLUMN public.precatorios.registrado_atraso_por IS 
'UUID do usuário (operador de cálculo) que registrou o motivo do atraso';

-- 6. Atualizar a view precatorios_cards para incluir os novos campos
DROP VIEW IF EXISTS public.precatorios_cards CASCADE;

CREATE OR REPLACE VIEW public.precatorios_cards AS
SELECT 
  p.id,
  p.titulo,
  p.numero_processo,
  p.numero_precatorio,
  p.credor_nome,
  p.valor_principal,
  p.valor_atualizado,
  p.status,
  p.created_at,
  p.updated_at,
  p.criado_por,
  p.responsavel,
  p.responsavel_calculo_id,
  p.prioridade,
  p.urgente,
  p.tribunal,
  p.localizacao_kanban,
  p.dados_calculo,
  p.proposta_menor_valor,
  p.proposta_maior_valor,
  
  -- Novos campos de atraso
  p.motivo_atraso_calculo,
  p.data_atraso_calculo,
  p.registrado_atraso_por,
  
  -- Nomes dos usuários
  u_criador.nome as criador_nome,
  u_responsavel.nome as responsavel_nome,
  u_calculo.nome as responsavel_calculo_nome,
  u_atraso.nome as registrado_atraso_nome,
  
  -- Campos display (placeholders)
  COALESCE(p.dados_calculo::text, 'Aguardando cálculo') as dados_calculo_display,
  COALESCE(
    'R$ ' || TO_CHAR(p.proposta_menor_valor, 'FM999G999G999D00'),
    'Não calculado'
  ) as proposta_menor_valor_display,
  COALESCE(
    'R$ ' || TO_CHAR(p.proposta_maior_valor, 'FM999G999G999D00'),
    'Não calculado'
  ) as proposta_maior_valor_display
  
FROM public.precatorios p
LEFT JOIN public.usuarios u_criador ON p.criado_por = u_criador.id
LEFT JOIN public.usuarios u_responsavel ON p.responsavel = u_responsavel.id
LEFT JOIN public.usuarios u_calculo ON p.responsavel_calculo_id = u_calculo.id
LEFT JOIN public.usuarios u_atraso ON p.registrado_atraso_por = u_atraso.id
WHERE p.deleted_at IS NULL;

-- 7. Recriar permissões RLS para a view
GRANT SELECT ON public.precatorios_cards TO authenticated;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Para verificar se funcionou:
-- SELECT motivo_atraso_calculo, data_atraso_calculo, registrado_atraso_nome 
-- FROM precatorios_cards 
-- WHERE motivo_atraso_calculo IS NOT NULL;
