-- ==========================================
-- SCRIPT DEFINITIVO: RLS baseado em JWT claims
-- ==========================================
-- Remove recursão usando app_metadata.role do JWT
-- em vez de consultar a tabela usuarios

BEGIN;

-- 1. LISTAR POLICIES EXISTENTES (para debug)
SELECT 
  tablename, 
  policyname, 
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('usuarios', 'propostas', 'notificacoes')
ORDER BY tablename, policyname;

-- 2. REMOVER TODAS AS POLICIES EXISTENTES
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('usuarios', 'propostas', 'notificacoes')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. REMOVER FUNÇÃO is_admin() COM CASCADE
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;

-- 4. GARANTIR QUE RLS ESTÁ ATIVO
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLICIES PARA TABELA USUARIOS
-- ==========================================

-- SELECT: Ver próprio perfil OU ser admin
CREATE POLICY "usuarios_select_own_or_admin"
ON public.usuarios
FOR SELECT
USING (
  id = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- INSERT: Criar próprio perfil (self-registration)
CREATE POLICY "usuarios_insert_own"
ON public.usuarios
FOR INSERT
WITH CHECK (id = auth.uid());

-- UPDATE: Editar próprio perfil OU ser admin
CREATE POLICY "usuarios_update_own_or_admin"
ON public.usuarios
FOR UPDATE
USING (
  id = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  id = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- DELETE: Apenas admin pode deletar
CREATE POLICY "usuarios_delete_admin_only"
ON public.usuarios
FOR DELETE
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ==========================================
-- POLICIES PARA TABELA PROPOSTAS
-- ==========================================

-- SELECT: Ver próprias propostas OU ser admin
CREATE POLICY "propostas_select_own_or_admin"
ON public.propostas
FOR SELECT
USING (
  criado_por = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- INSERT: Criar propostas (usuários autenticados)
CREATE POLICY "propostas_insert_authenticated"
ON public.propostas
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Editar próprias propostas OU ser admin
CREATE POLICY "propostas_update_own_or_admin"
ON public.propostas
FOR UPDATE
USING (
  criado_por = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  criado_por = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- DELETE: Apenas admin pode deletar
CREATE POLICY "propostas_delete_admin_only"
ON public.propostas
FOR DELETE
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ==========================================
-- POLICIES PARA TABELA NOTIFICACOES
-- ==========================================

-- SELECT: Ver próprias notificações OU ser admin
CREATE POLICY "notificacoes_select_own_or_admin"
ON public.notificacoes
FOR SELECT
USING (
  usuario_id = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- INSERT: Apenas admin cria notificações
CREATE POLICY "notificacoes_insert_admin_only"
ON public.notificacoes
FOR INSERT
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- UPDATE: Editar próprias notificações OU ser admin
CREATE POLICY "notificacoes_update_own_or_admin"
ON public.notificacoes
FOR UPDATE
USING (
  usuario_id = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  usuario_id = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- DELETE: Apenas admin pode deletar
CREATE POLICY "notificacoes_delete_admin_only"
ON public.notificacoes
FOR DELETE
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

COMMIT;

-- ==========================================
-- VERIFICAR POLICIES CRIADAS
-- ==========================================
SELECT 
  tablename, 
  policyname, 
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('usuarios', 'propostas', 'notificacoes')
ORDER BY tablename, policyname;
