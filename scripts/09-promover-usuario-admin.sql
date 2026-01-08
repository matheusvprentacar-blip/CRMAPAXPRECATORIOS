-- Script para promover um usuário para admin
-- IMPORTANTE: Substitua 'SEU_EMAIL_AQUI' pelo email do usuário que você quer promover

UPDATE public.usuarios
SET role = 'admin'
WHERE email = 'SEU_EMAIL_AQUI';

-- Verificar se a atualização funcionou
SELECT id, email, nome, role, created_at
FROM public.usuarios
WHERE email = 'SEU_EMAIL_AQUI';
