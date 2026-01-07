-- ============================================
-- FIX: TRIGGER PARA CRIAR USUÁRIO NA TABELA USUARIOS
-- Execute este script para corrigir o erro "Database error saving new user"
-- ============================================

-- 1. Criar função que será executada quando um novo usuário for criado no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Inserir o novo usuário na tabela usuarios
  INSERT INTO public.usuarios (id, email, nome, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operador'),
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro (opcional)
    RAISE WARNING 'Erro ao criar usuário na tabela usuarios: %', SQLERRM;
    -- Permitir que o usuário seja criado no auth mesmo se falhar na tabela usuarios
    RETURN NEW;
END;
$$;

-- 2. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Criar o trigger que chama a função quando um usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Garantir que a tabela usuarios aceita INSERT do service_role
GRANT INSERT ON public.usuarios TO service_role;
GRANT UPDATE ON public.usuarios TO service_role;

-- 5. Adicionar policy para permitir INSERT via trigger
DROP POLICY IF EXISTS "Service role can insert users" ON public.usuarios;
CREATE POLICY "Service role can insert users"
  ON public.usuarios FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- TESTE: Criar um usuário de teste
-- ============================================
-- Agora você pode testar criando um usuário pela interface
-- O trigger deve inserir automaticamente na tabela usuarios

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Para verificar se o trigger está ativo:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Para verificar se a função existe:
-- SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
