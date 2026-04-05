BEGIN;

ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS distribuido_por_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS distribuido_por_admin_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS distribuido_por_admin_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_precatorios_distribuido_por_admin
  ON public.precatorios (distribuido_por_admin, distribuido_por_admin_em DESC);

COMMENT ON COLUMN public.precatorios.distribuido_por_admin IS
  'Indica se a ultima distribuicao/redistribuicao foi executada por usuario com role admin.';

COMMENT ON COLUMN public.precatorios.distribuido_por_admin_id IS
  'Usuario admin responsavel pela ultima distribuicao quando distribuido_por_admin = true.';

COMMENT ON COLUMN public.precatorios.distribuido_por_admin_em IS
  'Data/hora da ultima distribuicao feita por admin.';

COMMIT;
