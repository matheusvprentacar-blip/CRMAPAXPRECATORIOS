-- Adicionar campo para armazenar URL do PDF do precatório
ALTER TABLE public.precatorios
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

COMMENT ON COLUMN public.precatorios.pdf_url IS 'URL do PDF do precatório (pode ser Supabase Storage ou URL externa)';
