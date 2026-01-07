-- Fix ALL RLS policies to remove infinite recursion
-- Remove is_admin() function and its dependencies

-- 1. Drop ALL policies that depend on is_admin()
DROP POLICY IF EXISTS "Admin full access propostas" ON propostas;
DROP POLICY IF EXISTS "Admin full access notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Admin pode ver todos usuarios" ON usuarios;
DROP POLICY IF EXISTS "Admin pode editar todos usuarios" ON usuarios;
DROP POLICY IF EXISTS "Admin pode deletar usuarios" ON usuarios;

-- 2. Drop ALL existing policies on usuarios
DROP POLICY IF EXISTS "Usuario pode ver proprios dados" ON usuarios;
DROP POLICY IF EXISTS "Usuario pode editar proprios dados" ON usuarios;
DROP POLICY IF EXISTS "Permitir insert" ON usuarios;
DROP POLICY IF EXISTS "Permitir insert proprio usuario" ON usuarios;
DROP POLICY IF EXISTS "Self insert" ON usuarios;

-- 3. Now we can safely drop the function
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- 4. Create NEW simple policies for USUARIOS (no recursion)
-- Everyone authenticated can see all users (common in CRM systems)
CREATE POLICY "Usuarios autenticados veem todos"
ON usuarios
FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own data OR if they have admin role
CREATE POLICY "Usuario atualiza proprio perfil"
ON usuarios
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Admin-specific update policy (checks role directly, no function call)
CREATE POLICY "Admin atualiza qualquer usuario"
ON usuarios
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow insert for authenticated users
CREATE POLICY "Permitir insert de usuarios"
ON usuarios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin can delete users
CREATE POLICY "Admin deleta usuarios"
ON usuarios
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. Recreate simple policies for PROPOSTAS
DROP POLICY IF EXISTS "Usuarios veem propostas" ON propostas;
DROP POLICY IF EXISTS "Usuario cria propostas" ON propostas;
DROP POLICY IF EXISTS "Usuario atualiza propostas" ON propostas;

-- Everyone sees all proposals
CREATE POLICY "Todos veem propostas"
ON propostas
FOR SELECT
TO authenticated
USING (true);

-- Everyone can create proposals
CREATE POLICY "Criar propostas"
ON propostas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users with admin role OR creator can update
CREATE POLICY "Atualizar propostas"
ON propostas
FOR UPDATE
TO authenticated
USING (
  criado_por = auth.uid() OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admin can delete
CREATE POLICY "Admin deleta propostas"
ON propostas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 6. Recreate simple policies for NOTIFICACOES
DROP POLICY IF EXISTS "Usuario ve proprias notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Criar notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Marcar como lida" ON notificacoes;

-- Users see their own notifications OR admin sees all
CREATE POLICY "Ver notificacoes"
ON notificacoes
FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Anyone can create notifications
CREATE POLICY "Criar notificacoes"
ON notificacoes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update their own notifications
CREATE POLICY "Atualizar proprias notificacoes"
ON notificacoes
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid());

-- Admin can delete any notification
CREATE POLICY "Admin deleta notificacoes"
ON notificacoes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('usuarios', 'propostas', 'notificacoes')
ORDER BY tablename, policyname;
