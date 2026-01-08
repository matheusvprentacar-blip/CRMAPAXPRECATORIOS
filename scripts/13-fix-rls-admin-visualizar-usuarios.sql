-- Remove policies antigas que podem estar bloqueando
DROP POLICY IF EXISTS "usuarios: visualizar próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: visualizar apenas próprio registro" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: select próprio" ON public.usuarios;

-- Policy para usuários visualizarem o próprio perfil
CREATE POLICY "usuarios_select_own"
ON public.usuarios
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy para admins visualizarem todos os usuários
CREATE POLICY "usuarios_select_admin"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy para admins atualizarem qualquer usuário
DROP POLICY IF EXISTS "usuarios_update_admin" ON public.usuarios;
CREATE POLICY "usuarios_update_admin"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy para usuários atualizarem apenas o próprio perfil
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
CREATE POLICY "usuarios_update_own"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
