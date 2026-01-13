-- CORREÇÃO DE POLICIES PARA DELETE/INSERT USANDO FUNÇÕES SEGURAS
-- Substitui consultas diretas à tabela 'usuarios' pelas funções 'current_user_has_role'
-- Isso evita erros de recursão e simplifica a manutenção.

-- 1. Policy de DELETE (Admin)
DROP POLICY IF EXISTS "Admin pode deletar precatorios" ON precatorios;
CREATE POLICY "Admin pode deletar precatorios"
ON precatorios FOR DELETE
TO authenticated
USING (
  public.current_user_has_role('admin')
);

-- 2. Policy de INSERT (Admin, Operador Comercial, Operador)
DROP POLICY IF EXISTS "Operadores podem inserir precatorios" ON precatorios;
CREATE POLICY "Operadores podem inserir precatorios"
ON precatorios FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_has_any_role(ARRAY['admin', 'operador_comercial', 'operador'])
);

-- 3. Policy de SELECT (Admin) - Apenas para reforçar performance
DROP POLICY IF EXISTS "Admin pode ver todos precatorios" ON precatorios;
CREATE POLICY "Admin pode ver todos precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  public.current_user_has_role('admin')
);

-- 4. Policy de UPDATE (Admin)
DROP POLICY IF EXISTS "Admin pode atualizar todos precatorios" ON precatorios;
CREATE POLICY "Admin pode atualizar todos precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  public.current_user_has_role('admin')
);
