-- =====================================================
-- VERIFICAR E CORRIGIR USUÁRIO ADMIN
-- =====================================================

-- 1. Ver todos os usuários
SELECT 
  id,
  nome,
  email,
  role,
  ativo,
  created_at
FROM public.usuarios
ORDER BY created_at DESC;

-- 2. Verificar especificamente o Arnaldo
SELECT 
  id,
  nome,
  email,
  role,
  ativo
FROM public.usuarios
WHERE email = 'arnaldo.engenhar@gmail.com';

-- 3. Se o Arnaldo NÃO aparecer, significa que ele não está na tabela usuarios
-- Nesse caso, precisamos criar o registro

-- 4. Buscar o ID do usuário no auth.users
SELECT 
  id,
  email,
  created_at,
  raw_app_meta_data,
  raw_user_meta_data
FROM auth.users
WHERE email = 'arnaldo.engenhar@gmail.com';

-- =====================================================
-- SE O ARNALDO NÃO ESTIVER NA TABELA USUARIOS:
-- =====================================================
-- Copie o ID do auth.users e execute:

-- INSERT INTO public.usuarios (id, nome, email, role, ativo)
-- VALUES (
--   'COLE-O-ID-AQUI',
--   'Arnaldo',
--   'arnaldo.engenhar@gmail.com',
--   'admin',
--   true
-- );

-- =====================================================
-- SE O ARNALDO JÁ ESTIVER NA TABELA USUARIOS:
-- =====================================================
-- Mas não é admin, execute:

-- UPDATE public.usuarios
-- SET role = 'admin'
-- WHERE email = 'arnaldo.engenhar@gmail.com';

-- =====================================================
-- DEPOIS DE EXECUTAR:
-- =====================================================
-- 1. Faça LOGOUT da aplicação
-- 2. Faça LOGIN novamente
-- 3. Teste remover documento
-- 4. Deve funcionar!
-- =====================================================
