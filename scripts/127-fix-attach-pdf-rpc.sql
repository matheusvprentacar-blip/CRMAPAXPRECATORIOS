-- FIX CRÍTICO: RPC attach_precatorio_pdf falhando para Admins
-- Motivo: A função anterior confiava puramente no RLS ou tinha checagem de role antiga (string vs array)
-- Solução: Reescrever função com SECURITY DEFINER e validação manual correta de roles

-- 0. Dropar função anterior para evitar conflito de tipo de retorno
DROP FUNCTION IF EXISTS public.attach_precatorio_pdf(uuid, text);

CREATE OR REPLACE FUNCTION public.attach_precatorio_pdf(
  p_precatorio_id UUID,
  p_pdf_url TEXT
)
RETURNS TABLE(
  id UUID,
  pdf_url TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- Roda como superuser/dono, bypassando RLS da tabela
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_roles TEXT[]; -- Role agora é ARRAY
  v_is_admin BOOLEAN;
  v_has_access BOOLEAN;
BEGIN
  -- 1. Identificar usuário e roles
  v_user_id := auth.uid();
  
  -- Conversão robusta de claims do JWT para array
  -- user_metadata -> role (pode ser string ou array)
  SELECT 
    CASE 
      WHEN jsonb_typeof(auth.jwt() -> 'app_metadata' -> 'role') = 'array' 
        THEN ARRAY(SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'role'))
      ELSE 
        ARRAY[auth.jwt() -> 'app_metadata' ->> 'role']::TEXT[]
    END
  INTO v_user_roles;

  -- Validação básica
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Verificar se é Admin
  v_is_admin := 'admin' = ANY(v_user_roles);

  -- 3. Verificar acesso (Se não for admin)
  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = p_precatorio_id
      AND (
        p.criado_por = v_user_id OR
        p.responsavel = v_user_id OR
        p.responsavel_calculo_id = v_user_id OR
        p.responsavel_certidoes_id = v_user_id OR
        p.responsavel_oficio_id = v_user_id OR
        p.responsavel_juridico_id = v_user_id
        -- Adicione outros campos de responsabilidade aqui se necessário
      )
    ) INTO v_has_access;

    IF NOT v_has_access THEN
      RAISE EXCEPTION 'sem permissao para anexar pdf'; -- Mensagem exata que o frontend espera/mostra
    END IF;
  END IF;

  -- 4. Executar Update (Bypassando RLS pois é SECURITY DEFINER)
  RETURN QUERY
  UPDATE public.precatorios
  SET 
    pdf_url = p_pdf_url,
    updated_at = NOW()
  WHERE 
    precatorios.id = p_precatorio_id
    AND deleted_at IS NULL
  RETURNING 
    precatorios.id,
    precatorios.pdf_url,
    precatorios.updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Precatório não encontrado (ou deletado)';
  END IF;

END;
$$;

-- Garantir permissão de execução
GRANT EXECUTE ON FUNCTION public.attach_precatorio_pdf TO authenticated;
