-- =============================================================================
-- Script 181: RPC para registrar aceite da proposta (bypass RLS com validacao)
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_roles_safe()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  SELECT CASE
    WHEN pg_typeof(role) = 'text[]'::regtype THEN role
    ELSE ARRAY[role]
  END
  INTO v_roles
  FROM public.usuarios
  WHERE id = auth.uid();

  RETURN COALESCE(v_roles, ARRAY[]::text[]);
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_aceite_proposta(
  p_precatorio_id uuid,
  p_proposta_aceita boolean,
  p_data_aceite date,
  p_proposta_aceita_id uuid
)
RETURNS TABLE (id uuid, status_kanban text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_roles text[];
  v_is_admin boolean := false;
  v_is_operador_comercial boolean := false;
  v_is_operador_calculo boolean := false;
  v_responsavel_comercial uuid;
  v_responsavel_calculo uuid;
  v_proposta_aceita_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_roles := public.get_user_roles_safe();
  v_is_admin := EXISTS (
    SELECT 1
    FROM unnest(COALESCE(v_roles, ARRAY[]::text[])) AS role_name
    WHERE lower(role_name) = 'admin'
       OR lower(role_name) = 'gestor'
       OR lower(role_name) LIKE 'gestor_%'
  );
  v_is_operador_comercial := EXISTS (
    SELECT 1
    FROM unnest(COALESCE(v_roles, ARRAY[]::text[])) AS role_name
    WHERE lower(role_name) = 'operador_comercial'
       OR lower(role_name) = 'operador'
  );
  v_is_operador_calculo := EXISTS (
    SELECT 1
    FROM unnest(COALESCE(v_roles, ARRAY[]::text[])) AS role_name
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

  UPDATE public.precatorios
  SET proposta_aceita = p_proposta_aceita,
      data_aceite_proposta = CASE WHEN p_proposta_aceita THEN COALESCE(p_data_aceite, CURRENT_DATE) ELSE NULL END,
      proposta_aceita_id = v_proposta_aceita_id,
      status_kanban = CASE WHEN p_proposta_aceita THEN 'proposta_aceita' ELSE status_kanban END,
      localizacao_kanban = CASE WHEN p_proposta_aceita THEN 'proposta_aceita' ELSE localizacao_kanban END,
      updated_at = NOW()
  WHERE id = p_precatorio_id
  RETURNING id, status_kanban;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_roles_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_aceite_proposta TO authenticated;

COMMIT;

SELECT 'Script 181 executado com sucesso! RPC de aceite instalado.' as status;
