BEGIN;

CREATE OR REPLACE FUNCTION public.user_is_admin_like(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = p_user_id
      AND EXISTS (
        SELECT 1
        FROM unnest(COALESCE(u.role, ARRAY[]::TEXT[])) AS role_name
        WHERE lower(role_name) = 'admin'
           OR lower(role_name) = 'tecnico_ti'
           OR lower(role_name) = 'gestor'
           OR lower(role_name) LIKE 'gestor_%'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.jwt_is_admin_like()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.jwt_has_role('admin')
    OR public.jwt_has_role('tecnico_ti')
    OR public.jwt_has_role('gestor')
    OR public.jwt_has_role('gestor_certidoes')
    OR public.jwt_has_role('gestor_oficio')
    OR public.jwt_has_role('gestor_escrituras');
$$;

CREATE OR REPLACE FUNCTION public.app_current_user_has_any_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(COALESCE(public.app_current_user_roles(), ARRAY[]::TEXT[])) AS role_name
    WHERE role_name = ANY(required_roles)
       OR lower(role_name) = 'tecnico_ti'
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_usuario_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_roles TEXT[] := ARRAY[]::TEXT[];
BEGIN
  v_roles := ARRAY(
    SELECT DISTINCT lower(trim(role_name))
    FROM unnest(COALESCE(NEW.role, ARRAY[]::TEXT[])) AS role_name
    WHERE role_name IS NOT NULL AND trim(role_name) <> ''
  );

  IF COALESCE(array_length(v_roles, 1), 0) = 0 THEN
    v_roles := ARRAY['operador_comercial'];
  END IF;

  IF 'tecnico_ti' = ANY(v_roles) AND NOT ('admin' = ANY(v_roles)) THEN
    v_roles := array_append(v_roles, 'admin');
  END IF;

  NEW.role := v_roles;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalize_usuario_roles ON public.usuarios;
CREATE TRIGGER trigger_normalize_usuario_roles
BEFORE INSERT OR UPDATE OF role
ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.normalize_usuario_roles();

UPDATE public.usuarios
SET
  role = (
    SELECT ARRAY(
      SELECT DISTINCT role_name
      FROM unnest(COALESCE(public.usuarios.role, ARRAY[]::TEXT[]) || ARRAY['admin']::TEXT[]) AS role_name
      WHERE role_name IS NOT NULL AND trim(role_name) <> ''
    )
  ),
  updated_at = NOW()
WHERE
  'tecnico_ti' = ANY(COALESCE(role, ARRAY[]::TEXT[]))
  AND NOT ('admin' = ANY(COALESCE(role, ARRAY[]::TEXT[])));

CREATE OR REPLACE FUNCTION public.trigger_auditar_edicao_tecnico_ti_precatorio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_roles TEXT[] := ARRAY[]::TEXT[];
  v_changed_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(u.role, ARRAY[]::TEXT[])
  INTO v_roles
  FROM public.usuarios u
  WHERE u.id = v_user_id;

  IF NOT ('tecnico_ti' = ANY(v_roles)) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(array_agg(diff.key ORDER BY diff.key), ARRAY[]::TEXT[])
  INTO v_changed_columns
  FROM (
    SELECT COALESCE(n.key, o.key) AS key
    FROM jsonb_each(to_jsonb(NEW)) n
    FULL OUTER JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
    WHERE n.value IS DISTINCT FROM o.value
  ) diff;

  IF COALESCE(array_length(v_changed_columns, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.precatorio_auditoria (
    precatorio_id,
    acao,
    de,
    para,
    payload_json,
    user_id
  )
  VALUES (
    NEW.id,
    'EDICAO_TECNICO_TI',
    COALESCE(OLD.status_kanban, ''),
    COALESCE(NEW.status_kanban, ''),
    jsonb_build_object(
      'tecnico_user_id', v_user_id,
      'roles', to_jsonb(v_roles),
      'campos_alterados', to_jsonb(v_changed_columns),
      'total_campos_alterados', COALESCE(array_length(v_changed_columns, 1), 0)
    ),
    v_user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_precatorio_auditar_edicao_tecnico_ti ON public.precatorios;
CREATE TRIGGER trigger_precatorio_auditar_edicao_tecnico_ti
AFTER UPDATE
ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auditar_edicao_tecnico_ti_precatorio();

GRANT EXECUTE ON FUNCTION public.user_is_admin_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_is_admin_like() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_user_has_any_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_usuario_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_auditar_edicao_tecnico_ti_precatorio() TO authenticated;

COMMIT;
