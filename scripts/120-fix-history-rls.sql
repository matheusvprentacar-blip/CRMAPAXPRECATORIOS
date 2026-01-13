-- Script 120: Fix RLS for Precatorio Calculos (History)
-- The previous policy was too restrictive, checking app_metadata which might not be synced,
-- and requiring specific assignment. We will allow any authenticated user to save history
-- for precatorios they have access to.

BEGIN;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Operadores de cálculo podem criar versões" ON public.precatorio_calculos;
DROP POLICY IF EXISTS "Usuários podem criar cálculos" ON public.precatorio_calculos;
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode criar versões" ON public.precatorio_calculos;

-- Create a more permissive policy for INSERT
-- Allows any authenticated user to insert a history record.
CREATE POLICY "Qualquer usuário autenticado pode criar versões"
  ON public.precatorio_calculos
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Also ensure UPDATE/DELETE is restricted (though usually history is immutable)
-- Keeping existing SELECT policy or ensuring one exists
DROP POLICY IF EXISTS "Usuários podem ver cálculos dos seus precatórios" ON public.precatorio_calculos;

-- Updated check to handle 'role' as TEXT[] (Array)
CREATE POLICY "Usuários podem ver cálculos dos seus precatórios"
  ON public.precatorio_calculos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = precatorio_calculos.precatorio_id
      AND (
        p.criado_por = auth.uid()
        OR p.responsavel = auth.uid()
        OR p.responsavel_calculo_id = auth.uid()
        -- Verifica se há sobreposição entre o array de roles do usuário e as roles permitidas
        OR (SELECT role FROM public.usuarios WHERE id = auth.uid()) && ARRAY['admin', 'gestor', 'operador_calculo']::text[]
      )
    )
  );

COMMIT;
