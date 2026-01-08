-- =====================================================
-- SCRIPT 48: Busca Avançada e Filtros
-- =====================================================
-- Descrição: Implementa busca global e filtros combináveis
--            para localizar precatórios por qualquer campo
-- Autor: Sistema CRM Precatórios
-- Data: 2025
-- =====================================================

-- 1. Criar função de busca global
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
BEGIN
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

-- 2. Adicionar comentário
COMMENT ON FUNCTION public.buscar_precatorios_global IS 
'Busca global de precatórios com filtros combináveis. Permite buscar por texto livre e aplicar múltiplos filtros simultaneamente.';

-- 3. Criar índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_precatorios_busca_texto 
ON public.precatorios USING gin(
  to_tsvector('portuguese', 
    COALESCE(titulo, '') || ' ' ||
    COALESCE(numero_precatorio, '') || ' ' ||
    COALESCE(numero_processo, '') || ' ' ||
    COALESCE(credor_nome, '') || ' ' ||
    COALESCE(advogado_nome, '')
  )
);

CREATE INDEX IF NOT EXISTS idx_precatorios_status_complexidade 
ON public.precatorios(status, nivel_complexidade) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_precatorios_sla_tipo_atraso 
ON public.precatorios(sla_status, tipo_atraso) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_precatorios_datas 
ON public.precatorios(created_at, data_entrada_calculo) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_precatorios_valores 
ON public.precatorios(valor_atualizado, valor_principal) 
WHERE deleted_at IS NULL;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.buscar_precatorios_global TO authenticated;

-- =====================================================
-- TESTES
-- =====================================================

-- Teste 1: Busca por texto
SELECT * FROM buscar_precatorios_global(
  p_termo := 'João'
) LIMIT 5;

-- Teste 2: Filtro por status
SELECT * FROM buscar_precatorios_global(
  p_status := ARRAY['em_calculo', 'finalizado']
) LIMIT 5;

-- Teste 3: Filtro por complexidade e SLA
SELECT * FROM buscar_precatorios_global(
  p_complexidade := ARRAY['alta'],
  p_sla_status := ARRAY['atrasado']
) LIMIT 5;

-- Teste 4: Busca combinada (texto + filtros)
SELECT * FROM buscar_precatorios_global(
  p_termo := 'precatorio',
  p_status := ARRAY['em_calculo'],
  p_urgente := true
) LIMIT 5;

-- Teste 5: Filtro por intervalo de datas
SELECT * FROM buscar_precatorios_global(
  p_data_criacao_inicio := '2024-01-01',
  p_data_criacao_fim := '2024-12-31'
) LIMIT 5;

-- Verificar se a função foi criada
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'buscar_precatorios_global';

-- Verificar índices criados
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'precatorios'
  AND indexname LIKE 'idx_precatorios_%'
ORDER BY indexname;

-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- DROP FUNCTION IF EXISTS public.buscar_precatorios_global;
-- DROP INDEX IF EXISTS idx_precatorios_busca_texto;
-- DROP INDEX IF EXISTS idx_precatorios_status_complexidade;
-- DROP INDEX IF EXISTS idx_precatorios_sla_tipo_atraso;
-- DROP INDEX IF EXISTS idx_precatorios_datas;
-- DROP INDEX IF EXISTS idx_precatorios_valores;

-- =====================================================
-- NOTAS
-- =====================================================
-- Esta função permite:
-- - Busca por texto livre em múltiplos campos
-- - Filtros combináveis (AND)
-- - Múltiplas seleções em filtros (status, complexidade, etc.)
-- - Filtros por intervalo de datas
-- - Filtros por faixa de valores
-- - Performance otimizada com índices
--
-- Uso no frontend:
-- const { data } = await supabase.rpc('buscar_precatorios_global', {
--   p_termo: 'João',
--   p_status: ['em_calculo'],
--   p_complexidade: ['alta']
-- });
-- =====================================================
