-- Após criar seu primeiro usuário via interface de login,
-- execute este script para adicioná-lo à tabela usuarios

-- IMPORTANTE: Substitua o email abaixo pelo email que você usou para criar a conta

INSERT INTO usuarios (id, nome, email, role, ativo)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', email) as nome,
  email,
  'admin' as role,
  true as ativo
FROM auth.users
WHERE email = 'SEU_EMAIL_AQUI@example.com'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  updated_at = NOW();
