-- Add 'gestor_oficio' to the allowed roles for SELECT on precatorios
-- This ensures the "Gestão de Ofícios" page works correctly

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
    'gestor_oficio',
    'analista'
  ])
);
