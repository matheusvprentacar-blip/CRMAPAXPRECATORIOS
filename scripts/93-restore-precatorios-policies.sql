-- URGENTE: Recriar policies principais da tabela precatorios
-- Este script restaura todas as policies essenciais usando sintaxe de ARRAY
-- Adicionado DROP IF EXISTS para evitar conflitos

-- 1. Admin pode ver tudo
DROP POLICY IF EXISTS "Admin pode ver todos precatorios" ON precatorios;
CREATE POLICY "Admin pode ver todos precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'admin' = ANY(usuarios.role)
  )
);

-- 2. Admin pode atualizar tudo
DROP POLICY IF EXISTS "Admin pode atualizar todos precatorios" ON precatorios;
CREATE POLICY "Admin pode atualizar todos precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'admin' = ANY(usuarios.role)
  )
);

-- 3. Operador comercial pode ver seus precatórios
DROP POLICY IF EXISTS "Operador comercial pode ver seus precatorios" ON precatorios;
CREATE POLICY "Operador comercial pode ver seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'operador_comercial' = ANY(usuarios.role)
    AND (precatorios.responsavel = auth.uid() OR precatorios.criado_por = auth.uid())
  )
);

-- 4. Operador comercial pode atualizar seus precatórios
DROP POLICY IF EXISTS "Operador comercial pode atualizar seus precatorios" ON precatorios;
CREATE POLICY "Operador comercial pode atualizar seus precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'operador_comercial' = ANY(usuarios.role)
    AND (precatorios.responsavel = auth.uid() OR precatorios.criado_por = auth.uid())
  )
);

-- 5. Operador cálculo pode ver precatórios atribuídos
DROP POLICY IF EXISTS "Operador calculo pode ver seus precatorios" ON precatorios;
CREATE POLICY "Operador calculo pode ver seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'operador_calculo' = ANY(usuarios.role)
    AND precatorios.responsavel_calculo_id = auth.uid()
  )
);

-- 6. Operador cálculo pode atualizar precatórios atribuídos
DROP POLICY IF EXISTS "Operador calculo pode atualizar seus precatorios" ON precatorios;
CREATE POLICY "Operador calculo pode atualizar seus precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'operador_calculo' = ANY(usuarios.role)
    AND precatorios.responsavel_calculo_id = auth.uid()
  )
);

-- 7. Gestor de Certidões pode ver seus precatórios atribuídos
DROP POLICY IF EXISTS "Gestor certidoes pode ver seus precatorios" ON precatorios;
CREATE POLICY "Gestor certidoes pode ver seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_certidoes' = ANY(usuarios.role)
    AND precatorios.responsavel_certidoes_id = auth.uid()
  )
);

-- 8. Gestor de Certidões pode atualizar seus precatórios atribuídos
DROP POLICY IF EXISTS "Gestor certidoes pode atualizar seus precatorios" ON precatorios;
CREATE POLICY "Gestor certidoes pode atualizar seus precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_certidoes' = ANY(usuarios.role)
    AND precatorios.responsavel_certidoes_id = auth.uid()
  )
);

-- 9. Gestor de Ofício pode ver seus precatórios atribuídos
DROP POLICY IF EXISTS "Gestor oficio pode ver seus precatorios" ON precatorios;
CREATE POLICY "Gestor oficio pode ver seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_oficio' = ANY(usuarios.role)
    AND precatorios.responsavel_oficio_id = auth.uid()
  )
);

-- 10. Gestor de Ofício pode atualizar seus precatórios atribuídos
DROP POLICY IF EXISTS "Gestor oficio pode atualizar seus precatorios" ON precatorios;
CREATE POLICY "Gestor oficio pode atualizar seus precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_oficio' = ANY(usuarios.role)
    AND precatorios.responsavel_oficio_id = auth.uid()
  )
);

-- 11. Operadores (geral) podem inserir precatórios
DROP POLICY IF EXISTS "Operadores podem inserir precatorios" ON precatorios;
CREATE POLICY "Operadores podem inserir precatorios"
ON precatorios FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND (
      'admin' = ANY(usuarios.role) OR
      'operador_comercial' = ANY(usuarios.role) OR
      'operador' = ANY(usuarios.role)
    )
  )
);

-- 12. Admin pode deletar
DROP POLICY IF EXISTS "Admin pode deletar precatorios" ON precatorios;
CREATE POLICY "Admin pode deletar precatorios"
ON precatorios FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'admin' = ANY(usuarios.role)
  )
);

-- Verificar policies criadas
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'precatorios'
ORDER BY policyname;
