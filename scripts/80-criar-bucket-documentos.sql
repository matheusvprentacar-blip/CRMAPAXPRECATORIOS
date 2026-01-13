-- ============================================
-- Script 80: Criar Bucket 'documentos' no Supabase Storage
-- ============================================
-- Descrição: Cria o bucket 'documentos' para armazenar
--            ofícios requisitórios e outros documentos
-- Data: 2024
-- ============================================

-- IMPORTANTE: Este script deve ser executado no Supabase Dashboard
-- em: Storage > Policies > SQL Editor
-- ou via API REST do Supabase

-- ============================================
-- PASSO 1: Criar o Bucket 'documentos'
-- ============================================

-- Inserir bucket na tabela storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,  -- Bucket público para gerar URLs públicas
  52428800,  -- 50 MB de limite por arquivo
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']  -- Tipos permitidos
)
ON CONFLICT (id) DO NOTHING;

-- Verificar se o bucket foi criado
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'documentos';

-- ============================================
-- PASSO 2: Configurar Políticas de Acesso
-- ============================================

-- 2.1. Política de UPLOAD (INSERT)
-- Permite que usuários autenticados façam upload de arquivos
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- 2.2. Política de LEITURA (SELECT)
-- Permite leitura pública de todos os arquivos
CREATE POLICY "Leitura pública de documentos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documentos');

-- 2.3. Política de ATUALIZAÇÃO (UPDATE)
-- Permite que usuários autenticados atualizem seus próprios arquivos
CREATE POLICY "Usuários podem atualizar seus próprios arquivos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos' AND auth.uid()::text = owner::text)
WITH CHECK (bucket_id = 'documentos' AND auth.uid()::text = owner::text);

-- 2.4. Política de EXCLUSÃO (DELETE)
-- Permite que usuários autenticados excluam seus próprios arquivos
CREATE POLICY "Usuários podem excluir seus próprios arquivos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documentos' AND auth.uid()::text = owner::text);

-- ============================================
-- PASSO 3: Verificar Políticas Criadas
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%documentos%'
ORDER BY policyname;

-- ============================================
-- PASSO 4: Testar Permissões
-- ============================================

-- Verificar se o bucket está público
SELECT 
  id,
  name,
  public,
  CASE 
    WHEN public THEN '✅ Bucket público - URLs públicas habilitadas'
    ELSE '❌ Bucket privado - URLs públicas desabilitadas'
  END as status_publico
FROM storage.buckets
WHERE id = 'documentos';

-- ============================================
-- INFORMAÇÕES IMPORTANTES
-- ============================================

-- URLs dos arquivos seguirão o padrão:
-- https://[PROJECT_ID].supabase.co/storage/v1/object/public/documentos/[PATH]/[FILENAME]

-- Exemplo:
-- https://ldtildnelijndhswcmss.supabase.co/storage/v1/object/public/documentos/oficios/teste.pdf

-- Estrutura de pastas recomendada:
-- documentos/
--   ├── oficios/          (PDFs de ofícios requisitórios)
--   ├── certidoes/        (Certidões)
--   ├── contratos/        (Contratos)
--   └── outros/           (Outros documentos)

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Se o bucket já existe e precisa ser recriado:
-- DELETE FROM storage.buckets WHERE id = 'documentos';
-- (Cuidado: isso apagará todos os arquivos!)

-- Para remover todas as políticas:
-- DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
-- DROP POLICY IF EXISTS "Leitura pública de documentos" ON storage.objects;
-- DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios arquivos" ON storage.objects;
-- DROP POLICY IF EXISTS "Usuários podem excluir seus próprios arquivos" ON storage.objects;

-- ============================================
-- FINALIZAÇÃO
-- ============================================

SELECT '✅ Script 80 executado com sucesso!' as status,
       'Bucket "documentos" criado e configurado' as mensagem,
       'Teste o upload em: /admin/precatorios' as proximos_passos;
