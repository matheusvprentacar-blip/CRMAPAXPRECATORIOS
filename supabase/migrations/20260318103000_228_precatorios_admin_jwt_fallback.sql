BEGIN;

CREATE OR REPLACE FUNCTION public.jwt_has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_claim JSONB;
  v_item TEXT;
BEGIN
  v_claim := auth.jwt() -> 'app_metadata' -> 'role';
  IF v_claim IS NULL THEN
    v_claim := auth.jwt() -> 'role';
  END IF;

  IF v_claim IS NULL THEN
    RETURN FALSE;
  END IF;

  IF jsonb_typeof(v_claim) = 'string' THEN
    RETURN lower(trim(both '"' from v_claim::text)) = lower(p_role);
  END IF;

  IF jsonb_typeof(v_claim) = 'array' THEN
    FOR v_item IN SELECT jsonb_array_elements_text(v_claim)
    LOOP
      IF lower(v_item) = lower(p_role) THEN
        RETURN TRUE;
      END IF;
    END LOOP;
  END IF;

  RETURN FALSE;
END;
$$;

DROP POLICY IF EXISTS precatorios_admin_select ON public.precatorios;
CREATE POLICY precatorios_admin_select
  ON public.precatorios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND 'admin' = ANY (u.role)
    )
    OR public.jwt_has_role('admin')
  );

DROP POLICY IF EXISTS precatorios_admin_update ON public.precatorios;
CREATE POLICY precatorios_admin_update
  ON public.precatorios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND 'admin' = ANY (u.role)
    )
    OR public.jwt_has_role('admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND 'admin' = ANY (u.role)
    )
    OR public.jwt_has_role('admin')
  );

DROP POLICY IF EXISTS precatorios_admin_delete ON public.precatorios;
CREATE POLICY precatorios_admin_delete
  ON public.precatorios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND 'admin' = ANY (u.role)
    )
    OR public.jwt_has_role('admin')
  );

DROP POLICY IF EXISTS precatorios_block_update_gestor ON public.precatorios;
CREATE POLICY precatorios_block_update_gestor
  ON public.precatorios
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    (NOT public.user_has_role('gestor'))
    OR public.user_has_role('admin')
    OR public.jwt_has_role('admin')
  )
  WITH CHECK (
    (NOT public.user_has_role('gestor'))
    OR public.user_has_role('admin')
    OR public.jwt_has_role('admin')
  );

DROP POLICY IF EXISTS precatorios_block_insert_gestor ON public.precatorios;
CREATE POLICY precatorios_block_insert_gestor
  ON public.precatorios
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    (NOT public.user_has_role('gestor'))
    OR public.user_has_role('admin')
    OR public.jwt_has_role('admin')
  );

DROP POLICY IF EXISTS precatorios_block_delete_gestor ON public.precatorios;
CREATE POLICY precatorios_block_delete_gestor
  ON public.precatorios
  AS RESTRICTIVE
  FOR DELETE
  USING (
    (NOT public.user_has_role('gestor'))
    OR public.user_has_role('admin')
    OR public.jwt_has_role('admin')
  );

COMMIT;
