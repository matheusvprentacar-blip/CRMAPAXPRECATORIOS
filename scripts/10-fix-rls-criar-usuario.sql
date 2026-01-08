-- =====================================================
-- FIX DEFINITIVO: RLS para Criação de Usuários
-- =====================================================
-- Este script corrige o erro de RLS que impede a criação de usuários

-- 1. Recriar a função do trigger com SECURITY DEFINER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- Executa com permissões do owner (postgres)
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insere o novo usuário na tabela usuarios
  INSERT INTO public.usuarios (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operador_comercial')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas não impede criação do usuário auth
    RAISE WARNING 'Erro ao inserir usuário na tabela usuarios: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Adicionar policy específica para permitir inserção durante signup
DROP POLICY IF EXISTS "Allow service role to insert users" ON usuarios;

CREATE POLICY "Allow service role to insert users"
ON usuarios
FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = id);

-- 4. Garantir que admin pode inserir qualquer usuário
DROP POLICY IF EXISTS "Admins can insert any user" ON usuarios;

CREATE POLICY "Admins can insert any user"
ON usuarios
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.role = 'admin'
  )
);

-- 5. Confirmar que RLS está ativo
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ RLS corrigido! Agora você pode criar usuários normalmente.';
END $$;
