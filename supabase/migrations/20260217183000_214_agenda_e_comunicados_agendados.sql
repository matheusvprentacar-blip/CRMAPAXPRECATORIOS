BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NULL,
  tipo TEXT NOT NULL DEFAULT 'lembrete'
    CHECK (tipo IN ('lembrete', 'reuniao', 'tarefa', 'comunicado')),
  status TEXT NOT NULL DEFAULT 'agendado'
    CHECK (status IN ('agendado', 'concluido', 'cancelado')),
  prioridade TEXT NOT NULL DEFAULT 'media'
    CHECK (prioridade IN ('baixa', 'media', 'alta')),
  inicio_em TIMESTAMPTZ NOT NULL,
  fim_em TIMESTAMPTZ NULL,
  dia_inteiro BOOLEAN NOT NULL DEFAULT FALSE,
  local TEXT NULL,
  precatorio_id UUID NULL REFERENCES public.precatorios(id) ON DELETE SET NULL,
  criado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destino TEXT NOT NULL DEFAULT 'pessoal'
    CHECK (destino IN ('pessoal', 'equipe', 'operadores', 'individual')),
  destinatario_usuario_id UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  enviar_alerta BOOLEAN NOT NULL DEFAULT TRUE,
  alerta_antecedencia_min INTEGER NOT NULL DEFAULT 30 CHECK (alerta_antecedencia_min >= 0),
  alerta_disparado_em TIMESTAMPTZ NULL,
  disparar_como_comunicado BOOLEAN NOT NULL DEFAULT FALSE,
  comunicado_titulo TEXT NULL,
  comunicado_mensagem TEXT NULL,
  comunicado_publicado_id UUID NULL REFERENCES public.comunicados(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agenda_eventos_fim_maior_que_inicio CHECK (fim_em IS NULL OR fim_em >= inicio_em),
  CONSTRAINT agenda_eventos_destinatario_individual_ck CHECK (
    (destino = 'individual' AND destinatario_usuario_id IS NOT NULL)
    OR (destino <> 'individual')
  )
);

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_inicio_em
  ON public.agenda_eventos(inicio_em);

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_status_inicio
  ON public.agenda_eventos(status, inicio_em);

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_criado_por
  ON public.agenda_eventos(criado_por, inicio_em DESC);

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_destino
  ON public.agenda_eventos(destino, inicio_em DESC);

DROP TRIGGER IF EXISTS trigger_update_agenda_eventos_updated_at ON public.agenda_eventos;
CREATE TRIGGER trigger_update_agenda_eventos_updated_at
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agenda_eventos_select_policy ON public.agenda_eventos;
CREATE POLICY agenda_eventos_select_policy
  ON public.agenda_eventos FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      criado_por = auth.uid()
      OR destino IN ('equipe', 'operadores')
      OR (destino = 'individual' AND destinatario_usuario_id = auth.uid())
      OR public.current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  );

DROP POLICY IF EXISTS agenda_eventos_insert_policy ON public.agenda_eventos;
CREATE POLICY agenda_eventos_insert_policy
  ON public.agenda_eventos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      criado_por = auth.uid()
      OR public.current_user_has_any_role(ARRAY['admin'])
    )
    AND (
      destino = 'pessoal'
      OR public.current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
    AND (
      disparar_como_comunicado = FALSE
      OR public.current_user_has_any_role(ARRAY['admin'])
    )
  );

DROP POLICY IF EXISTS agenda_eventos_update_policy ON public.agenda_eventos;
CREATE POLICY agenda_eventos_update_policy
  ON public.agenda_eventos FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      criado_por = auth.uid()
      OR public.current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      criado_por = auth.uid()
      OR public.current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
    AND (
      destino = 'pessoal'
      OR public.current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
    AND (
      disparar_como_comunicado = FALSE
      OR public.current_user_has_any_role(ARRAY['admin'])
    )
  );

DROP POLICY IF EXISTS agenda_eventos_delete_policy ON public.agenda_eventos;
CREATE POLICY agenda_eventos_delete_policy
  ON public.agenda_eventos FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      criado_por = auth.uid()
      OR public.current_user_has_any_role(ARRAY['admin', 'gestor'])
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agenda_eventos TO authenticated;

CREATE OR REPLACE FUNCTION public.processar_agenda_eventos_pendentes(
  p_reference TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_user RECORD;
  v_alert_count INTEGER := 0;
  v_comunicado_count INTEGER := 0;
  v_comunicado_id UUID;
  v_notify_exists BOOLEAN :=
    to_regprocedure('public.notify_create(uuid,text,text,text,text,uuid,text,text,jsonb)') IS NOT NULL;
BEGIN
  FOR v_event IN
    SELECT *
    FROM public.agenda_eventos
    WHERE status = 'agendado'
      AND (
        (
          enviar_alerta = TRUE
          AND alerta_disparado_em IS NULL
          AND (inicio_em - make_interval(mins => GREATEST(alerta_antecedencia_min, 0))) <= p_reference
        )
        OR
        (
          disparar_como_comunicado = TRUE
          AND comunicado_publicado_id IS NULL
          AND inicio_em <= p_reference
        )
      )
    ORDER BY inicio_em ASC
  LOOP
    IF v_event.enviar_alerta = TRUE
      AND v_event.alerta_disparado_em IS NULL
      AND (v_event.inicio_em - make_interval(mins => GREATEST(v_event.alerta_antecedencia_min, 0))) <= p_reference
    THEN
      FOR v_user IN
        WITH recipients AS (
          SELECT CASE
            WHEN v_event.destino = 'pessoal' THEN v_event.criado_por
            WHEN v_event.destino = 'individual' THEN v_event.destinatario_usuario_id
            ELSE NULL::UUID
          END AS usuario_id
          UNION
          SELECT u.id
          FROM public.usuarios u
          WHERE COALESCE(u.ativo, TRUE) = TRUE
            AND v_event.destino = 'equipe'
          UNION
          SELECT u.id
          FROM public.usuarios u
          WHERE COALESCE(u.ativo, TRUE) = TRUE
            AND v_event.destino = 'operadores'
            AND (
              'operador' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
              OR 'operador_comercial' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
              OR 'operador_calculo' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
            )
        )
        SELECT DISTINCT usuario_id
        FROM recipients
        WHERE usuario_id IS NOT NULL
      LOOP
        IF v_notify_exists THEN
          PERFORM public.notify_create(
            v_user.usuario_id,
            'Agenda - ' || COALESCE(NULLIF(v_event.titulo, ''), 'Compromisso'),
            COALESCE(
              NULLIF(v_event.descricao, ''),
              'Voce possui um compromisso agendado em ' ||
              to_char(v_event.inicio_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
            ),
            'info',
            'agenda_evento',
            v_event.id,
            'agenda_alerta',
            '/agenda?eventoId=' || v_event.id::TEXT,
            jsonb_build_object(
              'agenda_evento_id', v_event.id,
              'source', 'agenda_scheduler'
            )
          );
        ELSE
          INSERT INTO public.notifications (
            user_id,
            title,
            body,
            kind,
            link_url,
            entity_type,
            entity_id,
            event_type
          ) VALUES (
            v_user.usuario_id,
            'Agenda - ' || COALESCE(NULLIF(v_event.titulo, ''), 'Compromisso'),
            COALESCE(
              NULLIF(v_event.descricao, ''),
              'Voce possui um compromisso agendado em ' ||
              to_char(v_event.inicio_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
            ),
            'info',
            '/agenda?eventoId=' || v_event.id::TEXT,
            'agenda_evento',
            v_event.id,
            'agenda_alerta'
          );
        END IF;
        v_alert_count := v_alert_count + 1;
      END LOOP;

      UPDATE public.agenda_eventos
      SET alerta_disparado_em = p_reference,
          updated_at = NOW()
      WHERE id = v_event.id;
    END IF;

    IF v_event.disparar_como_comunicado = TRUE
      AND v_event.comunicado_publicado_id IS NULL
      AND v_event.inicio_em <= p_reference
    THEN
      INSERT INTO public.comunicados (
        titulo,
        mensagem_original,
        mensagem_publicada,
        estilo_ia,
        escopo,
        criado_por
      ) VALUES (
        COALESCE(NULLIF(v_event.comunicado_titulo, ''), NULLIF(v_event.titulo, ''), 'Comunicado agendado'),
        COALESCE(NULLIF(v_event.comunicado_mensagem, ''), NULLIF(v_event.descricao, ''), 'Comunicado agendado automaticamente pela agenda.'),
        COALESCE(NULLIF(v_event.comunicado_mensagem, ''), NULLIF(v_event.descricao, ''), 'Comunicado agendado automaticamente pela agenda.'),
        'agenda_automatica',
        CASE WHEN v_event.destino = 'operadores' THEN 'operadores' ELSE 'equipe' END,
        v_event.criado_por
      )
      RETURNING id INTO v_comunicado_id;

      INSERT INTO public.comunicado_destinatarios (comunicado_id, usuario_id)
      WITH recipients AS (
        SELECT CASE
          WHEN v_event.destino = 'pessoal' THEN v_event.criado_por
          WHEN v_event.destino = 'individual' THEN v_event.destinatario_usuario_id
          ELSE NULL::UUID
        END AS usuario_id
        UNION
        SELECT u.id
        FROM public.usuarios u
        WHERE COALESCE(u.ativo, TRUE) = TRUE
          AND v_event.destino = 'equipe'
        UNION
        SELECT u.id
        FROM public.usuarios u
        WHERE COALESCE(u.ativo, TRUE) = TRUE
          AND v_event.destino = 'operadores'
          AND (
            'operador' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
            OR 'operador_comercial' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
            OR 'operador_calculo' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
          )
      )
      SELECT v_comunicado_id, usuario_id
      FROM recipients
      WHERE usuario_id IS NOT NULL
      ON CONFLICT (comunicado_id, usuario_id) DO NOTHING;

      UPDATE public.agenda_eventos
      SET comunicado_publicado_id = v_comunicado_id,
          updated_at = NOW()
      WHERE id = v_event.id;

      v_comunicado_count := v_comunicado_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'processed_at', p_reference,
    'alerts_created', v_alert_count,
    'comunicados_publicados', v_comunicado_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.processar_agenda_eventos_pendentes(TIMESTAMPTZ) TO authenticated;

COMMIT;
