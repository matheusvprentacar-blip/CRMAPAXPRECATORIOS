BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  nome_empresa TEXT DEFAULT 'CRM APAX Precatorios',
  subtitulo_empresa TEXT DEFAULT 'Sistema de Gestao',
  cor_primaria TEXT DEFAULT '#ff8a00',
  cor_secundaria TEXT DEFAULT '#f59e0b',
  tema_config JSONB NOT NULL DEFAULT '{"version":1,"mode":"preset","preset":"apax_orange","custom":{"primary":"#ff8a00","secondary":"#f59e0b","accent":"#fb923c","backgroundLight":"#faf7f2","backgroundDark":"#000000"}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.configuracoes_sistema
  ADD COLUMN IF NOT EXISTS tema_config JSONB NOT NULL DEFAULT '{"version":1,"mode":"preset","preset":"apax_orange","custom":{"primary":"#ff8a00","secondary":"#f59e0b","accent":"#fb923c","backgroundLight":"#faf7f2","backgroundDark":"#000000"}}'::jsonb;

UPDATE public.configuracoes_sistema
SET tema_config = '{"version":1,"mode":"preset","preset":"apax_orange","custom":{"primary":"#ff8a00","secondary":"#f59e0b","accent":"#fb923c","backgroundLight":"#faf7f2","backgroundDark":"#000000"}}'::jsonb
WHERE tema_config IS NULL;

INSERT INTO public.configuracoes_sistema (id, nome_empresa, subtitulo_empresa, tema_config)
SELECT
  '00000000-0000-0000-0000-000000000001'::UUID,
  'CRM APAX Precatorios',
  'Sistema de Gestao',
  '{"version":1,"mode":"preset","preset":"apax_orange","custom":{"primary":"#ff8a00","secondary":"#f59e0b","accent":"#fb923c","backgroundLight":"#faf7f2","backgroundDark":"#000000"}}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.configuracoes_sistema
);

ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ler configurações" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS "Admins podem atualizar configurações" ON public.configuracoes_sistema;
DROP POLICY IF EXISTS configuracoes_sistema_select_policy ON public.configuracoes_sistema;
DROP POLICY IF EXISTS configuracoes_sistema_update_policy ON public.configuracoes_sistema;

CREATE POLICY configuracoes_sistema_select_policy
  ON public.configuracoes_sistema
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY configuracoes_sistema_update_policy
  ON public.configuracoes_sistema
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND 'admin' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND 'admin' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
    )
  );

GRANT SELECT, UPDATE ON TABLE public.configuracoes_sistema TO authenticated;

COMMIT;
