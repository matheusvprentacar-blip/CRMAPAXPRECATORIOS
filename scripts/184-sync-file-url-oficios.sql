-- Script 184: Sincronizar file_url <-> pdf_url para oficios
-- Corrige registros criados pelo upload em lote (pdf_url em documentos/oficios)
-- e garante que o calculo enxergue o oficio quando ele estiver em file_url.

BEGIN;

-- 1) Backfill: copiar pdf_url -> file_url quando o PDF eh de oficio
UPDATE public.precatorios
SET file_url = pdf_url
WHERE file_url IS NULL
  AND pdf_url IS NOT NULL
  AND (
    pdf_url ILIKE '%/documentos/oficios/%'
    OR pdf_url ILIKE 'storage:documentos/oficios/%'
  );

-- 2) Backfill: copiar file_url -> pdf_url quando o arquivo for PDF de oficio
UPDATE public.precatorios
SET pdf_url = file_url
WHERE pdf_url IS NULL
  AND file_url IS NOT NULL
  AND file_url ILIKE '%.pdf'
  AND (
    file_url ILIKE '%/documentos/oficios/%'
    OR file_url ILIKE 'storage:documentos/oficios/%'
    OR file_url ILIKE '%/ocr-uploads/%'
    OR file_url ILIKE 'storage:ocr-uploads/%'
  );

-- 3) Trigger: manter ambos preenchidos quando um for de oficio
CREATE OR REPLACE FUNCTION public.sync_file_pdf_urls_oficio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- pdf_url -> file_url (somente oficio do bucket documentos/oficios)
  IF NEW.file_url IS NULL AND NEW.pdf_url IS NOT NULL THEN
    IF NEW.pdf_url ILIKE '%/documentos/oficios/%'
      OR NEW.pdf_url ILIKE 'storage:documentos/oficios/%'
    THEN
      NEW.file_url := NEW.pdf_url;
    END IF;
  END IF;

  -- file_url -> pdf_url (somente PDF de oficio / OCR uploads)
  IF NEW.pdf_url IS NULL AND NEW.file_url IS NOT NULL THEN
    IF NEW.file_url ILIKE '%.pdf'
      AND (
        NEW.file_url ILIKE '%/documentos/oficios/%'
        OR NEW.file_url ILIKE 'storage:documentos/oficios/%'
        OR NEW.file_url ILIKE '%/ocr-uploads/%'
        OR NEW.file_url ILIKE 'storage:ocr-uploads/%'
      )
    THEN
      NEW.pdf_url := NEW.file_url;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_file_url_from_pdf_url ON public.precatorios;
DROP TRIGGER IF EXISTS trigger_sync_file_pdf_urls_oficio ON public.precatorios;
CREATE TRIGGER trigger_sync_file_pdf_urls_oficio
BEFORE INSERT OR UPDATE OF pdf_url, file_url ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.sync_file_pdf_urls_oficio();

COMMIT;
