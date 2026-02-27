-- =====================================================
-- SCRIPT 229: Origem da Solicitacao + Migracao de Legado Juridico
-- =====================================================
-- Objetivo:
-- 1) adicionar a coluna legal_opinions.origem_solicitacao;
-- 2) backfill de origem para pareceres existentes;
-- 3) migrar precatorios legados com sinal juridico sem registro em legal_opinions.
-- =====================================================

BEGIN;

ALTER TABLE public.legal_opinions
  ADD COLUMN IF NOT EXISTS origem_solicitacao TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'legal_opinions_origem_solicitacao_check'
      AND conrelid = 'public.legal_opinions'::regclass
  ) THEN
    ALTER TABLE public.legal_opinions
      ADD CONSTRAINT legal_opinions_origem_solicitacao_check
      CHECK (origem_solicitacao = ANY (ARRAY['kanban', 'calculo', 'manual', 'migracao']::TEXT[]));
  END IF;
END
$$;

ALTER TABLE public.legal_opinions
  ALTER COLUMN origem_solicitacao SET DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_legal_opinions_origem_solicitacao
  ON public.legal_opinions(tenant_id, origem_solicitacao);

-- 1) Backfill para pareceres existentes que vieram da fila de calculo.
UPDATE public.legal_opinions lo
SET origem_solicitacao = 'calculo'
WHERE lo.origem_solicitacao IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.atividades a
    WHERE a.precatorio_id = lo.precatorio_id
      AND COALESCE(a.dados_novos ->> 'origem', '') = 'fila_calculo'
  );

-- 2) Backfill para pareceres que ja tinham sinal juridico no precatorio (origem kanban).
UPDATE public.legal_opinions lo
SET origem_solicitacao = 'kanban'
FROM public.precatorios p
WHERE lo.origem_solicitacao IS NULL
  AND p.id = lo.precatorio_id
  AND (
    COALESCE(NULLIF(TRIM(p.juridico_motivo), ''), '') <> ''
    OR COALESCE(NULLIF(TRIM(p.juridico_descricao_bloqueio), ''), '') <> ''
    OR COALESCE(NULLIF(TRIM(p.juridico_parecer_status), ''), '') <> ''
  );

-- 3) Demais ficam como manual.
UPDATE public.legal_opinions
SET origem_solicitacao = 'manual'
WHERE origem_solicitacao IS NULL;

-- 4) Migrar legados sem parecer formal.
WITH fallback_user AS (
  SELECT DISTINCT ON (tm.tenant_id)
    tm.tenant_id,
    tm.user_id
  FROM public.tenant_members tm
  WHERE tm.is_active = TRUE
  ORDER BY tm.tenant_id, tm.created_at
),
legacy_candidates AS (
  SELECT
    p.id AS precatorio_id,
    p.tenant_id,
    COALESCE(p.responsavel_juridico_id, fu.user_id) AS requested_by,
    p.responsavel_juridico_id AS assigned_to,
    CASE
      WHEN p.juridico_motivo = 'PENHORA' THEN 'penhoras_bloqueios'
      WHEN p.juridico_motivo IN ('CESSAO', 'HABILITACAO') THEN 'titularidade_cessao'
      WHEN p.juridico_motivo IN ('HONORARIOS', 'DUVIDA_BASE_INDICE') THEN 'calculos'
      ELSE 'risco_processual'
    END AS type,
    CASE
      WHEN LOWER(COALESCE(NULLIF(TRIM(p.juridico_parecer_status), ''), '')) IN ('aprovado', 'concluido', 'deferido') THEN 'concluido'
      WHEN LOWER(COALESCE(NULLIF(TRIM(p.juridico_parecer_status), ''), '')) IN ('rejeitado', 'indeferido') THEN 'rejeitado'
      ELSE 'pendente'
    END AS status,
    COALESCE(NULLIF(TRIM(p.juridico_motivo), ''), 'LEGADO') AS motivo,
    NULLIF(TRIM(p.juridico_descricao_bloqueio), '') AS descricao,
    NULLIF(TRIM(p.juridico_parecer_status), '') AS parecer_status,
    p.updated_at,
    p.created_at
  FROM public.precatorios p
  LEFT JOIN fallback_user fu
    ON fu.tenant_id = p.tenant_id
  WHERE (
      COALESCE(NULLIF(TRIM(p.juridico_motivo), ''), '') <> ''
      OR COALESCE(NULLIF(TRIM(p.juridico_descricao_bloqueio), ''), '') <> ''
      OR COALESCE(NULLIF(TRIM(p.juridico_parecer_status), ''), '') <> ''
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.legal_opinions lo
      WHERE lo.precatorio_id = p.id
    )
    AND p.deleted_at IS NULL
)
INSERT INTO public.legal_opinions (
  tenant_id,
  precatorio_id,
  requested_by,
  assigned_to,
  title,
  type,
  status,
  priority,
  origem_solicitacao,
  executive_summary,
  analysis,
  recommendation,
  conclusion,
  checklist,
  created_at,
  updated_at
)
SELECT
  lc.tenant_id,
  lc.precatorio_id,
  lc.requested_by,
  lc.assigned_to,
  CONCAT('Migracao legado juridico - ', lc.motivo),
  lc.type,
  lc.status,
  'media',
  'migracao',
  CONCAT('Migrado automaticamente. Motivo: ', lc.motivo, COALESCE(CONCAT('. Status legado: ', lc.parecer_status), '')),
  lc.descricao,
  'Revisar parecer migrado e complementar analise tecnica.',
  'Registro migrado automaticamente a partir dos campos legados do precatorio.',
  '{}'::jsonb,
  COALESCE(lc.created_at, NOW()),
  COALESCE(lc.updated_at, NOW())
FROM legacy_candidates lc
WHERE lc.requested_by IS NOT NULL;

COMMIT;
