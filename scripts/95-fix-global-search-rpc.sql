-- =====================================================
-- SCRIPT 95: Corrigir Busca Global para Array de Roles
-- =====================================================
-- Descrição: Atualiza a função buscar_precatorios_global para suportar
--            o novo tipo de dado TEXT[] na coluna role.
-- =====================================================

-- 1. Remover função existente (para evitar conflitos de assinatura)
DROP FUNCTION IF EXISTS public.buscar_precatorios_global(
  text, text[], uuid, uuid, text[], text[], text[], text[],
  date, date, date, date, numeric, numeric, boolean, boolean
);

-- 2. Recriar função compatível com array de roles
CREATE OR REPLACE FUNCTION public.buscar_precatorios_global(
  p_termo TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_responsavel_id UUID DEFAULT NULL,
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
  p_urgente BOOLEAN DEFAULT NULL,
  p_titular_falecido BOOLEAN DEFAULT NULL
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
  motivo_atraso_calculo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_roles TEXT[]; -- ALTERADO PARA ARRAY
BEGIN
  -- Obter ID e role do usuário atual
  v_user_id := auth.uid();
  
  -- Se não estiver logado, retornar vazio
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Carregar roles
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
    p.motivo_atraso_calculo
  FROM public.precatorios p
  LEFT JOIN public.usuarios u_criador ON p.criado_por = u_criador.id
  LEFT JOIN public.usuarios u_responsavel ON p.responsavel = u_responsavel.id
  LEFT JOIN public.usuarios u_calculo ON p.responsavel_calculo_id = u_calculo.id
  WHERE p.deleted_at IS NULL
    -- FILTRO POR ROLE (Lógica atualizada para Array)
    AND (
      -- Admin vê tudo
      ('admin' = ANY(v_user_roles))
      OR
      -- Operador Comercial vê apenas os que criou ou é responsável
      ('operador_comercial' = ANY(v_user_roles) AND (
        p.criado_por = v_user_id OR 
        p.responsavel = v_user_id
      ))
      OR
      -- Operador de Cálculo vê os que estão em cálculo atribuídos a ele
      -- OU os que ele é responsável comercial
      ('operador_calculo' = ANY(v_user_roles) AND (
        p.responsavel_calculo_id = v_user_id OR
        p.responsavel = v_user_id OR
        p.criado_por = v_user_id
      ))
      OR
      -- Gestores (Certidões e Ofícios) também devem ter acesso
      ('gestor_certidoes' = ANY(v_user_roles) AND (
         p.responsavel_certidoes_id = v_user_id
      ))
      OR
      ('gestor_oficio' = ANY(v_user_roles) AND (
         p.responsavel_oficio_id = v_user_id
      ))
    )
    -- Busca global (texto)
    AND (
      p_termo IS NULL OR
      p.titulo ILIKE '%' || p_termo || '%' OR
      p.numero_precatorio ILIKE '%' || p_termo || '%' OR
      p.numero_processo ILIKE '%' || p_termo || '%' OR
      p.numero_oficio ILIKE '%' || p_termo || '%' OR
      p.tribunal ILIKE '%' || p_termo || '%' OR
      p.devedor ILIKE '%' || p_termo || '%' OR
      p.esfera_devedor ILIKE '%' || p_termo || '%' OR
      p.credor_nome ILIKE '%' || p_termo || '%' OR
      p.credor_cpf_cnpj ILIKE '%' || p_termo || '%' OR
      p.advogado_nome ILIKE '%' || p_termo || '%' OR
      p.advogado_cpf_cnpj ILIKE '%' || p_termo || '%' OR
      p.cessionario ILIKE '%' || p_termo || '%' OR
      p.motivo_atraso_calculo ILIKE '%' || p_termo || '%' OR
      u_criador.nome ILIKE '%' || p_termo || '%' OR
      u_responsavel.nome ILIKE '%' || p_termo || '%' OR
      u_calculo.nome ILIKE '%' || p_termo || '%'
    )
    -- Filtro por status (múltiplo)
    AND (p_status IS NULL OR p.status = ANY(p_status))
    -- Filtro por responsável
    AND (p_responsavel_id IS NULL OR p.responsavel = p_responsavel_id)
    -- Filtro por criador
    AND (p_criador_id IS NULL OR p.criado_por = p_criador_id)
    -- Filtro por complexidade (múltiplo)
    AND (p_complexidade IS NULL OR p.nivel_complexidade = ANY(p_complexidade))
    -- Filtro por SLA (múltiplo)
    AND (p_sla_status IS NULL OR p.sla_status = ANY(p_sla_status))
    -- Filtro por tipo de atraso (múltiplo)
    AND (p_tipo_atraso IS NULL OR p.tipo_atraso = ANY(p_tipo_atraso))
    -- Filtro por impacto de atraso (múltiplo)
    AND (p_impacto_atraso IS NULL OR p.impacto_atraso = ANY(p_impacto_atraso))
    -- Filtro por data de criação
    AND (p_data_criacao_inicio IS NULL OR p.created_at::DATE >= p_data_criacao_inicio)
    AND (p_data_criacao_fim IS NULL OR p.created_at::DATE <= p_data_criacao_fim)
    -- Filtro por data de entrada em cálculo
    AND (p_data_entrada_calculo_inicio IS NULL OR p.data_entrada_calculo::DATE >= p_data_entrada_calculo_inicio)
    AND (p_data_entrada_calculo_fim IS NULL OR p.data_entrada_calculo::DATE <= p_data_entrada_calculo_fim)
    -- Filtro por valor
    AND (p_valor_min IS NULL OR COALESCE(p.valor_atualizado, p.valor_principal) >= p_valor_min)
    AND (p_valor_max IS NULL OR COALESCE(p.valor_atualizado, p.valor_principal) <= p_valor_max)
    -- Filtro por urgente
    AND (p_urgente IS NULL OR p.urgente = p_urgente)
    -- Filtro por titular falecido
    AND (p_titular_falecido IS NULL OR p.tipo_atraso = 'titular_falecido')
  ORDER BY 
    p.urgente DESC,
    p.created_at DESC;
END;
$$;

-- Adicionar comentário
COMMENT ON FUNCTION public.buscar_precatorios_global IS 
'Busca global de precatórios com filtros combináveis e controle por array de roles';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.buscar_precatorios_global TO authenticated;
