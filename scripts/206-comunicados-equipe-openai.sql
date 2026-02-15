-- ============================================================================
-- Script 206: Comunicados da equipe (admin -> operadores/equipe)
-- ============================================================================
-- Objetivo:
-- - Permitir comunicados globais enviados por admin
-- - Rastrear visualizacao/leitura por usuario
-- - Opcionalmente anexar arquivo por comunicado
-- - Expor RPCs seguras para publicar comunicado e registrar eventos de leitura
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper de roles (idempotente)
CREATE OR REPLACE FUNCTION public.current_user_has_any_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles TEXT[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_roles
  FROM public.usuarios
  WHERE id = auth.uid();

  IF v_roles IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_roles && required_roles;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(TEXT[]) TO authenticated;

-- --------------------------------------------------------------------------
-- 1) Tabelas
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comunicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  mensagem_original TEXT NOT NULL,
  mensagem_publicada TEXT NOT NULL,
  estilo_ia TEXT NULL,
  escopo TEXT NOT NULL DEFAULT 'operadores'
    CHECK (escopo IN ('operadores', 'equipe')),
  anexo_url TEXT NULL,
  anexo_nome TEXT NULL,
  anexo_mime TEXT NULL,
  anexo_tamanho BIGINT NULL,
  criado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  publicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comunicado_destinatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id UUID NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visualizado_em TIMESTAMPTZ NULL,
  dispensado_em TIMESTAMPTZ NULL,
  baixou_anexo_em TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comunicado_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_comunicados_publicado_em
  ON public.comunicados(publicado_em DESC);

CREATE INDEX IF NOT EXISTS idx_comunicados_criado_por
  ON public.comunicados(criado_por);

CREATE INDEX IF NOT EXISTS idx_comunicado_destinatarios_usuario
  ON public.comunicado_destinatarios(usuario_id, enviado_em DESC);

CREATE INDEX IF NOT EXISTS idx_comunicado_destinatarios_comunicado
  ON public.comunicado_destinatarios(comunicado_id);

CREATE INDEX IF NOT EXISTS idx_comunicado_destinatarios_visualizado
  ON public.comunicado_destinatarios(comunicado_id, visualizado_em);

DROP TRIGGER IF EXISTS trigger_update_comunicados_updated_at ON public.comunicados;
CREATE TRIGGER trigger_update_comunicados_updated_at
  BEFORE UPDATE ON public.comunicados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_comunicado_destinatarios_updated_at ON public.comunicado_destinatarios;
CREATE TRIGGER trigger_update_comunicado_destinatarios_updated_at
  BEFORE UPDATE ON public.comunicado_destinatarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- 2) RLS
-- --------------------------------------------------------------------------
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicado_destinatarios ENABLE ROW LEVEL SECURITY;

-- Comunicados: leitura para autenticados; escrita somente admin
DROP POLICY IF EXISTS comunicados_select_authenticated ON public.comunicados;
CREATE POLICY comunicados_select_authenticated
  ON public.comunicados FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS comunicados_insert_admin ON public.comunicados;
CREATE POLICY comunicados_insert_admin
  ON public.comunicados FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin']));

DROP POLICY IF EXISTS comunicados_update_admin ON public.comunicados;
CREATE POLICY comunicados_update_admin
  ON public.comunicados FOR UPDATE
  TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin']));

DROP POLICY IF EXISTS comunicados_delete_admin ON public.comunicados;
CREATE POLICY comunicados_delete_admin
  ON public.comunicados FOR DELETE
  TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin']));

-- Destinatarios: usuario ve/atualiza somente suas linhas; admin ve tudo
DROP POLICY IF EXISTS comunicado_destinatarios_select_own_or_admin ON public.comunicado_destinatarios;
CREATE POLICY comunicado_destinatarios_select_own_or_admin
  ON public.comunicado_destinatarios FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.current_user_has_any_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS comunicado_destinatarios_insert_admin ON public.comunicado_destinatarios;
CREATE POLICY comunicado_destinatarios_insert_admin
  ON public.comunicado_destinatarios FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin']));

DROP POLICY IF EXISTS comunicado_destinatarios_update_own_or_admin ON public.comunicado_destinatarios;
CREATE POLICY comunicado_destinatarios_update_own_or_admin
  ON public.comunicado_destinatarios FOR UPDATE
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.current_user_has_any_role(ARRAY['admin'])
  )
  WITH CHECK (
    usuario_id = auth.uid()
    OR public.current_user_has_any_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS comunicado_destinatarios_delete_admin ON public.comunicado_destinatarios;
CREATE POLICY comunicado_destinatarios_delete_admin
  ON public.comunicado_destinatarios FOR DELETE
  TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin']));

-- --------------------------------------------------------------------------
-- 3) RPC: publicar comunicado e distribuir para destinatarios
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_comunicado(
  p_titulo TEXT,
  p_mensagem_original TEXT,
  p_mensagem_publicada TEXT,
  p_estilo_ia TEXT DEFAULT NULL,
  p_escopo TEXT DEFAULT 'operadores',
  p_anexo_url TEXT DEFAULT NULL,
  p_anexo_nome TEXT DEFAULT NULL,
  p_anexo_mime TEXT DEFAULT NULL,
  p_anexo_tamanho BIGINT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comunicado_id UUID;
  v_actor UUID := auth.uid();
  v_scope TEXT := LOWER(COALESCE(p_escopo, 'operadores'));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF NOT public.current_user_has_any_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Apenas admin pode publicar comunicados.';
  END IF;

  IF v_scope NOT IN ('operadores', 'equipe') THEN
    v_scope := 'operadores';
  END IF;

  INSERT INTO public.comunicados (
    titulo,
    mensagem_original,
    mensagem_publicada,
    estilo_ia,
    escopo,
    anexo_url,
    anexo_nome,
    anexo_mime,
    anexo_tamanho,
    criado_por
  ) VALUES (
    p_titulo,
    p_mensagem_original,
    p_mensagem_publicada,
    p_estilo_ia,
    v_scope,
    p_anexo_url,
    p_anexo_nome,
    p_anexo_mime,
    p_anexo_tamanho,
    v_actor
  )
  RETURNING id INTO v_comunicado_id;

  INSERT INTO public.comunicado_destinatarios (comunicado_id, usuario_id)
  SELECT
    v_comunicado_id,
    u.id
  FROM public.usuarios u
  WHERE COALESCE(u.ativo, TRUE) = TRUE
    AND (
      v_scope = 'equipe'
      OR NOT ('admin' = ANY(COALESCE(u.role, ARRAY[]::TEXT[])))
    );

  RETURN v_comunicado_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_comunicado(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT
) TO authenticated;

-- --------------------------------------------------------------------------
-- 4) RPC: registrar leitura/acao do destinatario
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.comunicado_registrar_evento(
  p_comunicado_id UUID,
  p_evento TEXT DEFAULT 'visualizado'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_evento TEXT := LOWER(COALESCE(p_evento, 'visualizado'));
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF v_evento NOT IN ('visualizado', 'dispensado', 'download') THEN
    v_evento := 'visualizado';
  END IF;

  UPDATE public.comunicado_destinatarios
  SET
    visualizado_em = CASE
      WHEN v_evento IN ('visualizado', 'download') THEN COALESCE(visualizado_em, NOW())
      ELSE visualizado_em
    END,
    dispensado_em = CASE
      WHEN v_evento = 'dispensado' THEN COALESCE(dispensado_em, NOW())
      ELSE dispensado_em
    END,
    baixou_anexo_em = CASE
      WHEN v_evento = 'download' THEN COALESCE(baixou_anexo_em, NOW())
      ELSE baixou_anexo_em
    END
  WHERE comunicado_id = p_comunicado_id
    AND usuario_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comunicado não encontrado para o usuário atual.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.comunicado_registrar_evento(UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------------
-- 5) Bucket de anexos de comunicados (storage)
-- --------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comunicados',
  'comunicados',
  TRUE,
  104857600, -- 100MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS comunicados_bucket_read ON storage.objects;
CREATE POLICY comunicados_bucket_read
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'comunicados');

DROP POLICY IF EXISTS comunicados_bucket_insert_admin ON storage.objects;
CREATE POLICY comunicados_bucket_insert_admin
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comunicados'
    AND public.current_user_has_any_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS comunicados_bucket_update_admin ON storage.objects;
CREATE POLICY comunicados_bucket_update_admin
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'comunicados'
    AND public.current_user_has_any_role(ARRAY['admin'])
  )
  WITH CHECK (
    bucket_id = 'comunicados'
    AND public.current_user_has_any_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS comunicados_bucket_delete_admin ON storage.objects;
CREATE POLICY comunicados_bucket_delete_admin
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comunicados'
    AND public.current_user_has_any_role(ARRAY['admin'])
  );

COMMIT;

SELECT 'Script 206 executado: módulo de comunicados criado.' AS status;
