BEGIN;

INSERT INTO public.market_series_config (
  key,
  provider,
  series_id,
  normalization_mode,
  value_unit,
  options_json,
  active
)
VALUES
  ('CDI', 'BCB_SGS', '12', 'daily_compounded_252', 'percent', '{}'::jsonb, TRUE),
  ('SELIC', 'BCB_SGS', '11', 'daily_compounded_252', 'percent', '{}'::jsonb, TRUE)
ON CONFLICT (key, provider)
DO UPDATE SET
  series_id = EXCLUDED.series_id,
  normalization_mode = EXCLUDED.normalization_mode,
  value_unit = EXCLUDED.value_unit,
  options_json = EXCLUDED.options_json,
  active = EXCLUDED.active,
  updated_at = NOW();

COMMIT;
