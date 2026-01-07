-- ============================================
-- VERIFICAR E CONFIGURAR ROLE DO ADMIN
-- ============================================

-- 1. Ver o raw_user_meta_data do seu usuário
SELECT id, email, raw_user_meta_data, raw_app_meta_data 
FROM auth.users 
WHERE email = 'seu-email@example.com'; -- SUBSTITUA pelo seu email

-- 2. Configurar app_metadata com role admin
-- SUBSTITUA 'SEU_UUID_AQUI' pelo UUID que apareceu na query acima
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE id = 'SEU_UUID_AQUI'; -- SUBSTITUA pelo seu UUID

-- 3. Verificar se foi configurado corretamente
SELECT id, email, raw_app_meta_data ->> 'role' as role
FROM auth.users 
WHERE id = 'SEU_UUID_AQUI'; -- SUBSTITUA pelo seu UUID

-- 4. Verificar se a policy está usando o campo correto
-- A policy deve usar (auth.jwt() ->> 'role') ou (auth.jwt() -> 'app_metadata' ->> 'role')
