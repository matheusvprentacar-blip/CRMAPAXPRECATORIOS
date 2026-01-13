-- OMITTED: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- (Assuming RLS is already enabled for storage, which is default. 
-- Changing system table properties often causes permission errors).

-- 1. Policy for SELECT (Download/View)
DROP POLICY IF EXISTS "Permitir Leitura PDF Autenticados" ON storage.objects;
CREATE POLICY "Permitir Leitura PDF Autenticados" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'precatorios-pdf');

-- 2. Policy for INSERT (Upload)
DROP POLICY IF EXISTS "Permitir Upload PDF Autenticados" ON storage.objects;
CREATE POLICY "Permitir Upload PDF Autenticados" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'precatorios-pdf');

-- 3. Policy for UPDATE (Replace/Edit)
DROP POLICY IF EXISTS "Permitir Update PDF Autenticados" ON storage.objects;
CREATE POLICY "Permitir Update PDF Autenticados" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'precatorios-pdf');

-- 4. Policy for DELETE
DROP POLICY IF EXISTS "Permitir Delete PDF Autenticados" ON storage.objects;
CREATE POLICY "Permitir Delete PDF Autenticados" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'precatorios-pdf');
