BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_negociacao_proposta(
  p_precatorio_id UUID,
  p_percentual_credor NUMERIC,
  p_percentual_advogado NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin_like BOOLEAN := FALSE;
  v_is_operador_comercial BOOLEAN := FALSE;
  v_is_operador_calculo BOOLEAN := FALSE;
  v_is_responsavel_comercial BOOLEAN := FALSE;
  v_is_responsavel_calculo BOOLEAN := FALSE;
  v_precatorio public.precatorios%ROWTYPE;
  v_dados_calculo JSONB;
  v_status_atual TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_precatorio
  FROM public.precatorios
  WHERE id = p_precatorio_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'precatorio_nao_encontrado' USING ERRCODE = 'P0001';
  END IF;

  v_is_admin_like := public.user_is_admin_like(v_user_id);

  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = v_user_id
      AND (u.role && ARRAY['operador_comercial', 'operador']::TEXT[])
  )
  INTO v_is_operador_comercial;

  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = v_user_id
      AND (u.role && ARRAY['operador_calculo']::TEXT[])
  )
  INTO v_is_operador_calculo;

  v_is_responsavel_comercial :=
    COALESCE(v_precatorio.responsavel, v_precatorio.dono_usuario_id, v_precatorio.criado_por, v_user_id) = v_user_id;
  v_is_responsavel_calculo :=
    COALESCE(v_precatorio.responsavel_calculo_id, v_precatorio.operador_calculo, v_user_id) = v_user_id;

  IF NOT v_is_admin_like THEN
    IF NOT (
      (v_is_operador_comercial AND v_is_responsavel_comercial)
      OR (v_is_operador_calculo AND v_is_responsavel_calculo)
    ) THEN
      RAISE EXCEPTION 'sem_permissao' USING ERRCODE = 'P0001';
    END IF;

    IF COALESCE(v_precatorio.proposta_aceita, FALSE) AND NOT (v_is_operador_calculo AND v_is_responsavel_calculo) THEN
      RAISE EXCEPTION 'proposta_bloqueada' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_dados_calculo := COALESCE(v_precatorio.dados_calculo, '{}'::JSONB)
    || jsonb_build_object(
      'proposta_escolhida_percentual',
      CASE WHEN COALESCE(p_percentual_credor, 0) > 0 THEN p_percentual_credor ELSE NULL END,
      'proposta_advogado_percentual',
      CASE WHEN COALESCE(p_percentual_advogado, 0) > 0 THEN p_percentual_advogado ELSE NULL END
    );

  v_status_atual := lower(trim(COALESCE(v_precatorio.status_kanban, v_precatorio.localizacao_kanban, '')));

  IF v_status_atual = '' OR v_status_atual = 'calculo_concluido' OR v_status_atual = 'proposta_negociacao' THEN
    UPDATE public.precatorios
    SET
      dados_calculo = v_dados_calculo,
      status_kanban = 'proposta_negociacao',
      localizacao_kanban = 'proposta_negociacao',
      updated_at = NOW()
    WHERE id = p_precatorio_id
    RETURNING * INTO v_precatorio;
  ELSE
    UPDATE public.precatorios
    SET
      dados_calculo = v_dados_calculo,
      updated_at = NOW()
    WHERE id = p_precatorio_id
    RETURNING * INTO v_precatorio;
  END IF;

  RETURN jsonb_build_object(
    'id', v_precatorio.id,
    'status_kanban', v_precatorio.status_kanban,
    'localizacao_kanban', v_precatorio.localizacao_kanban,
    'proposta_aceita', COALESCE(v_precatorio.proposta_aceita, FALSE)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_aceite_proposta(
  p_precatorio_id UUID,
  p_proposta_aceita BOOLEAN,
  p_data_aceite DATE,
  p_proposta_aceita_id UUID
)
RETURNS TABLE (id UUID, status_kanban TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_roles TEXT[];
  v_is_admin BOOLEAN := FALSE;
  v_is_operador_comercial BOOLEAN := FALSE;
  v_is_operador_calculo BOOLEAN := FALSE;
  v_responsavel_comercial UUID;
  v_responsavel_calculo UUID;
  v_proposta_aceita_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_roles := public.get_user_roles_safe();

  v_is_admin := EXISTS (
    SELECT 1
    FROM unnest(COALESCE(v_roles, ARRAY[]::TEXT[])) AS role_name
    WHERE lower(role_name) = 'admin'
       OR lower(role_name) = 'gestor'
       OR lower(role_name) LIKE 'gestor_%'
  );

  v_is_operador_comercial := EXISTS (
    SELECT 1
    FROM unnest(COALESCE(v_roles, ARRAY[]::TEXT[])) AS role_name
    WHERE lower(role_name) = 'operador_comercial'
       OR lower(role_name) = 'operador'
  );

  v_is_operador_calculo := EXISTS (
    SELECT 1
    FROM unnest(COALESCE(v_roles, ARRAY[]::TEXT[])) AS role_name
    WHERE lower(role_name) = 'operador_calculo'
  );

  SELECT
    COALESCE(responsavel, dono_usuario_id, criado_por),
    COALESCE(responsavel_calculo_id, operador_calculo)
  INTO
    v_responsavel_comercial,
    v_responsavel_calculo
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'precatorio_nao_encontrado';
  END IF;

  IF v_is_admin IS NOT TRUE
    AND NOT (
      (v_is_operador_comercial AND v_responsavel_comercial = v_user_id)
      OR (v_is_operador_calculo AND v_responsavel_calculo = v_user_id)
    ) THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  v_proposta_aceita_id := CASE
    WHEN p_proposta_aceita THEN COALESCE(p_proposta_aceita_id, v_user_id)
    ELSE NULL
  END;

  RETURN QUERY
  UPDATE public.precatorios
  SET
    proposta_aceita = p_proposta_aceita,
    data_aceite_proposta = CASE WHEN p_proposta_aceita THEN COALESCE(p_data_aceite, CURRENT_DATE) ELSE NULL END,
    proposta_aceita_id = v_proposta_aceita_id,
    status_kanban = CASE WHEN p_proposta_aceita THEN 'proposta_aceita' ELSE status_kanban END,
    localizacao_kanban = CASE WHEN p_proposta_aceita THEN 'proposta_aceita' ELSE localizacao_kanban END,
    updated_at = NOW()
  WHERE public.precatorios.id = p_precatorio_id
  RETURNING public.precatorios.id, public.precatorios.status_kanban::TEXT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'precatorio_nao_encontrado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_negociacao_proposta(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_aceite_proposta(UUID, BOOLEAN, DATE, UUID) TO authenticated;

COMMIT;
