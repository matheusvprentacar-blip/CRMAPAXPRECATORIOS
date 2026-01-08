-- =====================================================
-- SOLUÇÃO: Tornar seu usuário ADMIN
-- =====================================================
-- Problema: Você não tem permissão para deletar o documento
-- Solução: Tornar você admin temporariamente

-- 1. Ver todos os usuários
SELECT 
  id,
  nome,
  email,
  role,
  ativo
FROM public.usuarios
ORDER BY created_at DESC;

-- 2. ESCOLHA SEU USUÁRIO e execute este UPDATE:
-- SUBSTITUA 'SEU-EMAIL-AQUI' pelo seu email

UPDATE public.usuarios
SET role = 'admin'
WHERE email = 'SEU-EMAIL-AQUI';  -- ← COLOQUE SEU EMAIL AQUI

-- 3. Verificar se funcionou
SELECT 
  id,
  nome,
  email,
  role
FROM public.usuarios
WHERE email = 'SEU-EMAIL-AQUI';  -- ← COLOQUE SEU EMAIL AQUI

-- =====================================================
-- DEPOIS DE EXECUTAR:
-- =====================================================
-- 1. Faça LOGOUT da aplicação
-- 2. Faça LOGIN novamente
-- 3. Tente remover o documento
-- 4. Deve funcionar agora!
-- =====================================================

-- =====================================================
-- ALTERNATIVA: Se não souber seu email
-- =====================================================
-- Execute apenas a Query 1 acima para ver todos os usuários
-- Encontre seu usuário na lista
-- Copie o email
-- Execute o UPDATE com seu email
-- =====================================================
