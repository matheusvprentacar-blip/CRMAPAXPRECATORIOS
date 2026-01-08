-- =====================================================
-- DIAGNÓSTICO COMPLETO: Policies de documentos_precatorio
-- =====================================================

-- 1. Listar TODAS as policies da tabela
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'documentos_precatorio'
ORDER BY cmd, policyname;

-- 2. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'documentos_precatorio'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'documentos_precatorio';

-- 4. Testar permissões do usuário atual
SELECT 
  auth.uid() as current_user_id,
  (SELECT role FROM usuarios WHERE id = auth.uid()) as current_user_role;

-- 5. Verificar documento específico
-- SUBSTITUA 'bf0f685c-9f2d-476e-856d-20b5e591a06c' pelo ID do documento que você tentou deletar
SELECT 
  d.id,
  d.precatorio_id,
  d.enviado_por,
  d.deleted_at,
  d.created_at,
  p.criado_por as precatorio_criado_por,
  p.responsavel as precatorio_responsavel,
  p.responsavel_calculo_id as precatorio_responsavel_calculo,
  (d.enviado_por = auth.uid()) as sou_quem_enviou,
  (p.criado_por = auth.uid()) as sou_criador_precatorio,
  (p.responsavel = auth.uid()) as sou_responsavel_precatorio,
  (p.responsavel_calculo_id = auth.uid()) as sou_responsavel_calculo
FROM documentos_precatorio d
JOIN precatorios p ON p.id = d.precatorio_id
WHERE d.id = 'bf0f685c-9f2d-476e-856d-20b5e591a06c';

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script completo no Supabase SQL Editor
-- 2. Copie TODOS os resultados (todas as 5 queries)
-- 3. Me envie aqui para eu analisar
-- =====================================================
