-- Adicionar coluna de responsável jurídico se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'precatorios' AND column_name = 'responsavel_juridico_id') THEN
        ALTER TABLE precatorios ADD COLUMN responsavel_juridico_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- ATUALIZAR RLS
ALTER TABLE precatorios ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas permissivas
DROP POLICY IF EXISTS "Admin pode ver todos precatorios" ON precatorios;
DROP POLICY IF EXISTS "Operadores podem inserir precatorios" ON precatorios;
DROP POLICY IF EXISTS "Admin pode atualizar todos precatorios" ON precatorios;
DROP POLICY IF EXISTS "Admin pode deletar precatorios" ON precatorios;
DROP POLICY IF EXISTS "Admin tem acesso total" ON precatorios;
DROP POLICY IF EXISTS "Comercial ve apenas seus" ON precatorios;

-- 1. ADMIN (Acesso Total)
CREATE POLICY "Admin tem acesso total" 
ON precatorios 
FOR ALL 
TO authenticated 
USING (public.current_user_has_role('admin'));

-- 2. OPERADOR COMERCIAL (Extremamente restrito)
CREATE POLICY "Comercial ve apenas seus" 
ON precatorios 
FOR SELECT 
TO authenticated 
USING (
  public.current_user_has_role('operador_comercial') 
  AND responsavel = auth.uid()
);

CREATE POLICY "Comercial insere seus" 
ON precatorios 
FOR INSERT 
TO authenticated 
WITH CHECK (
  public.current_user_has_role('operador_comercial') 
  AND responsavel = auth.uid()
);

CREATE POLICY "Comercial atualiza seus" 
ON precatorios 
FOR UPDATE 
TO authenticated 
USING (
  public.current_user_has_role('operador_comercial') 
  AND responsavel = auth.uid()
);

-- 3. JURIDICO (Vê seus e unassigned na coluna juridico?)
-- User disse "kanban proprio", entao restrito a atribuição.
CREATE POLICY "Juridico ve apenas seus" 
ON precatorios 
FOR SELECT 
TO authenticated 
USING (
  public.current_user_has_role('juridico') 
  AND responsavel_juridico_id = auth.uid()
);

CREATE POLICY "Juridico atualiza seus" 
ON precatorios 
FOR UPDATE 
TO authenticated 
USING (
  public.current_user_has_role('juridico') 
  AND responsavel_juridico_id = auth.uid()
);

-- 4. GESTOR CERTIDOES
-- Precisa ver todos na fase 'certidoes' para a página de Gestão funcionar e poder visualizar/editar.
-- Mas no Kanban vai ser filtrado pelo Front para ver só os dele.
CREATE POLICY "Gestor Certidoes ve pool e seus" 
ON precatorios 
FOR SELECT 
TO authenticated 
USING (
  public.current_user_has_role('gestor_certidoes') 
  AND (
    responsavel_certidoes_id = auth.uid() 
    OR status_kanban = 'certidoes'
  )
);

CREATE POLICY "Gestor Certidoes atualiza pool e seus" 
ON precatorios 
FOR UPDATE 
TO authenticated 
USING (
  public.current_user_has_role('gestor_certidoes') 
  AND (
    responsavel_certidoes_id = auth.uid() 
    OR status_kanban = 'certidoes'
  )
);

-- 5. OPERADOR CALCULO
CREATE POLICY "Operador Calculo ve apenas seus" 
ON precatorios 
FOR SELECT 
TO authenticated 
USING (
  public.current_user_has_role('operador_calculo') 
  AND responsavel_calculo_id = auth.uid()
);

CREATE POLICY "Operador Calculo atualiza seus" 
ON precatorios 
FOR UPDATE 
TO authenticated 
USING (
  public.current_user_has_role('operador_calculo') 
  AND responsavel_calculo_id = auth.uid()
);
