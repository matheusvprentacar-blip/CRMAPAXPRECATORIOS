BEGIN;

ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS loa TEXT,
  ADD COLUMN IF NOT EXISTS ano_orcamentario INTEGER,
  ADD COLUMN IF NOT EXISTS previsao_pagamento DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'precatorios_ano_orcamentario_range_check'
  ) THEN
    ALTER TABLE public.precatorios
      ADD CONSTRAINT precatorios_ano_orcamentario_range_check
      CHECK (
        ano_orcamentario IS NULL
        OR (ano_orcamentario >= 1900 AND ano_orcamentario <= 2999)
      );
  END IF;
END;
$$;

COMMENT ON COLUMN public.precatorios.loa IS 'Identificacao da LOA (Lei Orcamentaria Anual) vinculada ao precatorio.';
COMMENT ON COLUMN public.precatorios.ano_orcamentario IS 'Ano orcamentario planejado para o pagamento do precatorio.';
COMMENT ON COLUMN public.precatorios.previsao_pagamento IS 'Data prevista para pagamento do precatorio.';

COMMIT;
