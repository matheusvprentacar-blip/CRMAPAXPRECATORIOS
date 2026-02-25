BEGIN;

UPDATE public.configuracoes_sistema
SET tema_config = jsonb_set(
  COALESCE(tema_config, '{}'::jsonb),
  '{custom,backgroundDark}',
  '"#000000"'::jsonb,
  true
)
WHERE LOWER(COALESCE(tema_config -> 'custom' ->> 'backgroundDark', '')) = '#171412';

COMMIT;
