-- ============================================
-- RESET COMPLETO - VOLTAR AO SCHEMA ORIGINAL
-- ============================================
-- Este script remove todas as policies e funções problemáticas
-- e recria as policies originais do schema sem recursão

-- ============================================
-- 1. REMOVER TODAS AS POLICIES ANTIGAS
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Remover policies de usuarios
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='usuarios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usuarios CASCADE;', r.policyname);
  END LOOP;
  
  -- Remover policies de precatorios
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='precatorios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.precatorios CASCADE;', r.policyname);
  END LOOP;
  
  -- Remover policies de atividades
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='atividades'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.atividades CASCADE;', r.policyname);
  END LOOP;
  
  -- Remover policies de comentarios
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='comentarios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.comentarios CASCADE;', r.policyname);
  END LOOP;
END $$;

-- ============================================
-- 2. REMOVER FUNÇÕES PROBLEMÁTICAS
-- ============================================

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

-- ============================================
-- 3. GARANTIR QUE RLS ESTÁ ATIVO
-- ============================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RECRIAR POLICIES ORIGINAIS (SEM RECURSÃO)
-- ============================================

-- USUARIOS: Ver todos (necessário para lista de responsáveis, etc)
CREATE POLICY usuarios_select_all
  ON public.usuarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- USUARIOS: Qualquer usuário pode atualizar apenas o próprio perfil
CREATE POLICY usuarios_update_self
  ON public.usuarios FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- USUARIOS: Inserir apenas o próprio perfil (para registro inicial)
CREATE POLICY usuarios_insert_self
  ON public.usuarios FOR INSERT
  WITH CHECK (id = auth.uid());

-- PRECATORIOS: Admin vê tudo
CREATE POLICY precatorios_admin_select
  ON public.precatorios FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

-- PRECATORIOS: Operador comercial vê apenas os seus
CREATE POLICY precatorios_operador_comercial_select
  ON public.precatorios FOR SELECT
  USING (
    (auth.jwt() ->> 'role') IN ('operador_comercial', 'operador')
    AND dono_usuario_id = auth.uid()
  );

-- PRECATORIOS: Operador cálculo vê apenas onde é responsável
CREATE POLICY precatorios_operador_calculo_select
  ON public.precatorios FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'operador_calculo'
    AND responsavel_calculo_id = auth.uid()
  );

-- PRECATORIOS: Inserir (admin e operadores comerciais)
CREATE POLICY precatorios_insert_ops
  ON public.precatorios FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'operador_comercial', 'operador')
  );

-- PRECATORIOS: Admin atualiza tudo
CREATE POLICY precatorios_admin_update
  ON public.precatorios FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- PRECATORIOS: Operador comercial atualiza apenas os seus
CREATE POLICY precatorios_operador_comercial_update
  ON public.precatorios FOR UPDATE
  USING (
    (auth.jwt() ->> 'role') IN ('operador_comercial', 'operador')
    AND dono_usuario_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('operador_comercial', 'operador')
    AND dono_usuario_id = auth.uid()
  );

-- PRECATORIOS: Operador cálculo atualiza apenas onde é responsável
CREATE POLICY precatorios_operador_calculo_update
  ON public.precatorios FOR UPDATE
  USING (
    (auth.jwt() ->> 'role') = 'operador_calculo'
    AND responsavel_calculo_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'operador_calculo'
    AND responsavel_calculo_id = auth.uid()
  );

-- PRECATORIOS: Apenas admin pode deletar
CREATE POLICY precatorios_admin_delete
  ON public.precatorios FOR DELETE
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ATIVIDADES: Todos autenticados podem ver e criar
CREATE POLICY atividades_select_all
  ON public.atividades FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY atividades_insert_all
  ON public.atividades FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- COMENTARIOS: Todos autenticados podem ver e criar
CREATE POLICY comentarios_select_all
  ON public.comentarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY comentarios_insert_all
  ON public.comentarios FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- COMENTARIOS: Apenas dono pode atualizar
CREATE POLICY comentarios_update_own
  ON public.comentarios FOR UPDATE
  USING (auth.uid() = usuario_id);

-- ============================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar policies criadas
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public' 
  AND tablename IN ('usuarios', 'precatorios', 'atividades', 'comentarios')
ORDER BY tablename, policyname;

-- ============================================
-- RESET COMPLETO
-- ============================================
-- Próximos passos:
-- 1. Configure o role no JWT via Supabase Dashboard:
--    - Authentication → Users → Selecione seu usuário
--    - User Metadata → Raw User Meta Data
--    - Adicione: {"role": "admin"}
-- 2. Faça logout e login para renovar o JWT
-- 3. Teste o acesso aos usuários
