-- RECRIAR FUNCTION delete_precatorio
-- Garante que a função existe, verifica permissões e retorna erro claro se falhar.

DROP FUNCTION IF EXISTS public.delete_precatorio(uuid);

CREATE OR REPLACE FUNCTION public.delete_precatorio(p_precatorio_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Roda como dono do banco para garantir que consegue deletar se a lógica permitir
SET search_path = public
AS $$
DECLARE
  v_user_role text[];
BEGIN
  -- 1. Verificar se usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Verificar se é Admin (único que pode deletar)
  SELECT role INTO v_user_role FROM public.usuarios WHERE id = auth.uid();
  
  -- Verificar array de roles (Admin sempre pode)
  IF ('admin' = ANY(v_user_role)) THEN
      -- Admin pode tudo, prosseguir
      NULL;
  ELSE
      -- Se não for admin, verificar se é o Dono/Criador/Responsável do precatório específico
      IF NOT EXISTS (
        SELECT 1 FROM public.precatorios
        WHERE id = p_precatorio_id
        AND (
            dono_usuario_id = auth.uid() 
            OR criado_por = auth.uid() 
            OR responsavel = auth.uid()
        )
      ) THEN
         RAISE EXCEPTION 'Acesso negado: Você só pode excluir precatórios que criou ou é responsável.';
      END IF;
  END IF;

  -- 3. Tentar deletar
  DELETE FROM public.precatorios WHERE id = p_precatorio_id;

  -- 4. Verificar se deletou algo
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Precatório não encontrado ou já excluído (ID: %)', p_precatorio_id;
  END IF;

END;
$$;

-- Garantir permissão de execução
GRANT EXECUTE ON FUNCTION public.delete_precatorio TO authenticated;
