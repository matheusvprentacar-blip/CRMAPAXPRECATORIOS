-- Restaurar Policies de Storage (CRÍTICO)
-- Motivo: O script de migração de roles (92) removeu TODAS as policies do storage
--         mas não as recriou, bloqueando todos os uploads.

-- 1. Bucket 'documentos' (Permissivo para Autenticados)
-- ========================================================
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('documentos', 'documentos', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios arquivos" ON storage.objects;

-- Insert
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- Select
CREATE POLICY "Leitura pública de documentos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documentos');

-- Update
CREATE POLICY "Usuários podem atualizar seus próprios arquivos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos' AND auth.uid()::text = owner::text)
WITH CHECK (bucket_id = 'documentos' AND auth.uid()::text = owner::text);

-- Delete (Permitir Admin também)
CREATE POLICY "Usuários podem excluir seus próprios arquivos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos' 
  AND (
    auth.uid()::text = owner::text
    OR 
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND 'admin' = ANY(role))
  )
);

-- 2. Bucket 'precatorios-pdf' (Permissivo para Autenticados)
-- ========================================================
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('precatorios-pdf', 'precatorios-pdf', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

DROP POLICY IF EXISTS "PDF Upload Auth" ON storage.objects;
DROP POLICY IF EXISTS "PDF Select Public" ON storage.objects;

-- Insert
CREATE POLICY "PDF Upload Auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'precatorios-pdf');

-- Select
CREATE POLICY "PDF Select Public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'precatorios-pdf');

-- Delete
CREATE POLICY "PDF Delete Admin or Owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'precatorios-pdf'
  AND (
    auth.uid()::text = owner::text
    OR 
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND 'admin' = ANY(role))
  )
);

-- Verificação
SELECT * FROM pg_policies WHERE schemaname = 'storage';
