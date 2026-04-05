BEGIN;

ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS status_procuracao TEXT DEFAULT 'nao_iniciado',
  ADD COLUMN IF NOT EXISTS observacoes_procuracao TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'precatorios_status_procuracao_check'
      AND conrelid = 'public.precatorios'::regclass
  ) THEN
    ALTER TABLE public.precatorios
      ADD CONSTRAINT precatorios_status_procuracao_check
      CHECK (
        status_procuracao IN ('nao_iniciado', 'em_andamento', 'pendente_assinatura', 'concluido')
      );
  END IF;
END
$$;

COMMIT;
