BEGIN;

CREATE OR REPLACE FUNCTION public.user_is_operador_calculo(p_user_id UUID DEFAULT auth.uid())
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
      AND 'operador_calculo' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
  );
$$;

DROP POLICY IF EXISTS precatorios_operador_calculo_scope_select ON public.precatorios;
CREATE POLICY precatorios_operador_calculo_scope_select
  ON public.precatorios
  FOR SELECT
  TO authenticated
  USING (
    (public.user_is_operador_calculo() OR public.jwt_has_role('operador_calculo'))
    AND COALESCE(NULLIF(status_kanban, ''), NULLIF(localizacao_kanban, ''), NULLIF(status, '')) IN (
      'fila_calculo',
      'pronto_calculo',
      'calculo_andamento',
      'em_calculo',
      'calculo_concluido',
      'calculado'
    )
  );

DROP POLICY IF EXISTS precatorios_operador_calculo_scope_update ON public.precatorios;
CREATE POLICY precatorios_operador_calculo_scope_update
  ON public.precatorios
  FOR UPDATE
  TO authenticated
  USING (
    (public.user_is_operador_calculo() OR public.jwt_has_role('operador_calculo'))
    AND COALESCE(NULLIF(status_kanban, ''), NULLIF(localizacao_kanban, ''), NULLIF(status, '')) IN (
      'fila_calculo',
      'pronto_calculo',
      'calculo_andamento',
      'em_calculo',
      'calculo_concluido',
      'calculado'
    )
  )
  WITH CHECK (
    (public.user_is_operador_calculo() OR public.jwt_has_role('operador_calculo'))
    AND COALESCE(NULLIF(status_kanban, ''), NULLIF(localizacao_kanban, ''), NULLIF(status, '')) IN (
      'triagem_interesse',
      'fila_calculo',
      'pronto_calculo',
      'calculo_andamento',
      'em_calculo',
      'calculo_concluido',
      'calculado'
    )
  );

COMMENT ON POLICY precatorios_operador_calculo_scope_select ON public.precatorios IS
  'Permite que operador_calculo visualize todos os creditos no escopo da fila de calculo.';

COMMENT ON POLICY precatorios_operador_calculo_scope_update ON public.precatorios IS
  'Permite que operador_calculo atualize creditos do escopo de calculo, incluindo andamento, conclusao e retorno para triagem.';

GRANT EXECUTE ON FUNCTION public.user_is_operador_calculo(UUID) TO authenticated;

COMMIT;
