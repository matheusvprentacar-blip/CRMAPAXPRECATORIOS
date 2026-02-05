-- =====================================================
-- SCRIPT 205: Atualizar busca global com novos filtros
-- =====================================================
-- Adiciona filtros de tribunal, status de calculo e faixas
-- separadas de valores (atualizado vs sem atualizacao).
-- =====================================================

-- 1. Garantir extensao unaccent (se permitido)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Remover assinatura anterior
DROP FUNCTION IF EXISTS public.buscar_precatorios_global(
  text, text[], uuid, uuid, text[], text[], text[], text[],
  date, date, date, date, numeric, numeric, boolean, boolean
);

-- 3. Criar funcao com novos filtros
CREATE OR REPLACE FUNCTION public.buscar_precatorios_global(
  p_termo TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_responsavel_id UUID DEFAULT NULL,
  p_tribunal TEXT DEFAULT NULL,
  p_criador_id UUID DEFAULT NULL,
  p_complexidade TEXT[] DEFAULT NULL,
  p_sla_status TEXT[] DEFAULT NULL,
  p_tipo_atraso TEXT[] DEFAULT NULL,
  p_impacto_atraso TEXT[] DEFAULT NULL,
  p_data_criacao_inicio DATE DEFAULT NULL,
  p_data_criacao_fim DATE DEFAULT NULL,
  p_data_entrada_calculo_inicio DATE DEFAULT NULL,
  p_data_entrada_calculo_fim DATE DEFAULT NULL,
  p_valor_min NUMERIC DEFAULT NULL,
  p_valor_max NUMERIC DEFAULT NULL,
  p_valor_atualizado_min NUMERIC DEFAULT NULL,
  p_valor_atualizado_max NUMERIC DEFAULT NULL,
  p_valor_sem_atualizacao_min NUMERIC DEFAULT NULL,
  p_valor_sem_atualizacao_max NUMERIC DEFAULT NULL,
  p_urgente BOOLEAN DEFAULT NULL,
  p_titular_falecido BOOLEAN DEFAULT NULL,
  p_valor_calculado BOOLEAN DEFAULT NULL,
  p_calculo_andamento BOOLEAN DEFAULT NULL,
  p_calculo_finalizado BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  numero_precatorio TEXT,
  numero_processo TEXT,
  numero_oficio TEXT,
  tribunal TEXT,
  devedor TEXT,
  esfera_devedor TEXT,
  credor_nome TEXT,
  credor_cpf_cnpj TEXT,
  advogado_nome TEXT,
  advogado_cpf_cnpj TEXT,
  cessionario TEXT,
  valor_principal NUMERIC,
  valor_atualizado NUMERIC,
  status TEXT,
  urgente BOOLEAN,
  created_at TIMESTAMPTZ,
  criado_por UUID,
  responsavel UUID,
  responsavel_calculo_id UUID,
  criador_nome TEXT,
  responsavel_nome TEXT,
  responsavel_calculo_nome TEXT,
  nivel_complexidade TEXT,
  score_complexidade INTEGER,
  sla_status TEXT,
  sla_horas INTEGER,
  tipo_atraso TEXT,
  impacto_atraso TEXT,
  motivo_atraso_calculo TEXT,
  responsavel_certidoes_id UUID,
  responsavel_oficio_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_roles TEXT[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT u.role INTO v_user_roles
  FROM public.usuarios u
  WHERE u.id = v_user_id;

  RETURN QUERY
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
    p.valor_principal,
    p.valor_atualizado,
    p.status,
    p.urgente,
    p.created_at,
    p.criado_por,
    p.responsavel,
    p.responsavel_calculo_id,
    u_criador.nome as criador_nome,
    u_responsavel.nome as responsavel_nome,
    u_calculo.nome as responsavel_calculo_nome,
    p.nivel_complexidade,
    p.score_complexidade,
    p.sla_status,
    p.sla_horas,
    p.tipo_atraso,
    p.impacto_atraso,
    p.motivo_atraso_calculo,
    p.responsavel_certidoes_id,
    p.responsavel_oficio_id
  FROM public.precatorios p
  LEFT JOIN public.usuarios u_criador ON p.criado_por = u_criador.id
  LEFT JOIN public.usuarios u_responsavel ON p.responsavel = u_responsavel.id
  LEFT JOIN public.usuarios u_calculo ON p.responsavel_calculo_id = u_calculo.id
  WHERE p.deleted_at IS NULL
    AND (
      ('admin' = ANY(v_user_roles)) OR
      ('gestor' = ANY(v_user_roles)) OR
      ('operador_comercial' = ANY(v_user_roles) AND (p.criado_por = v_user_id OR p.responsavel = v_user_id)) OR
      ('operador_calculo' = ANY(v_user_roles) AND (p.responsavel_calculo_id = v_user_id OR p.responsavel = v_user_id OR p.criado_por = v_user_id)) OR
      ('gestor_certidoes' = ANY(v_user_roles) AND (p.responsavel_certidoes_id = v_user_id)) OR
      ('gestor_oficio' = ANY(v_user_roles) AND (p.responsavel_oficio_id = v_user_id)) OR
      ('juridico' = ANY(v_user_roles) AND (p.responsavel_juridico_id = v_user_id))
    )
    AND (
      p_termo IS NULL OR
      unaccent(p.titulo) ILIKE '%' || unaccent(p_termo) || '%' OR
      unaccent(p.numero_precatorio) ILIKE '%' || unaccent(p_termo) || '%' OR
      unaccent(p.numero_processo) ILIKE '%' || unaccent(p_termo) || '%' OR
      unaccent(p.credor_nome) ILIKE '%' || unaccent(p_termo) || '%' OR
      unaccent(p.credor_cpf_cnpj) ILIKE '%' || unaccent(p_termo) || '%' OR
      unaccent(p.devedor) ILIKE '%' || unaccent(p_termo) || '%' OR
      unaccent(u_criador.nome) ILIKE '%' || unaccent(p_termo) || '%'
    )
    AND (p_tribunal IS NULL OR unaccent(p.tribunal) ILIKE '%' || unaccent(p_tribunal) || '%')
    AND (p_status IS NULL OR p.status = ANY(p_status))
    AND (p_responsavel_id IS NULL OR p.responsavel = p_responsavel_id)
    AND (p_criador_id IS NULL OR p.criado_por = p_criador_id)
    AND (p_complexidade IS NULL OR p.nivel_complexidade = ANY(p_complexidade))
    AND (p_sla_status IS NULL OR p.sla_status = ANY(p_sla_status))
    AND (p_tipo_atraso IS NULL OR p.tipo_atraso = ANY(p_tipo_atraso))
    AND (p_impacto_atraso IS NULL OR p.impacto_atraso = ANY(p_impacto_atraso))
    AND (p_data_criacao_inicio IS NULL OR p.created_at::DATE >= p_data_criacao_inicio)
    AND (p_data_criacao_fim IS NULL OR p.created_at::DATE <= p_data_criacao_fim)
    AND (p_data_entrada_calculo_inicio IS NULL OR p.data_entrada_calculo::DATE >= p_data_entrada_calculo_inicio)
    AND (p_data_entrada_calculo_fim IS NULL OR p.data_entrada_calculo::DATE <= p_data_entrada_calculo_fim)
    AND (p_valor_min IS NULL OR COALESCE(p.valor_atualizado, p.valor_principal) >= p_valor_min)
    AND (p_valor_max IS NULL OR COALESCE(p.valor_atualizado, p.valor_principal) <= p_valor_max)
    AND (p_valor_atualizado_min IS NULL OR (p.valor_atualizado IS NOT NULL AND p.valor_atualizado > 0 AND p.valor_atualizado >= p_valor_atualizado_min))
    AND (p_valor_atualizado_max IS NULL OR (p.valor_atualizado IS NOT NULL AND p.valor_atualizado > 0 AND p.valor_atualizado <= p_valor_atualizado_max))
    AND (p_valor_sem_atualizacao_min IS NULL OR (COALESCE(p.valor_atualizado, 0) = 0 AND p.valor_principal >= p_valor_sem_atualizacao_min))
    AND (p_valor_sem_atualizacao_max IS NULL OR (COALESCE(p.valor_atualizado, 0) = 0 AND p.valor_principal <= p_valor_sem_atualizacao_max))
    AND (p_urgente IS NULL OR p.urgente = p_urgente)
    AND (p_titular_falecido IS NULL OR p.tipo_atraso = 'titular_falecido')
    AND (
      p_valor_calculado IS NULL OR
      (
        p_valor_calculado = true AND
        (
          COALESCE(p.valor_atualizado, 0) > 0 OR
          COALESCE(p.saldo_liquido, 0) > 0 OR
          p.data_calculo IS NOT NULL
        )
      )
    )
    AND (
      (p_calculo_andamento IS NULL AND p_calculo_finalizado IS NULL) OR
      (p_calculo_andamento IS TRUE AND p.status IN ('calculo_andamento', 'em_calculo')) OR
      (p_calculo_finalizado IS TRUE AND p.status IN ('calculo_concluido', 'calculado'))
    )
  ORDER BY 
    p.urgente DESC,
    p.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.buscar_precatorios_global IS 
'Busca global de precatorios com filtros avancados (tribunal, calculo e valores).';

GRANT EXECUTE ON FUNCTION public.buscar_precatorios_global TO authenticated;
