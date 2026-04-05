BEGIN;

ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS status_contrato TEXT DEFAULT 'nao_iniciado',
  ADD COLUMN IF NOT EXISTS observacoes_contrato TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'precatorios_status_contrato_check'
      AND conrelid = 'public.precatorios'::regclass
  ) THEN
    ALTER TABLE public.precatorios
      ADD CONSTRAINT precatorios_status_contrato_check
      CHECK (
        status_contrato IN ('nao_iniciado', 'em_andamento', 'pendente_assinatura', 'concluido')
      );
  END IF;
END
$$;

COMMIT;
