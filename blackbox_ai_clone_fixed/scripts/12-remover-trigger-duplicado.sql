-- Remove o trigger que está causando inserção duplicada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Trigger removido com sucesso. Agora apenas o código do app insere usuários.';
END $$;
