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
  v_roles text[];
  v_is_admin boolean := false;
  v_is_operador boolean := false;
  v_responsavel uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_roles := public.get_user_roles_safe();
  v_is_admin := 'admin' = ANY(v_roles) OR 'gestor' = ANY(v_roles);
  v_is_operador := 'operador_comercial' = ANY(v_roles) OR 'operador' = ANY(v_roles);

  SELECT COALESCE(responsavel, dono_usuario_id, criado_por)
  INTO v_responsavel
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  IF v_is_admin IS NOT TRUE AND NOT (v_is_operador AND v_responsavel = auth.uid()) THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  UPDATE public.precatorios
  SET proposta_aceita = p_proposta_aceita,
      data_aceite_proposta = CASE WHEN p_proposta_aceita THEN p_data_aceite ELSE NULL END,
      proposta_aceita_id = CASE WHEN p_proposta_aceita THEN p_proposta_aceita_id ELSE NULL END,
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
