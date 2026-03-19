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
  v_is_admin_like BOOLEAN := false;
  v_is_operador_comercial BOOLEAN := false;
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

  IF NOT v_is_admin_like THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = v_user_id
        AND (u.role && ARRAY['operador_comercial', 'operador']::TEXT[])
    )
    INTO v_is_operador_comercial;

    IF NOT v_is_operador_comercial THEN
      RAISE EXCEPTION 'sem_permissao' USING ERRCODE = 'P0001';
    END IF;

    IF COALESCE(v_precatorio.responsavel, v_precatorio.dono_usuario_id, v_precatorio.criado_por, v_user_id) <> v_user_id THEN
      RAISE EXCEPTION 'sem_permissao' USING ERRCODE = 'P0001';
    END IF;

    IF COALESCE(v_precatorio.proposta_aceita, FALSE) THEN
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
    'localizacao_kanban', v_precatorio.localizacao_kanban
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_negociacao_proposta(UUID, NUMERIC, NUMERIC) TO authenticated;

COMMIT;
