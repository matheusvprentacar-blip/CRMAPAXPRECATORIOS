BEGIN;

ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS responsavel_escrituras_id UUID REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS status_escrituras TEXT DEFAULT 'nao_iniciado',
  ADD COLUMN IF NOT EXISTS observacoes_escrituras TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'precatorios_status_escrituras_check'
      AND conrelid = 'public.precatorios'::regclass
  ) THEN
    ALTER TABLE public.precatorios
      ADD CONSTRAINT precatorios_status_escrituras_check
      CHECK (
        status_escrituras IN ('nao_iniciado', 'em_andamento', 'pendente_assinatura', 'concluido')
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_precatorios_responsavel_escrituras_id
  ON public.precatorios (responsavel_escrituras_id);

CREATE INDEX IF NOT EXISTS idx_precatorios_status_kanban_escrituras
  ON public.precatorios (status_kanban)
  WHERE status_kanban = 'escrituras';

UPDATE public.precatorios
SET status_escrituras = 'nao_iniciado'
WHERE status_kanban = 'escrituras'
  AND status_escrituras IS NULL;

COMMIT;

