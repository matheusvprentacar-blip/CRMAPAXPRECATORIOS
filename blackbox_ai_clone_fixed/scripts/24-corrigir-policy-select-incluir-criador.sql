-- Corrige a policy de SELECT para permitir que qualquer usuário veja precatórios que ele criou
-- Além de ver os que ele é responsável (comercial) ou responsável de cálculo

DROP POLICY IF EXISTS "precatorios_select_creator_or_comercial_or_calculo_or_admin" ON public.precatorios;

CREATE POLICY "precatorios_select_creator_or_comercial_or_calculo_or_admin"
ON public.precatorios
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Qualquer usuário vê o que criou
    criado_por = auth.uid()
    -- Operador comercial vê os atribuídos
    OR responsavel = auth.uid()
    -- Operador de cálculo vê os atribuídos
    OR responsavel_calculo_id = auth.uid()
    -- Admin vê tudo
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    -- Operador de cálculo vê fila global (em_calculo e calculado)
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'operador_calculo'
      AND status IN ('em_calculo', 'calculado')
    )
  )
);

-- Aplica mesma lógica na VIEW precatorios_cards (se existir policy separada)
-- Como precatorios_cards é uma VIEW, ela herda as policies da tabela base precatorios
-- Portanto não é necessário criar policy na view
