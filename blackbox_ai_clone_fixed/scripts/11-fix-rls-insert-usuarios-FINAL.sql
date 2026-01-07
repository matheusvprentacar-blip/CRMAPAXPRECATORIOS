-- ============================================
-- FIX DEFINITIVO: RLS POLICY PARA INSERT EM USUARIOS
-- ============================================
-- Problema: erro 42501 "new row violates row-level security policy"
-- Causa: tabela usuarios tem RLS ativo mas sem policy de INSERT
-- Solução: criar policy permitindo insert do próprio registro + trigger com SECURITY DEFINER
-- ============================================

-- 1. CRIAR POLICY PARA PERMITIR INSERT DO PRÓPRIO REGISTRO
-- (usuário pode inserir apenas se id = auth.uid())
DROP POLICY IF EXISTS "usuarios_insert_self" ON public.usuarios;
CREATE POLICY "usuarios_insert_self"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. CRIAR POLICY PARA ADMIN INSERIR QUALQUER USUÁRIO
-- (admin pode inserir qualquer registro via backend com service_role)
DROP POLICY IF EXISTS "usuarios_insert_admin" ON public.usuarios;
CREATE POLICY "usuarios_insert_admin"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- 3. CRIAR/RECRIAR TRIGGER COM SECURITY DEFINER
-- (garante que o trigger execute com permissões elevadas)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- <-- CRUCIAL: executa com permissões do owner (postgres)
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operador_comercial'),
    true
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error mas não bloqueia a criação do usuário
  RAISE WARNING 'Erro ao criar registro em usuarios: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. GARANTIR PERMISSÕES CORRETAS
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.usuarios TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.usuarios TO authenticated;

-- ============================================
-- TESTE MANUAL (opcional)
-- ============================================
-- Para testar se está funcionando:
-- 1. Vá em Authentication > Users > Add User
-- 2. Crie um novo usuário com email teste@teste.com
-- 3. Verifique se foi criado automaticamente em public.usuarios
-- ============================================

-- ============================================
-- EXPLICAÇÃO TÉCNICA
-- ============================================
-- WITH CHECK no INSERT valida a linha NOVA antes de inserir
-- auth.uid() = id: permite que o usuário insira apenas SUA própria linha
-- SECURITY DEFINER: faz o trigger rodar com permissões do dono (postgres)
--   bypassa RLS de forma segura apenas durante a execução do trigger
-- ============================================
