-- Remove TODAS as policies existentes das tabelas principais
DROP POLICY IF EXISTS "usuarios_select_all" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_own" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem ver todos" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Admin full access propostas" ON public.propostas;
DROP POLICY IF EXISTS "Admin full access notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "usuarios: inserir o proprio registro" ON public.usuarios;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.usuarios;

-- Remove a função is_admin() com CASCADE (remove policies dependentes automaticamente)
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- ==============================================
-- POLICIES PARA USUARIOS (simples, sem recursão)
-- ==============================================

-- SELECT: Todos autenticados podem ver todos os usuários
CREATE POLICY "usuarios_select_all"
ON public.usuarios
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Qualquer autenticado pode inserir (necessário para signup)
CREATE POLICY "usuarios_insert_any"
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Só pode atualizar o próprio perfil
CREATE POLICY "usuarios_update_own"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- DELETE: Só pode deletar o próprio perfil
CREATE POLICY "usuarios_delete_own"
ON public.usuarios
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- ==============================================
-- POLICIES PARA PROPOSTAS (simples)
-- ==============================================

-- SELECT: Todos autenticados podem ver todas as propostas
CREATE POLICY "propostas_select_all"
ON public.propostas
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Todos autenticados podem criar propostas
CREATE POLICY "propostas_insert_any"
ON public.propostas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Todos autenticados podem atualizar qualquer proposta
CREATE POLICY "propostas_update_all"
ON public.propostas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Todos autenticados podem deletar propostas
CREATE POLICY "propostas_delete_all"
ON public.propostas
FOR DELETE
TO authenticated
USING (true);

-- ==============================================
-- POLICIES PARA NOTIFICACOES (simples)
-- ==============================================

-- SELECT: Ver só as próprias notificações
CREATE POLICY "notificacoes_select_own"
ON public.notificacoes
FOR SELECT
TO authenticated
USING (auth.uid() = usuario_id);

-- INSERT: Qualquer um pode criar notificações
CREATE POLICY "notificacoes_insert_any"
ON public.notificacoes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Só pode atualizar as próprias notificações
CREATE POLICY "notificacoes_update_own"
ON public.notificacoes
FOR UPDATE
TO authenticated
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

-- DELETE: Só pode deletar as próprias notificações
CREATE POLICY "notificacoes_delete_own"
ON public.notificacoes
FOR DELETE
TO authenticated
USING (auth.uid() = usuario_id);
