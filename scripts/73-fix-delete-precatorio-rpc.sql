-- ============================================
-- FIX: Função delete_precatorio
-- ============================================
-- Recria a função RPC para deletar precatórios
-- com soft delete (marca deleted_at)
-- ============================================

-- Drop da função existente (se houver)
DROP FUNCTION IF EXISTS public.delete_precatorio(UUID);

-- Criar função para soft delete de precatórios
CREATE OR REPLACE FUNCTION public.delete_precatorio(p_precatorio_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_precatorio RECORD;
  v_result JSON;
BEGIN
  -- Obter ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Obter role do usuário
  SELECT role INTO v_user_role
  FROM public.usuarios
  WHERE id = v_user_id;

  -- Buscar o precatório
  SELECT * INTO v_precatorio
  FROM public.precatorios
  WHERE id = p_precatorio_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Precatório não encontrado';
  END IF;

  -- Verificar permissões
  -- Admin pode deletar qualquer precatório
  -- Operador comercial/cálculo pode deletar se for criador ou responsável
  IF v_user_role = 'admin' THEN
    -- Admin pode deletar
    NULL;
  ELSIF v_user_role IN ('operador_comercial', 'operador_calculo') THEN
    IF v_precatorio.criado_por != v_user_id AND v_precatorio.responsavel != v_user_id THEN
      RAISE EXCEPTION 'Sem permissão para deletar este precatório';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissão para deletar precatórios';
  END IF;

  -- Soft delete: marcar como deletado
  UPDATE public.precatorios
  SET 
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_precatorio_id;

  -- Registrar atividade
  INSERT INTO public.atividades (
    precatorio_id,
    tipo,
    descricao,
    created_at
  ) VALUES (
    p_precatorio_id,
    'exclusao',
    'Precatório excluído',
    NOW()
  );

  -- Retornar sucesso
  v_result := json_build_object(
    'success', true,
    'message', 'Precatório excluído com sucesso',
    'precatorio_id', p_precatorio_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Retornar erro
    v_result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
    RETURN v_result;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.delete_precatorio(UUID) IS 
'Soft delete de precatório. Admin pode deletar qualquer um. Operadores podem deletar apenas os que criaram ou são responsáveis.';

-- Grant execute para usuários autenticados
GRANT EXECUTE ON FUNCTION public.delete_precatorio(UUID) TO authenticated;

-- ============================================
-- Verificação
-- ============================================

-- Verificar se a função foi criada
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'delete_precatorio';

-- Resultado esperado:
-- routine_name      | routine_type | security_type
-- delete_precatorio | FUNCTION     | DEFINER
