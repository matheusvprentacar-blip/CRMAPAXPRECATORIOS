-- ============================================
-- Script 80 v2: Criar Bucket 'documentos' (Idempotente)
-- ============================================
-- Descrição: Cria o bucket 'documentos' e políticas
--            apenas se não existirem
-- Data: 2024
-- ============================================

-- ============================================
-- PASSO 1: Criar o Bucket 'documentos' (se não existir)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,
  52428800,  -- 50 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

-- ============================================
-- PASSO 2: Remover Políticas Antigas (se existirem)
-- ============================================

DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios arquivos" ON storage.objects;

-- ============================================
-- PASSO 3: Criar Políticas Novas
-- ============================================

-- 3.1. Upload (INSERT)
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- 3.2. Leitura (SELECT)
CREATE POLICY "Leitura pública de documentos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documentos');

-- 3.3. Atualização (UPDATE)
CREATE POLICY "Usuários podem atualizar seus próprios arquivos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos' AND auth.uid()::text = owner::text)
WITH CHECK (bucket_id = 'documentos' AND auth.uid()::text = owner::text);

-- 3.4. Exclusão (DELETE)
CREATE POLICY "Usuários podem excluir seus próprios arquivos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documentos' AND auth.uid()::text = owner::text);

-- ============================================
-- PASSO 4: Verificações
-- ============================================

-- Verificar bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  CASE 
    WHEN public THEN '✅ Público'
    ELSE '❌ Privado'
  END as status
FROM storage.buckets
WHERE id = 'documentos';

-- Verificar políticas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN '📤 Upload'
    WHEN cmd = 'SELECT' THEN '👁️ Leitura'
    WHEN cmd = 'UPDATE' THEN '✏️ Atualização'
    WHEN cmd = 'DELETE' THEN '🗑️ Exclusão'
  END as operacao
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%documentos%'
  OR policyname LIKE '%Usuários%'
ORDER BY cmd;

-- ============================================
-- FINALIZAÇÃO
-- ============================================

SELECT 
  '✅ Script 80 v2 executado com sucesso!' as status,
  'Bucket "documentos" configurado' as mensagem,
  'Políticas recriadas' as detalhes,
  'Teste o upload em: /admin/precatorios' as proximos_passos;
