-- Enable RLS permissions for the 'documentos' bucket
-- This is required for Upload of Ofícios and other documents

-- 1. Policy for SELECT (Download/View)
DROP POLICY IF EXISTS "Permitir Leitura Documentos Autenticados" ON storage.objects;
CREATE POLICY "Permitir Leitura Documentos Autenticados" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documentos');

-- 2. Policy for INSERT (Upload)
DROP POLICY IF EXISTS "Permitir Upload Documentos Autenticados" ON storage.objects;
CREATE POLICY "Permitir Upload Documentos Autenticados" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- 3. Policy for UPDATE (Replace/Edit)
DROP POLICY IF EXISTS "Permitir Update Documentos Autenticados" ON storage.objects;
CREATE POLICY "Permitir Update Documentos Autenticados" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos');

-- 4. Policy for DELETE
DROP POLICY IF EXISTS "Permitir Delete Documentos Autenticados" ON storage.objects;
CREATE POLICY "Permitir Delete Documentos Autenticados" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documentos');
