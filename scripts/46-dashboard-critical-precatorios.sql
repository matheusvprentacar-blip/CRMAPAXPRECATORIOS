-- =====================================================
-- SCRIPT 46: Função RPC para Dashboard - Precatórios Críticos
-- =====================================================
-- Descrição: Cria função para buscar precatórios críticos
--            com score de criticidade calculado
-- Autor: Sistema CRM Precatórios
-- Data: 2024
-- =====================================================

-- Criar função para buscar precatórios críticos
CREATE OR REPLACE FUNCTION get_critical_precatorios()
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  numero_precatorio TEXT,
  status TEXT,
  nivel_complexidade TEXT,
  score_complexidade INTEGER,
  sla_status TEXT,
  sla_horas INTEGER,
  tipo_atraso TEXT,
  impacto_atraso TEXT,
  motivo_atraso_calculo TEXT,
  data_entrada_calculo TIMESTAMP,
  responsavel_calculo_id UUID,
  responsavel_nome TEXT,
  horas_em_fila DOUBLE PRECISION,
  score_criticidade INTEGER
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
    p.status,
    p.nivel_complexidade,
    p.score_complexidade,
    p.sla_status,
    p.sla_horas,
    p.tipo_atraso,
    p.impacto_atraso,
    p.motivo_atraso_calculo,
    p.data_entrada_calculo,
    p.responsavel_calculo_id,
    u.nome as responsavel_nome,
    -- Calcular horas em fila
    CASE 
      WHEN p.data_entrada_calculo IS NOT NULL 
      THEN (EXTRACT(EPOCH FROM (NOW() - p.data_entrada_calculo)) / 3600)::DOUBLE PRECISION
      ELSE NULL
    END as horas_em_fila,
    -- Calcular score de criticidade (0-100)
    (
      -- Complexidade alta: 30 pontos
      CASE WHEN p.nivel_complexidade = 'alta' THEN 30 ELSE 0 END +
      -- SLA atrasado: 40 pontos
      CASE WHEN p.sla_status = 'atrasado' THEN 40 ELSE 0 END +
      -- Impacto alto: 30 pontos
      CASE WHEN p.impacto_atraso = 'alto' THEN 30 ELSE 0 END
    )::INTEGER as score_criticidade
  FROM precatorios p
  LEFT JOIN usuarios u ON u.id = p.responsavel_calculo_id
  WHERE p.deleted_at IS NULL
    AND (
      p.nivel_complexidade = 'alta' 
      OR p.sla_status = 'atrasado' 
      OR p.impacto_atraso = 'alto'
    )
  ORDER BY 
    -- Ordenar por criticidade (maior primeiro)
    (
      CASE WHEN p.nivel_complexidade = 'alta' THEN 30 ELSE 0 END +
      CASE WHEN p.sla_status = 'atrasado' THEN 40 ELSE 0 END +
      CASE WHEN p.impacto_atraso = 'alto' THEN 30 ELSE 0 END
    ) DESC,
    p.created_at ASC
  LIMIT 10;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION get_critical_precatorios() IS 
'Retorna os 10 precatórios mais críticos baseado em complexidade, SLA e impacto de atraso';

-- =====================================================
-- TESTES
-- =====================================================

-- Testar a função
SELECT * FROM get_critical_precatorios();

-- Verificar se a função foi criada
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_critical_precatorios';

-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- DROP FUNCTION IF EXISTS get_critical_precatorios();
