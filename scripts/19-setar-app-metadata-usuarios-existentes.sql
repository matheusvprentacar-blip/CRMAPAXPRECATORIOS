-- ==========================================
-- SETAR app_metadata.role PARA USUÁRIOS EXISTENTES
-- ==========================================
-- Este script deve ser executado DEPOIS do script 18

-- IMPORTANTE: Este script usa a Admin API do Supabase
-- Você precisa executá-lo manualmente para cada usuário no Supabase Dashboard:
-- Authentication → Users → Selecionar usuário → Edit user → User Metadata

-- OU usar este código JavaScript via console do navegador ou Node.js:

/*
// No terminal Node.js ou Edge Function:
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVICE ROLE, não anon key!
)

// Pegar todos os usuários da tabela usuarios
const { data: usuarios } = await supabase
  .from('usuarios')
  .select('id, email, role')

// Atualizar app_metadata de cada um
for (const usuario of usuarios || []) {
  await supabase.auth.admin.updateUserById(usuario.id, {
    app_metadata: { role: usuario.role }
  })
  console.log(`✅ ${usuario.email} - role: ${usuario.role}`)
}
*/

-- MANUALMENTE via Supabase Dashboard:
-- 1. Vá em Authentication → Users
-- 2. Para cada usuário:
--    - Clique nos 3 pontos → Edit user
--    - Na seção "User Metadata", adicione:
--      {
--        "role": "admin"
--      }
--      ou
--      {
--        "role": "operador_comercial"
--      }
-- 3. Save

-- Query para listar usuários e seus roles atuais:
SELECT id, email, role, created_at
FROM public.usuarios
ORDER BY created_at;
