-- =====================================================
-- SCRIPT 71: Corrigir Precatórios Críticos por Role
-- =====================================================
-- Descrição: Adiciona filtros por role na função get_critical_precatorios
--            - Admin: vê todos os críticos
--            - Operador Comercial: vê apenas os que criou ou é responsável
--            - Operador Cálculo: vê os que estão em cálculo atribuídos a ele
-- =====================================================

-- 1. Remover função existente
DROP FUNCTION IF EXISTS public.get_critical_precatorios();

-- 2. Recriar função com filtros por role
CREATE OR REPLACE FUNCTION public.get_critical_precatorios()
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
  horas_em_fila NUMERIC,
  score_criticidade INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- Obter ID e role do usuário atual
  v_user_id := auth.uid();
  
  SELECT u.role INTO v_user_role
  FROM public.usuarios u
  WHERE u.id = v_user_id;

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
    u_calculo.nome as responsavel_nome,
    CASE 
      WHEN p.data_entrada_calculo IS NOT NULL THEN
        EXTRACT(EPOCH FROM (NOW() - p.data_entrada_calculo)) / 3600
      ELSE NULL
    END as horas_em_fila,
    (
      CASE WHEN p.nivel_complexidade = 'alta' THEN 30 ELSE 0 END +
      CASE WHEN p.sla_status = 'atrasado' THEN 40 ELSE 0 END +
      CASE WHEN p.impacto_atraso = 'alto' THEN 30 ELSE 0 END
    )::INTEGER as score_criticidade
  FROM public.precatorios p
  LEFT JOIN public.usuarios u_calculo ON p.responsavel_calculo_id = u_calculo.id
  WHERE p.deleted_at IS NULL
    -- Filtrar apenas críticos
    AND (
      p.nivel_complexidade = 'alta' OR
      p.sla_status = 'atrasado' OR
      p.impacto_atraso = 'alto'
    )
    -- FILTRO POR ROLE
    AND (
      -- Admin vê tudo
      v_user_role = 'admin'
      OR
      -- Operador Comercial vê apenas os que criou ou é responsável
      (v_user_role = 'operador_comercial' AND (
        p.criado_por = v_user_id OR 
        p.responsavel = v_user_id
      ))
      OR
      -- Operador de Cálculo vê os que estão em cálculo atribuídos a ele
      (v_user_role = 'operador_calculo' AND (
        p.responsavel_calculo_id = v_user_id OR
        p.responsavel = v_user_id OR
        p.criado_por = v_user_id
      ))
    )
  ORDER BY 
    (
      CASE WHEN p.nivel_complexidade = 'alta' THEN 30 ELSE 0 END +
      CASE WHEN p.sla_status = 'atrasado' THEN 40 ELSE 0 END +
      CASE WHEN p.impacto_atraso = 'alto' THEN 30 ELSE 0 END
    ) DESC,
    p.created_at ASC
  LIMIT 10;
END;
$$;

-- Adicionar comentário
COMMENT ON FUNCTION public.get_critical_precatorios IS 
'Retorna os 10 precatórios mais críticos com filtros por role.
- Admin: vê todos os críticos
- Operador Comercial: vê apenas os que criou ou é responsável
- Operador Cálculo: vê os que estão em cálculo atribuídos a ele';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_critical_precatorios TO authenticated;

-- =====================================================
-- TESTES
-- =====================================================

-- Teste 1: Verificar se função foi atualizada
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_critical_precatorios';

-- Teste 2: Buscar críticos (deve respeitar role do usuário logado)
SELECT 
  id,
  titulo,
  status,
  responsavel_nome,
  score_criticidade
FROM get_critical_precatorios();

-- =====================================================
-- NOTAS
-- =====================================================
-- Esta função é usada no Dashboard para mostrar os
-- precatórios que precisam de atenção imediata.
--
-- Agora respeita as mesmas regras de visibilidade
-- das outras funções do sistema.
-- =====================================================
