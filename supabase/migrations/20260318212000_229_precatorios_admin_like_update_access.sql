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
    OR public.jwt_has_role('gestor')
    OR public.jwt_has_role('gestor_certidoes')
    OR public.jwt_has_role('gestor_oficio')
    OR public.jwt_has_role('gestor_escrituras');
$$;

DROP POLICY IF EXISTS precatorios_admin_select ON public.precatorios;
CREATE POLICY precatorios_admin_select
  ON public.precatorios
  FOR SELECT
  USING (
    public.user_is_admin_like()
    OR public.jwt_is_admin_like()
  );

DROP POLICY IF EXISTS precatorios_admin_update ON public.precatorios;
CREATE POLICY precatorios_admin_update
  ON public.precatorios
  FOR UPDATE
  USING (
    public.user_is_admin_like()
    OR public.jwt_is_admin_like()
  )
  WITH CHECK (
    public.user_is_admin_like()
    OR public.jwt_is_admin_like()
  );

DROP POLICY IF EXISTS precatorios_admin_delete ON public.precatorios;
CREATE POLICY precatorios_admin_delete
  ON public.precatorios
  FOR DELETE
  USING (
    public.user_is_admin_like()
    OR public.jwt_is_admin_like()
  );

DROP POLICY IF EXISTS precatorios_block_update_gestor ON public.precatorios;
CREATE POLICY precatorios_block_update_gestor
  ON public.precatorios
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    (NOT public.user_has_role('gestor'))
    OR public.user_is_admin_like()
    OR public.jwt_is_admin_like()
  )
  WITH CHECK (
    (NOT public.user_has_role('gestor'))
    OR public.user_is_admin_like()
    OR public.jwt_is_admin_like()
  );

DROP POLICY IF EXISTS precatorios_block_insert_gestor ON public.precatorios;
CREATE POLICY precatorios_block_insert_gestor
  ON public.precatorios
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    (NOT public.user_has_role('gestor'))
    OR public.user_is_admin_like()
    OR public.jwt_is_admin_like()
  );

DROP POLICY IF EXISTS precatorios_block_delete_gestor ON public.precatorios;
CREATE POLICY precatorios_block_delete_gestor
  ON public.precatorios
  AS RESTRICTIVE
  FOR DELETE
  USING (
    (NOT public.user_has_role('gestor'))
    OR public.user_is_admin_like()
    OR public.jwt_is_admin_like()
  );

COMMIT;
