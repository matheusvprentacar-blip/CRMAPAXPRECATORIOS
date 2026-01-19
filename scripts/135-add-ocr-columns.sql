-- ============================================
-- SCRIPT 135: ADICIONAR COLUNAS PARA OCR E ARQUIVOS
-- ============================================

-- 1. Adicionar colunas na tabela precatorios
ALTER TABLE public.precatorios
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS raw_text TEXT;

COMMENT ON COLUMN public.precatorios.file_url IS 'URL do arquivo original (PDF/Excel) no Storage';
COMMENT ON COLUMN public.precatorios.raw_text IS 'Texto bruto extraído via OCR/IA para fins de busca e debug';

-- 2. Atualizar a View precatorios_cards para incluir essas colunas
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
  
  -- Cálculo Externo
  p.calculo_externo,
  p.memoria_calculo_url,
  p.data_calculo_manual,

  -- OCR / Arquivos (NOVOS)
  p.file_url,
  p.raw_text,

  -- Complexidade
  p.score_complexidade,
  p.nivel_complexidade,
  
  -- SLA
  p.data_entrada_calculo,
  p.sla_horas,
  p.sla_status,
  
  -- Motivo de Atraso
  p.motivo_atraso_calculo,
  p.data_atraso_calculo,
  p.registrado_atraso_por,
  
  -- Atraso Estruturado
  p.tipo_atraso,
  p.impacto_atraso,
  
  -- Nomes dos usuários
  u_criador.nome as criador_nome,
  u_responsavel.nome as responsavel_nome,
  u_calculo.nome as responsavel_calculo_nome,
  u_atraso.nome as registrado_atraso_nome,
  
  -- Campos display
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

GRANT SELECT ON public.precatorios_cards TO authenticated;
