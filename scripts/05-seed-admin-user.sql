-- ============================================
-- SEED: Criar usuário admin padrão para testes
-- ============================================

-- Inserir usuário admin na tabela usuarios
-- Nota: Este script cria o perfil do usuário. 
-- Para criar a autenticação completa, você precisa:
-- 1. Ir ao Supabase Dashboard > Authentication > Users
-- 2. Clicar em "Add User"
-- 3. Usar: Email: admin@test.com | Password: Admin@123
-- 4. Após criar, copiar o UUID gerado e atualizar o INSERT abaixo

-- Opção 1: Se você já criou o usuário no Auth e tem o UUID
-- Substitua 'SEU-UUID-AQUI' pelo UUID do usuário criado no Auth
/*
INSERT INTO public.usuarios (id, email, nome, role, created_at)
VALUES (
  'SEU-UUID-AQUI',
  'admin@test.com',
  'Administrador do Sistema',
  'admin',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  nome = 'Administrador do Sistema';
*/

-- Opção 2: Criar usuários de exemplo para desenvolvimento
-- Estes terão IDs aleatórios e precisam ser criados no Auth depois
INSERT INTO public.usuarios (id, email, nome, role, telefone, created_at)
VALUES 
  (
    gen_random_uuid(),
    'operador.comercial@test.com',
    'João Silva',
    'operador_comercial',
    '(11) 98765-4321',
    NOW()
  ),
  (
    gen_random_uuid(),
    'operador.calculo@test.com',
    'Maria Santos',
    'operador_calculo',
    '(11) 98765-4322',
    NOW()
  )
ON CONFLICT (email) DO NOTHING;

-- Instruções para criar usuário admin completo:
-- 
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em Authentication > Users > Add User
-- 3. Preencha:
--    Email: admin@test.com
--    Password: Admin@123
--    Confirm Email: Sim
-- 4. Após criar, copie o UUID gerado
-- 5. Execute este comando substituindo o UUID:
--    INSERT INTO public.usuarios (id, email, nome, role, created_at)
--    VALUES ('UUID-AQUI', 'admin@test.com', 'Admin', 'admin', NOW())
--    ON CONFLICT (id) DO UPDATE SET role = 'admin';
