-- Create a new storage bucket for OCR uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ocr-uploads', 'ocr-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Enable insert for authenticated users only"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ocr-uploads');

-- Policy to allow authenticated users to view their own files (or all files if public is preferred for now)
CREATE POLICY "Enable select for authenticated users only"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ocr-uploads');

-- Policy to allow authenticated users to delete their own files
CREATE POLICY "Enable delete for authenticated users only"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ocr-uploads');
