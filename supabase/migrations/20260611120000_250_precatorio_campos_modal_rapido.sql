BEGIN;

-- Campos adicionais usados pelo modal de preenchimento rapido na pagina de
-- precatorios (resumo rapido).
ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS numero_processo_originario text,
  ADD COLUMN IF NOT EXISTS possui_oficio_requisitorio boolean,
  ADD COLUMN IF NOT EXISTS possui_preferencial boolean,
  ADD COLUMN IF NOT EXISTS possui_adiantamento boolean;

COMMENT ON COLUMN public.precatorios.numero_processo_originario IS 'Numero do processo originario (1a instancia).';
COMMENT ON COLUMN public.precatorios.possui_oficio_requisitorio IS 'Resumo rapido: possui oficio requisitorio.';
COMMENT ON COLUMN public.precatorios.possui_preferencial IS 'Resumo rapido: possui preferencial.';
COMMENT ON COLUMN public.precatorios.possui_adiantamento IS 'Resumo rapido: possui adiantamentos.';

-- Certidoes do modal rapido: 1 linha por (precatorio, tipo). Guarda apenas o
-- resultado + data de solicitacao + validade. O ANEXO do documento continua no
-- checklist documental (precatorio_itens / tipo_grupo = 'CERTIDAO').
CREATE TABLE IF NOT EXISTS public.precatorio_certidoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  precatorio_id uuid NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'central',
    'estadual',
    'municipal',
    'federal',
    'distribuidor',
    'debitos_trabalhistas',
    'acoes_trabalhistas'
  )),
  resultado text CHECK (
    resultado IS NULL OR resultado IN (
      'negativa', 'positiva', 'nao_concluido', 'nao_solicitado', 'na'
    )
  ),
  solicitada_em date,
  validade date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (precatorio_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_precatorio_certidoes_precatorio_id
  ON public.precatorio_certidoes (precatorio_id);

COMMENT ON TABLE public.precatorio_certidoes IS 'Resumo rapido de certidoes por precatorio (resultado, data de solicitacao, validade). Anexo fica em precatorio_itens.';

-- RLS: usuario acessa as certidoes apenas dos precatorios que ja pode ver.
-- Delegamos a RLS da tabela precatorios via EXISTS (respeita todas as regras dela).
ALTER TABLE public.precatorio_certidoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gerenciam certidoes dos seus precatorios" ON public.precatorio_certidoes;
CREATE POLICY "Usuarios gerenciam certidoes dos seus precatorios"
  ON public.precatorio_certidoes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = precatorio_certidoes.precatorio_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = precatorio_certidoes.precatorio_id
    )
  );

COMMIT;
