-- ============================================
-- FIX RLS COM JWT CLAIMS - VERSÃO CORRIGIDA
-- Remove recursão usando JWT app_metadata.role
-- Apenas para tabelas que EXISTEM no schema
-- ============================================

-- 1. DROP da função problemática is_admin() com CASCADE
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 2. LIMPAR todas as policies antigas das tabelas existentes
DROP POLICY IF EXISTS "usuarios_select_own_or_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_self" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_admin" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem ver todos os outros usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.usuarios;

DROP POLICY IF EXISTS "precatorios_admin_select" ON public.precatorios;
DROP POLICY IF EXISTS "precatorios_operador_comercial_select" ON public.precatorios;
DROP POLICY IF EXISTS "precatorios_operador_calculo_select" ON public.precatorios;
DROP POLICY IF EXISTS "precatorios_insert_ops" ON public.precatorios;
DROP POLICY IF EXISTS "precatorios_admin_update" ON public.precatorios;
DROP POLICY IF EXISTS "precatorios_operador_comercial_update" ON public.precatorios;
DROP POLICY IF EXISTS "precatorios_operador_calculo_update" ON public.precatorios;
DROP POLICY IF EXISTS "precatorios_admin_delete" ON public.precatorios;
DROP POLICY IF EXISTS "Todos podem ver precatórios" ON public.precatorios;
DROP POLICY IF EXISTS "Todos podem criar precatórios" ON public.precatorios;
DROP POLICY IF EXISTS "Todos podem atualizar precatórios" ON public.precatorios;

DROP POLICY IF EXISTS "atividades_select_all" ON public.atividades;
DROP POLICY IF EXISTS "atividades_insert_all" ON public.atividades;
DROP POLICY IF EXISTS "Todos podem ver atividades" ON public.atividades;
DROP POLICY IF EXISTS "Todos podem criar atividades" ON public.atividades;

DROP POLICY IF EXISTS "comentarios_select_all" ON public.comentarios;
DROP POLICY IF EXISTS "comentarios_insert_all" ON public.comentarios;
DROP POLICY IF EXISTS "comentarios_update_own" ON public.comentarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios comentários" ON public.comentarios;
DROP POLICY IF EXISTS "Todos podem ver comentários" ON public.comentarios;
DROP POLICY IF EXISTS "Todos podem criar comentários" ON public.comentarios;

-- ============================================
-- 3. CRIAR POLICIES NOVAS COM JWT (SEM RECURSÃO)
-- ============================================

-- ========== TABELA: usuarios ==========
CREATE POLICY "usuarios_select_jwt"
ON public.usuarios
FOR SELECT
USING (
  -- Ver próprio perfil OU ser admin
  id = auth.uid()
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "usuarios_update_self_jwt"
ON public.usuarios
FOR UPDATE
USING (
  -- Atualizar próprio perfil
  id = auth.uid()
)
WITH CHECK (
  -- Não permitir mudar próprio role (só admin pode)
  id = auth.uid()
  AND (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR role = (SELECT role FROM public.usuarios WHERE id = auth.uid())
  )
);

CREATE POLICY "usuarios_update_admin_jwt"
ON public.usuarios
FOR UPDATE
USING (
  -- Admin pode atualizar qualquer usuário
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "usuarios_insert_jwt"
ON public.usuarios
FOR INSERT
WITH CHECK (
  -- Inserir próprio registro ao criar conta
  id = auth.uid()
);

CREATE POLICY "usuarios_delete_admin_jwt"
ON public.usuarios
FOR DELETE
USING (
  -- Só admin pode deletar
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ========== TABELA: precatorios ==========
-- Admin vê tudo
CREATE POLICY "precatorios_admin_select_jwt"
ON public.precatorios
FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Operador comercial vê apenas seus precatórios
CREATE POLICY "precatorios_operador_comercial_select_jwt"
ON public.precatorios
FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('operador_comercial', 'operador')
  AND dono_usuario_id = auth.uid()
);

-- Operador cálculo vê precatórios atribuídos a ele
CREATE POLICY "precatorios_operador_calculo_select_jwt"
ON public.precatorios
FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'operador_calculo'
  AND responsavel_calculo_id = auth.uid()
);

-- Inserir: admin e operadores comerciais
CREATE POLICY "precatorios_insert_jwt"
ON public.precatorios
FOR INSERT
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operador_comercial', 'operador')
);

-- Update: admin
CREATE POLICY "precatorios_admin_update_jwt"
ON public.precatorios
FOR UPDATE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Update: operador comercial (só seus precatórios)
CREATE POLICY "precatorios_operador_comercial_update_jwt"
ON public.precatorios
FOR UPDATE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('operador_comercial', 'operador')
  AND dono_usuario_id = auth.uid()
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('operador_comercial', 'operador')
  AND dono_usuario_id = auth.uid()
);

-- Update: operador cálculo (só precatórios atribuídos)
CREATE POLICY "precatorios_operador_calculo_update_jwt"
ON public.precatorios
FOR UPDATE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'operador_calculo'
  AND responsavel_calculo_id = auth.uid()
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'operador_calculo'
  AND responsavel_calculo_id = auth.uid()
);

-- Delete: só admin
CREATE POLICY "precatorios_delete_admin_jwt"
ON public.precatorios
FOR DELETE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ========== TABELA: atividades ==========
CREATE POLICY "atividades_select_jwt"
ON public.atividades
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "atividades_insert_jwt"
ON public.atividades
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ========== TABELA: comentarios ==========
CREATE POLICY "comentarios_select_jwt"
ON public.comentarios
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "comentarios_insert_jwt"
ON public.comentarios
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "comentarios_update_own_jwt"
ON public.comentarios
FOR UPDATE
USING (
  usuario_id = auth.uid()
)
WITH CHECK (
  usuario_id = auth.uid()
);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Próximos passos:
-- 1. Configurar app_metadata.role para seus usuários existentes:
--    No Supabase Dashboard > Authentication > Users > Edit user
--    Em "App metadata" adicione: {"role": "admin"}
--    (ou "operador_comercial", "operador_calculo", etc)
--
-- 2. Fazer logout e login no app para recarregar JWT
--
-- 3. Testar permissões!
