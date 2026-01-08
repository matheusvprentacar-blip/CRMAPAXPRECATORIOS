-- ============================================
-- SCRIPT 43: ATRASO ESTRUTURADO
-- ============================================
-- FASE 2: Adiciona campos para registro estruturado
-- de motivos de atraso com tipo e impacto
-- ============================================

-- 1. Adicionar colunas de atraso estruturado
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS tipo_atraso TEXT;

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS impacto_atraso TEXT;

-- 2. Criar índice para consultas
CREATE INDEX IF NOT EXISTS idx_precatorios_tipo_atraso 
ON public.precatorios(tipo_atraso) 
WHERE tipo_atraso IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_precatorios_impacto_atraso 
ON public.precatorios(impacto_atraso) 
WHERE impacto_atraso IS NOT NULL;

-- 3. Adicionar comentários
COMMENT ON COLUMN public.precatorios.tipo_atraso IS 
'Tipo do atraso: titular_falecido, penhora, cessao_parcial, doc_incompleta, duvida_juridica, aguardando_cliente, outro';

COMMENT ON COLUMN public.precatorios.impacto_atraso IS 
'Impacto estimado do atraso: baixo (até 24h), medio (2-5 dias), alto (>5 dias)';

-- 4. Criar constraint para validar valores
ALTER TABLE public.precatorios
DROP CONSTRAINT IF EXISTS check_tipo_atraso;

ALTER TABLE public.precatorios
ADD CONSTRAINT check_tipo_atraso 
CHECK (tipo_atraso IS NULL OR tipo_atraso IN (
  'titular_falecido',
  'penhora',
  'cessao_parcial',
  'doc_incompleta',
  'duvida_juridica',
  'aguardando_cliente',
  'outro'
));

ALTER TABLE public.precatorios
DROP CONSTRAINT IF EXISTS check_impacto_atraso;

ALTER TABLE public.precatorios
ADD CONSTRAINT check_impacto_atraso 
CHECK (impacto_atraso IS NULL OR impacto_atraso IN (
  'baixo',
  'medio',
  'alto'
));

-- 5. Atualizar view precatorios_cards
DROP VIEW IF EXISTS public.precatorios_cards CASCADE;

CREATE OR REPLACE VIEW public.precatorios_cards AS
SELECT 
  p.id,
  p.titulo,
  p.numero_precatorio,
  p.numero_processo,
  p.numero_oficio,
  p.tribunal,
  p.devedor,
  p.esfera_devedor,
  p.credor_nome,
  p.credor_cpf_cnpj,
  p.advogado_nome,
  p.advogado_cpf_cnpj,
  p.cessionario,
  p.titular_falecido,
  p.contatos,
  p.valor_principal,
  p.valor_juros,
  p.valor_selic,
  p.valor_atualizado,
  p.saldo_liquido,
  p.data_base,
  p.data_expedicao,
  p.data_calculo,
  p.pss_percentual,
  p.pss_valor,
  p.irpf_valor,
  p.irpf_isento,
  p.honorarios_percentual,
  p.honorarios_valor,
  p.adiantamento_percentual,
  p.adiantamento_valor,
  p.proposta_menor_percentual,
  p.proposta_maior_percentual,
  p.proposta_menor_valor,
  p.proposta_maior_valor,
  p.status,
  p.prioridade,
  p.localizacao_kanban,
  p.urgente,
  p.criado_por,
  p.responsavel,
  p.responsavel_calculo_id,
  p.dados_calculo,
  p.created_at,
  p.updated_at,
  
  -- Complexidade (FASE 1)
  p.score_complexidade,
  p.nivel_complexidade,
  
  -- SLA (FASE 1)
  p.data_entrada_calculo,
  p.sla_horas,
  p.sla_status,
  
  -- Motivo de Atraso (FASE 1)
  p.motivo_atraso_calculo,
  p.data_atraso_calculo,
  p.registrado_atraso_por,
  
  -- Atraso Estruturado (FASE 2)
  p.tipo_atraso,
  p.impacto_atraso,
  
  -- Nomes dos usuários
  u_criador.nome as criador_nome,
  u_responsavel.nome as responsavel_nome,
  u_calculo.nome as responsavel_calculo_nome,
  u_atraso.nome as registrado_atraso_nome,
  
  -- Campos display (placeholders)
  '' as proposta_menor_valor_display,
  '' as proposta_maior_valor_display,
  '' as proposta_menor_percentual_display,
  '' as proposta_maior_percentual_display,
  '' as data_calculo_display,
  '' as dados_calculo_display

FROM public.precatorios p
LEFT JOIN public.usuarios u_criador ON p.criado_por = u_criador.id
LEFT JOIN public.usuarios u_responsavel ON p.responsavel = u_responsavel.id
LEFT JOIN public.usuarios u_calculo ON p.responsavel_calculo_id = u_calculo.id
LEFT JOIN public.usuarios u_atraso ON p.registrado_atraso_por = u_atraso.id
WHERE p.deleted_at IS NULL;

-- 6. Conceder permissões
GRANT SELECT ON public.precatorios_cards TO authenticated;

-- ============================================
-- FIM DO SCRIPT 43
-- ============================================
-- Resultado esperado:
-- ✅ Coluna tipo_atraso adicionada
-- ✅ Coluna impacto_atraso adicionada
-- ✅ Constraints de validação criadas
-- ✅ Índices criados
-- ✅ View precatorios_cards atualizada
-- ✅ Permissões concedidas
-- ============================================
