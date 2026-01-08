-- ============================================
-- SCRIPT 42: ATUALIZAR VIEW PRECATORIOS_CARDS
-- ============================================
-- Adiciona os novos campos de complexidade e SLA
-- na view precatorios_cards
-- ============================================

-- 1. Recriar a view com os novos campos
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
  
  -- NOVOS CAMPOS: Complexidade
  p.score_complexidade,
  p.nivel_complexidade,
  
  -- NOVOS CAMPOS: SLA
  p.data_entrada_calculo,
  p.sla_horas,
  p.sla_status,
  
  -- CAMPOS: Motivo de Atraso (do script 39)
  p.motivo_atraso_calculo,
  p.data_atraso_calculo,
  p.registrado_atraso_por,
  
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

-- 2. Conceder permissões
GRANT SELECT ON public.precatorios_cards TO authenticated;

-- 3. Adicionar comentário
COMMENT ON VIEW public.precatorios_cards IS 
'View otimizada para listagem de precatórios com informações de complexidade, SLA e nomes de usuários';

-- ============================================
-- FIM DO SCRIPT 42
-- ============================================
-- Resultado esperado:
-- ✅ View precatorios_cards recriada
-- ✅ Campos de complexidade incluídos
-- ✅ Campos de SLA incluídos
-- ✅ Campos de atraso incluídos
-- ✅ Permissões concedidas
-- ============================================
