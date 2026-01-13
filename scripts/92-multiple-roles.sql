-- Migration: Permitir Múltiplas Roles por Usuário
-- Data: 2026-01-11
-- Descrição: Converte campo role de TEXT para TEXT[] permitindo até 2 roles por usuário

-- IMPORTANTE: FAZER BACKUP DO BANCO ANTES DE EXECUTAR!

-- 1. PRIMEIRO: Remover TODAS as policies do sistema
-- (Abordagem robusta - remove todas e recria as essenciais depois)

DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Remover todas as policies da tabela precatorios
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'precatorios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.precatorios', pol.policyname);
    RAISE NOTICE 'Removida policy: % na tabela precatorios', pol.policyname;
  END LOOP;
  
  -- Remover todas as policies da tabela documentos_precatorio
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documentos_precatorio'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.documentos_precatorio', pol.policyname);
    RAISE NOTICE 'Removida policy: % na tabela documentos_precatorio', pol.policyname;
  END LOOP;
  
  -- Remover todas as policies da tabela storage.objects
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    RAISE NOTICE 'Removida policy: % na tabela storage.objects', pol.policyname;
  END LOOP;
  
  RAISE NOTICE 'Todas as policies foram removidas com sucesso!';
END $$;

-- 2. Remover constraint CHECK existente (também depende do tipo da coluna)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

-- 3. Remover DEFAULT existente (necessário antes da conversão de tipo)
ALTER TABLE usuarios 
ALTER COLUMN role DROP DEFAULT;

-- 3. Converter coluna role de TEXT para TEXT[]
-- Usando ARRAY[role] para converter valores existentes em array de um elemento
ALTER TABLE usuarios 
ALTER COLUMN role TYPE TEXT[] 
USING ARRAY[role];

-- 4. Adicionar novo DEFAULT como array
ALTER TABLE usuarios 
ALTER COLUMN role SET DEFAULT ARRAY['operador_comercial']::TEXT[];

COMMENT ON COLUMN usuarios.role IS 'Roles do usuário (máximo 2)';

-- 5. Adicionar constraint para garantir entre 1 e 2 roles
ALTER TABLE usuarios 
DROP CONSTRAINT IF EXISTS max_two_roles;

ALTER TABLE usuarios 
ADD CONSTRAINT max_two_roles 
CHECK (
  array_length(role, 1) IS NOT NULL 
  AND array_length(role, 1) >= 1 
  AND array_length(role, 1) <= 2
);

-- 6. Adicionar constraint para garantir que roles são válidas
ALTER TABLE usuarios 
DROP CONSTRAINT IF EXISTS valid_roles_array;

ALTER TABLE usuarios
ADD CONSTRAINT valid_roles_array
CHECK (
  role <@ ARRAY[
    'admin', 
    'operador_comercial', 
    'operador_calculo', 
    'operador', 
    'analista', 
    'gestor', 
    'gestor_certidoes', 
    'gestor_oficio'
  ]::TEXT[]
);

-- 7. Criar funções helper para verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION user_has_role(user_roles TEXT[], check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN check_role = ANY(user_roles);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION user_has_role IS 'Verifica se um array de roles contém uma role específica';

-- 8. Criar função helper para verificar se usuário tem alguma das roles
CREATE OR REPLACE FUNCTION user_has_any_role(user_roles TEXT[], check_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_roles && check_roles;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION user_has_any_role IS 'Verifica se um array de roles contém alguma das roles especificadas';

-- 9. RECRIAR policies com sintaxe de array

-- Policy: Gestor certidoes
CREATE POLICY "Gestor certidoes pode ver seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_certidoes' = ANY(usuarios.role)
    AND precatorios.responsavel_certidoes_id = auth.uid()
  )
);

CREATE POLICY "Gestor certidoes pode atualizar seus precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_certidoes' = ANY(usuarios.role)
    AND precatorios.responsavel_certidoes_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_certidoes' = ANY(usuarios.role)
    AND precatorios.responsavel_certidoes_id = auth.uid()
  )
);

-- Policy: Gestor oficio
CREATE POLICY "Gestor oficio pode ver seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_oficio' = ANY(usuarios.role)
    AND precatorios.responsavel_oficio_id = auth.uid()
  )
);

CREATE POLICY "Gestor oficio pode atualizar seus precatorios"
ON precatorios FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_oficio' = ANY(usuarios.role)
    AND precatorios.responsavel_oficio_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_oficio' = ANY(usuarios.role)
    AND precatorios.responsavel_oficio_id = auth.uid()
  )
);

-- 7. Verificar dados após migração
-- Este SELECT deve retornar todos os usuários com suas roles como array
SELECT id, nome, email, role, array_length(role, 1) as num_roles
FROM usuarios
ORDER BY nome;

-- Migration concluída: Múltiplas Roles implementado

-- ROLLBACK (apenas se necessário):
-- ALTER TABLE usuarios ALTER COLUMN role TYPE TEXT USING role[1];
