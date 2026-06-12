BEGIN;

-- Permite que o perfil `analista` execute a Analise Processual sem ser admin.
-- O escopo cobre os creditos parados na coluna "Pre-analise juridica" do kanban,
-- que agrupa os status 'analise_processual_inicial', 'juridico' e 'analise_juridica'
-- (ver app/(dashboard)/kanban/columns.ts -> statusIds e o handler de drag).
-- Espelha o padrao usado para `operador_calculo` na migration 248.

CREATE OR REPLACE FUNCTION public.user_is_analista(p_user_id UUID DEFAULT auth.uid())
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
      AND 'analista' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
  );
$$;

DROP POLICY IF EXISTS precatorios_analista_scope_select ON public.precatorios;
CREATE POLICY precatorios_analista_scope_select
  ON public.precatorios
  FOR SELECT
  TO authenticated
  USING (
    (public.user_is_analista() OR public.jwt_has_role('analista'))
    AND COALESCE(NULLIF(status_kanban, ''), NULLIF(localizacao_kanban, ''), NULLIF(status, '')) IN (
      'analise_processual_inicial',
      'juridico',
      'analise_juridica'
    )
  );

DROP POLICY IF EXISTS precatorios_analista_scope_update ON public.precatorios;
CREATE POLICY precatorios_analista_scope_update
  ON public.precatorios
  FOR UPDATE
  TO authenticated
  USING (
    (public.user_is_analista() OR public.jwt_has_role('analista'))
    AND COALESCE(NULLIF(status_kanban, ''), NULLIF(localizacao_kanban, ''), NULLIF(status, '')) IN (
      'analise_processual_inicial',
      'juridico',
      'analise_juridica'
    )
  )
  WITH CHECK (
    (public.user_is_analista() OR public.jwt_has_role('analista'))
    AND COALESCE(NULLIF(status_kanban, ''), NULLIF(localizacao_kanban, ''), NULLIF(status, '')) IN (
      'analise_processual_inicial',
      'juridico',
      'analise_juridica'
    )
  );

COMMENT ON POLICY precatorios_analista_scope_select ON public.precatorios IS
  'Permite que analista visualize os creditos parados na fila de analise processual.';

COMMENT ON POLICY precatorios_analista_scope_update ON public.precatorios IS
  'Permite que analista registre o parecer da analise processual (campos analise_*) sem alterar o status do credito.';

GRANT EXECUTE ON FUNCTION public.user_is_analista(UUID) TO authenticated;

COMMIT;
