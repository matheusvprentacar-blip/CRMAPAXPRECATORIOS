-- Remove todas as policies problemáticas
DROP POLICY IF EXISTS "usuarios_select_self" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_self" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_self" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_admin" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir insert para usuários autenticados" ON public.usuarios;

-- Remove a função que causa recursão
DROP FUNCTION IF EXISTS is_admin();

-- SOLUÇÃO SIMPLES: Permitir que todos os usuários autenticados vejam todos os usuários
-- (Comum em sistemas CRM onde você precisa ver colegas de equipe)

-- SELECT: Qualquer usuário autenticado pode ver todos os usuários
CREATE POLICY "usuarios_select_all"
ON public.usuarios
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Apenas ao criar a própria conta (auth.uid() = id)
CREATE POLICY "usuarios_insert_self"
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Usuário pode atualizar próprio perfil OU se for admin
CREATE POLICY "usuarios_update_own_or_admin"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  (SELECT role FROM public.usuarios WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  auth.uid() = id OR 
  (SELECT role FROM public.usuarios WHERE id = auth.uid()) = 'admin'
);

-- DELETE: Apenas admins (com subquery cuidadosa para evitar recursão)
CREATE POLICY "usuarios_delete_admin_only"
ON public.usuarios
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.usuarios WHERE id = auth.uid()) = 'admin'
);

-- Garantir que RLS está ativo
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
