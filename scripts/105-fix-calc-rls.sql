-- Fix RLS: Ensure operators can SEE precatorios
-- Previously, policies might have been too restrictive or missing for SELECT

-- 1. Ensure 'precatorios' table allows SELECT for relevant roles
DROP POLICY IF EXISTS "Operadores podem ver precatorios" ON precatorios;

CREATE POLICY "Operadores podem ver precatorios" ON precatorios
FOR SELECT TO authenticated
USING (
  public.current_user_has_any_role(ARRAY[
    'admin', 
    'operador_comercial', 
    'operador_calculo', 
    'operador', 
    'juridico', 
    'gestor',
    'gestor_certidoes',
    'analista'
  ])
);

-- 2. Grant usage on implicit sequences if any (standard safety)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
