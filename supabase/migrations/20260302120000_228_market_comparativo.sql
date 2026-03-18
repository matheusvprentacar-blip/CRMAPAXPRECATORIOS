BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.market_series_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('BCB_SGS', 'TESOURO_CKAN')),
  series_id TEXT NOT NULL,
  normalization_mode TEXT NULL CHECK (normalization_mode IN ('annual_direct', 'daily_compounded_252')),
  value_unit TEXT NULL,
  options_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT market_series_config_key_provider_unique UNIQUE (key, provider)
);

CREATE INDEX IF NOT EXISTS idx_market_series_config_active
  ON public.market_series_config (active)
  WHERE active IS TRUE;

DROP TRIGGER IF EXISTS trigger_update_market_series_config_updated_at ON public.market_series_config;
CREATE TRIGGER trigger_update_market_series_config_updated_at
  BEFORE UPDATE ON public.market_series_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.market_series_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_series_config_select_policy ON public.market_series_config;
CREATE POLICY market_series_config_select_policy
  ON public.market_series_config FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS market_series_config_insert_policy ON public.market_series_config;
CREATE POLICY market_series_config_insert_policy
  ON public.market_series_config FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_user_has_any_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS market_series_config_update_policy ON public.market_series_config;
CREATE POLICY market_series_config_update_policy
  ON public.market_series_config FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.current_user_has_any_role(ARRAY['admin'])
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_user_has_any_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS market_series_config_delete_policy ON public.market_series_config;
CREATE POLICY market_series_config_delete_policy
  ON public.market_series_config FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.current_user_has_any_role(ARRAY['admin'])
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_series_config TO authenticated;

CREATE TABLE IF NOT EXISTS public.market_rates_daily (
  ref_date DATE PRIMARY KEY,
  cdi_annual NUMERIC(12, 8) NULL CHECK (cdi_annual >= -1 AND cdi_annual <= 10),
  selic_annual NUMERIC(12, 8) NULL CHECK (selic_annual >= -1 AND selic_annual <= 10),
  tesouro_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_rates_daily_ref_date_desc
  ON public.market_rates_daily (ref_date DESC);

DROP TRIGGER IF EXISTS trigger_update_market_rates_daily_updated_at ON public.market_rates_daily;
CREATE TRIGGER trigger_update_market_rates_daily_updated_at
  BEFORE UPDATE ON public.market_rates_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.market_rates_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_rates_daily_select_policy ON public.market_rates_daily;
CREATE POLICY market_rates_daily_select_policy
  ON public.market_rates_daily FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS market_rates_daily_insert_policy ON public.market_rates_daily;
CREATE POLICY market_rates_daily_insert_policy
  ON public.market_rates_daily FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_user_has_any_role(ARRAY['admin', 'gestor'])
  );

DROP POLICY IF EXISTS market_rates_daily_update_policy ON public.market_rates_daily;
CREATE POLICY market_rates_daily_update_policy
  ON public.market_rates_daily FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.current_user_has_any_role(ARRAY['admin', 'gestor'])
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.current_user_has_any_role(ARRAY['admin', 'gestor'])
  );

DROP POLICY IF EXISTS market_rates_daily_delete_policy ON public.market_rates_daily;
CREATE POLICY market_rates_daily_delete_policy
  ON public.market_rates_daily FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.current_user_has_any_role(ARRAY['admin'])
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_rates_daily TO authenticated;

CREATE TABLE IF NOT EXISTS public.precatorio_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  outputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_ref_date DATE NOT NULL REFERENCES public.market_rates_daily(ref_date) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_precatorio_simulations_precatorio_created_at
  ON public.precatorio_simulations (precatorio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_precatorio_simulations_snapshot_ref_date
  ON public.precatorio_simulations (snapshot_ref_date DESC);

ALTER TABLE public.precatorio_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS precatorio_simulations_select_policy ON public.precatorio_simulations;
CREATE POLICY precatorio_simulations_select_policy
  ON public.precatorio_simulations FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.precatorios p
      WHERE p.id = precatorio_simulations.precatorio_id
    )
  );

DROP POLICY IF EXISTS precatorio_simulations_insert_policy ON public.precatorio_simulations;
CREATE POLICY precatorio_simulations_insert_policy
  ON public.precatorio_simulations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.precatorios p
      WHERE p.id = precatorio_simulations.precatorio_id
    )
  );

DROP POLICY IF EXISTS precatorio_simulations_delete_policy ON public.precatorio_simulations;
CREATE POLICY precatorio_simulations_delete_policy
  ON public.precatorio_simulations FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR public.current_user_has_any_role(ARRAY['admin'])
    )
  );

GRANT SELECT, INSERT, DELETE ON TABLE public.precatorio_simulations TO authenticated;

INSERT INTO public.market_series_config (key, provider, series_id, normalization_mode, value_unit, options_json, active)
VALUES
  ('CDI', 'BCB_SGS', '12', 'daily_compounded_252', 'percent', '{}'::jsonb, TRUE),
  ('SELIC', 'BCB_SGS', '11', 'daily_compounded_252', 'percent', '{}'::jsonb, TRUE),
  ('TESOURO_DATASET', 'TESOURO_CKAN', 'taxas-dos-titulos-ofertados-pelo-tesouro-direto', NULL, 'dataset_id', '{}'::jsonb, TRUE)
ON CONFLICT (key, provider) DO UPDATE SET
  series_id = EXCLUDED.series_id,
  normalization_mode = EXCLUDED.normalization_mode,
  value_unit = EXCLUDED.value_unit,
  options_json = EXCLUDED.options_json,
  active = EXCLUDED.active,
  updated_at = NOW();

COMMENT ON TABLE public.market_series_config IS 'Configuracao de series de mercado para coleta automatica (BCB/Tesouro).';
COMMENT ON TABLE public.market_rates_daily IS 'Snapshot diario de taxas de mercado para comparativos e auditoria.';
COMMENT ON TABLE public.precatorio_simulations IS 'Historico de simulacoes de comparativo precatorio x investimentos.';

COMMIT;
