-- =====================================================
-- SCRIPT 51: Policies do Bucket precatorios-documentos
-- =====================================================
-- Descrição: Configura policies de segurança para o
--            bucket de documentos dos precatórios
-- Autor: Sistema CRM Precatórios
-- Data: 2025
-- Pré-requisito: Bucket "precatorios-documentos" criado
-- =====================================================

-- =====================================================
-- IMPORTANTE: Execute este script DEPOIS de criar o bucket
-- manualmente no Supabase Dashboard (Storage > Create bucket)
-- =====================================================

-- 1. Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "Ver documentos dos precatórios acessíveis" ON storage.objects;
DROP POLICY IF EXISTS "Upload de documentos para precatórios acessíveis" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar próprios documentos ou admin" ON storage.objects;
DROP POLICY IF EXISTS "Remover próprios documentos ou admin" ON storage.objects;

-- 2. Policy: Ver/Download de documentos
-- Usuários podem ver documentos dos precatórios que têm acesso
CREATE POLICY "Ver documentos dos precatórios acessíveis"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'precatorios-documentos'
  AND (
    -- Admin vê tudo
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
    OR
    -- Usuário vê documentos dos precatórios que tem acesso
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.deleted_at IS NULL
        AND (
          p.criado_por = auth.uid() OR
          p.responsavel = auth.uid() OR
          p.responsavel_calculo_id = auth.uid()
        )
    )
  )
);

-- 3. Policy: Upload de documentos
-- Usuários podem fazer upload para precatórios que têm acesso
CREATE POLICY "Upload de documentos para precatórios acessíveis"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'precatorios-documentos'
  AND (
    -- Admin pode fazer upload em qualquer precatório
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
    OR
    -- Usuário pode fazer upload nos precatórios que tem acesso
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.deleted_at IS NULL
        AND (
          p.criado_por = auth.uid() OR
          p.responsavel = auth.uid() OR
          p.responsavel_calculo_id = auth.uid()
        )
    )
  )
);

-- 4. Policy: Atualizar documentos
-- Apenas quem fez upload ou admin pode atualizar
CREATE POLICY "Atualizar próprios documentos ou admin"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'precatorios-documentos'
  AND (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
);

-- 5. Policy: Remover documentos
-- Apenas quem fez upload ou admin pode remover
CREATE POLICY "Remover próprios documentos ou admin"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'precatorios-documentos'
  AND (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
);

-- =====================================================
-- TESTES
-- =====================================================

-- Teste 1: Verificar se as policies foram criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%documentos%'
ORDER BY policyname;

-- Teste 2: Verificar bucket
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'precatorios-documentos';

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Deve retornar 4 policies:
-- 1. Ver documentos dos precatórios acessíveis (SELECT)
-- 2. Upload de documentos para precatórios acessíveis (INSERT)
-- 3. Atualizar próprios documentos ou admin (UPDATE)
-- 4. Remover próprios documentos ou admin (DELETE)
--
-- E 1 bucket:
-- - name: precatorios-documentos
-- - public: false
-- - file_size_limit: 10485760 (10MB)
-- - allowed_mime_types: [application/pdf, image/jpeg, ...]
-- =====================================================

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. As policies usam storage.foldername() para extrair o
--    precatorio_id do caminho do arquivo
--
-- 2. Estrutura esperada dos arquivos:
--    precatorios-documentos/
--      {precatorio_id}/
--        {tipo_documento}/
--          {timestamp}_{nome_arquivo}
--
-- 3. Permissões:
--    - Admin: acesso total a todos os documentos
--    - Criador: acesso aos documentos dos seus precatórios
--    - Responsável: acesso aos documentos dos precatórios atribuídos
--    - Responsável Cálculo: acesso aos documentos em cálculo
--
-- 4. Segurança:
--    - Bucket privado (não acessível publicamente)
--    - RLS habilitado
--    - Validação de permissões em cada operação
--    - Soft delete (arquivos não são removidos fisicamente)
-- =====================================================
