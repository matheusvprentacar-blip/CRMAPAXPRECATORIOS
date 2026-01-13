-- DIAGNÓSTICO DE VISIBILIDADE
-- Execute este script para entender por que os dados não aparecem

-- 1. Verificar estrutura e dados da tabela usuarios (Roles)
SELECT 
  id, 
  nome, 
  email, 
  role, 
  pg_typeof(role) as tipo_coluna_role 
FROM usuarios 
LIMIT 5;

-- 2. Verificar distribuição de precatórios por status
SELECT 
  status_kanban, 
  COUNT(*) as total,
  COUNT(CASE WHEN responsavel_certidoes_id IS NOT NULL THEN 1 END) as com_gestor_certidoes,
  COUNT(CASE WHEN responsavel_oficio_id IS NOT NULL THEN 1 END) as com_gestor_oficio
FROM precatorios 
GROUP BY status_kanban;

-- 3. Verificar Policies Ativas na tabela Precatorios
SELECT polname, polcmd, polroles 
FROM pg_policy 
WHERE polrelid = 'precatorios'::regclass;

-- 4. Teste simulação de RLS (Para um Admin genérico)
-- Isso ajuda a ver se a policy 'Admin pode ver todos precatorios' está funcionando logicamente
-- Substitua o ID abaixo por um ID de admin real que você pegou no passo 1 se quiser testar especificamente
DO $$
DECLARE
  v_admin_id UUID;
  v_count INTEGER;
BEGIN
  -- Tenta pegar o primeiro admin
  SELECT id INTO v_admin_id FROM usuarios WHERE 'admin' = ANY(role) LIMIT 1;
  
  IF v_admin_id IS NOT NULL THEN
    RAISE NOTICE 'Testando visibilidade para Admin ID: %', v_admin_id;
    
    -- Nota: Isso é apenas uma simulação lógica, o RLS real depende do sessão web (auth.uid())
    -- Mas podemos verificar se a condicional da policy faria sentido
    
    SELECT COUNT(*) INTO v_count 
    FROM precatorios p
    WHERE EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = v_admin_id
      AND 'admin' = ANY(u.role)
    );
    
    RAISE NOTICE 'Admin veria % precatórios (Simulação Lógica)', v_count;
  ELSE
    RAISE NOTICE 'Nenhum usuário com role admin encontrado no banco!';
  END IF;
END $$;
