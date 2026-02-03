-- ============================================================================
-- Script 205: Notification system (outbox + notifications + deliveries)
-- ============================================================================
-- Adds:
-- - notification_events (outbox/log)
-- - notifications (user-facing)
-- - notification_deliveries (channel tracking)
-- - notify_create() with dedupe
-- - triggers for core events
-- - SLA and weekly digest RPCs
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- 1) Tables
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_user_id UUID NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  link_url TEXT NULL,
  entity_type TEXT NULL,
  entity_id UUID NULL,
  event_type TEXT NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'desktop',
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT NULL,
  delivered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_entity
  ON public.notifications(entity_id);

CREATE INDEX IF NOT EXISTS idx_notification_events_status_created
  ON public.notification_events(status, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
  ON public.notification_deliveries(notification_id);

-- Realtime publication (Supabase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    END IF;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2) RLS (notifications only)
-- --------------------------------------------------------------------------
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No INSERT policy: inserts only via SECURITY DEFINER function.

-- --------------------------------------------------------------------------
-- 3) Helpers
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_precatorio_responsavel_id(p_precatorio_id UUID)
RETURNS UUID AS $$
DECLARE
  v_responsavel UUID;
  v_responsavel_calculo UUID;
  v_dono UUID;
  v_criado UUID;
  v_result UUID;
BEGIN
  SELECT responsavel, responsavel_calculo_id, dono_usuario_id, criado_por
  INTO v_responsavel, v_responsavel_calculo, v_dono, v_criado
  FROM public.precatorios
  WHERE id = p_precatorio_id;

  v_result := COALESCE(v_responsavel, v_responsavel_calculo, v_dono, v_criado);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_create(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_kind TEXT DEFAULT 'info',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_link_url TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_actor UUID;
  v_now TIMESTAMPTZ := NOW();
  v_payload JSONB;
BEGIN
  v_actor := COALESCE(NULLIF(p_payload->>'actor_user_id', '')::uuid, auth.uid());
  v_payload := COALESCE(p_payload, '{}'::jsonb);
  IF p_user_id IS NOT NULL THEN
    v_payload := jsonb_set(v_payload, '{target_user_id}', to_jsonb(p_user_id), true);
  END IF;
  IF v_actor IS NOT NULL THEN
    v_payload := jsonb_set(v_payload, '{actor_user_id}', to_jsonb(v_actor), true);
  END IF;

  -- Always log the event
  INSERT INTO public.notification_events (
    event_type,
    entity_type,
    entity_id,
    actor_user_id,
    payload,
    created_at,
    processed_at,
    status
  ) VALUES (
    COALESCE(p_event_type, 'unknown'),
    COALESCE(p_entity_type, 'unknown'),
    COALESCE(p_entity_id, gen_random_uuid()),
    v_actor,
    v_payload,
    v_now,
    v_now,
    'processed'
  );

  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Dedupe: same user + event + entity within 2 minutes
  SELECT id INTO v_existing_id
  FROM public.notifications
  WHERE user_id = p_user_id
    AND COALESCE(event_type, '') = COALESCE(p_event_type, '')
    AND COALESCE(entity_id::text, '') = COALESCE(p_entity_id::text, '')
    AND created_at >= v_now - INTERVAL '2 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    kind,
    link_url,
    entity_type,
    entity_id,
    event_type,
    created_at
  ) VALUES (
    p_user_id,
    p_title,
    p_body,
    COALESCE(p_kind, 'info'),
    p_link_url,
    p_entity_type,
    p_entity_id,
    p_event_type,
    v_now
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.notify_create TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_precatorio_responsavel_id TO authenticated;

-- --------------------------------------------------------------------------
-- 4) Delivery tracking (auto row per notification)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_notification_delivery()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_deliveries (notification_id, channel, status)
  VALUES (NEW.id, 'desktop', 'queued');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enqueue_notification_delivery ON public.notifications;
CREATE TRIGGER trigger_enqueue_notification_delivery
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_notification_delivery();

-- --------------------------------------------------------------------------
-- 5) Triggers for events
-- --------------------------------------------------------------------------
-- A) Kanban stage change
CREATE OR REPLACE FUNCTION public.notify_precatorio_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
  v_link TEXT;
BEGIN
  IF NEW.status_kanban IS DISTINCT FROM OLD.status_kanban THEN
    v_user := public.resolve_precatorio_responsavel_id(NEW.id);
    v_link := '/precatorios/detalhes?id=' || NEW.id;
    PERFORM public.notify_create(
      v_user,
      'Etapa atualizada',
      'De ' || COALESCE(OLD.status_kanban, '-') || ' para ' || COALESCE(NEW.status_kanban, '-'),
      'info',
      'precatorio',
      NEW.id,
      'precatorio.stage_changed',
      v_link,
      jsonb_build_object('from', OLD.status_kanban, 'to', NEW.status_kanban, 'actor_user_id', auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_precatorio_stage_change ON public.precatorios;
CREATE TRIGGER trigger_notify_precatorio_stage_change
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_precatorio_stage_change();

-- B) Documento anexado
CREATE OR REPLACE FUNCTION public.notify_documento_anexado()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
  v_link TEXT;
  v_doc TEXT;
BEGIN
  v_user := public.resolve_precatorio_responsavel_id(NEW.precatorio_id);
  v_link := '/precatorios/detalhes?id=' || NEW.precatorio_id;
  v_doc := COALESCE(NEW.tipo_documento, 'documento');

  PERFORM public.notify_create(
    v_user,
    'Documento anexado',
    'Documento anexado: ' || v_doc,
    'info',
    'precatorio',
    NEW.precatorio_id,
    'precatorio.documento_anexado',
    v_link,
    jsonb_build_object('tipo_documento', NEW.tipo_documento, 'actor_user_id', auth.uid())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documentos_precatorio'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_notify_documento_anexado ON public.documentos_precatorio';
    EXECUTE 'CREATE TRIGGER trigger_notify_documento_anexado
      AFTER INSERT ON public.documentos_precatorio
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_documento_anexado()';
  ELSE
    RAISE NOTICE 'TODO: table documentos_precatorio not found; skip trigger_notify_documento_anexado.';
  END IF;
END $$;

-- C) Pendencia criada (precatorio_itens)
CREATE OR REPLACE FUNCTION public.notify_pendencia_criada()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
  v_link TEXT;
  v_tipo TEXT;
BEGIN
  v_user := public.resolve_precatorio_responsavel_id(NEW.precatorio_id);
  v_link := '/precatorios/detalhes?id=' || NEW.precatorio_id;
  v_tipo := COALESCE(NEW.tipo_grupo, 'ITEM');

  PERFORM public.notify_create(
    v_user,
    'Pendencia criada',
    'Novo item: ' || COALESCE(NEW.nome_item, '-') || ' (' || v_tipo || ')',
    'info',
    'precatorio',
    NEW.precatorio_id,
    'precatorio.pendencia_criada',
    v_link,
    jsonb_build_object('tipo_grupo', NEW.tipo_grupo, 'status_item', NEW.status_item, 'actor_user_id', auth.uid())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'precatorio_itens'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_notify_pendencia_criada ON public.precatorio_itens';
    EXECUTE 'CREATE TRIGGER trigger_notify_pendencia_criada
      AFTER INSERT ON public.precatorio_itens
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_pendencia_criada()';
  ELSE
    RAISE NOTICE 'TODO: table precatorio_itens not found; skip trigger_notify_pendencia_criada.';
  END IF;
END $$;

-- D) Calculo concluido
CREATE OR REPLACE FUNCTION public.notify_calculo_concluido()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
  v_link TEXT;
BEGIN
  v_user := public.resolve_precatorio_responsavel_id(NEW.precatorio_id);
  v_link := '/precatorios/detalhes?id=' || NEW.precatorio_id;

  PERFORM public.notify_create(
    v_user,
    'Calculo concluido',
    'Versao ' || NEW.versao || ' registrada.',
    'info',
    'precatorio',
    NEW.precatorio_id,
    'precatorio.calculo_concluido',
    v_link,
    jsonb_build_object('versao', NEW.versao, 'actor_user_id', NEW.created_by)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'precatorio_calculos'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_notify_calculo_concluido ON public.precatorio_calculos';
    EXECUTE 'CREATE TRIGGER trigger_notify_calculo_concluido
      AFTER INSERT ON public.precatorio_calculos
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_calculo_concluido()';
  ELSE
    RAISE NOTICE 'TODO: table precatorio_calculos not found; skip trigger_notify_calculo_concluido.';
  END IF;
END $$;

-- E) IRPF / PSS
CREATE OR REPLACE FUNCTION public.notify_irpf_pss()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
  v_link TEXT;
BEGIN
  v_user := public.resolve_precatorio_responsavel_id(NEW.id);
  v_link := '/precatorios/detalhes?id=' || NEW.id;

  IF NEW.irpf_isento IS DISTINCT FROM OLD.irpf_isento AND NEW.irpf_isento IS TRUE THEN
    PERFORM public.notify_create(
      v_user,
      'IRPF isento',
      'IRPF marcado como isento.',
      'info',
      'precatorio',
      NEW.id,
      'precatorio.irpf_isento',
      v_link,
      jsonb_build_object('irpf_isento', NEW.irpf_isento, 'actor_user_id', auth.uid())
    );
  ELSIF NEW.irpf_valor IS DISTINCT FROM OLD.irpf_valor THEN
    PERFORM public.notify_create(
      v_user,
      'IRPF calculado',
      'Valor IRPF: R$ ' || COALESCE(NEW.irpf_valor::text, '0'),
      'warn',
      'precatorio',
      NEW.id,
      'precatorio.irpf_calculado',
      v_link,
      jsonb_build_object('irpf_valor', NEW.irpf_valor, 'actor_user_id', auth.uid())
    );
  END IF;

  IF NEW.pss_valor IS DISTINCT FROM OLD.pss_valor THEN
    IF COALESCE(NEW.pss_valor, 0) = 0 THEN
      PERFORM public.notify_create(
        v_user,
        'PSS isento',
        'PSS marcado como isento.',
        'info',
        'precatorio',
        NEW.id,
        'precatorio.pss_isento',
        v_link,
        jsonb_build_object('pss_valor', NEW.pss_valor, 'actor_user_id', auth.uid())
      );
    ELSE
      PERFORM public.notify_create(
        v_user,
        'PSS calculado',
        'Valor PSS: R$ ' || COALESCE(NEW.pss_valor::text, '0'),
        'warn',
        'precatorio',
        NEW.id,
        'precatorio.pss_calculado',
        v_link,
        jsonb_build_object('pss_valor', NEW.pss_valor, 'actor_user_id', auth.uid())
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_irpf_pss ON public.precatorios;
CREATE TRIGGER trigger_notify_irpf_pss
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_irpf_pss();

-- F) Proposta gerada (tabela propostas)
CREATE OR REPLACE FUNCTION public.notify_proposta_gerada()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
  v_link TEXT;
BEGIN
  v_user := public.resolve_precatorio_responsavel_id(NEW.precatorio_id);
  v_link := '/precatorios/detalhes?id=' || NEW.precatorio_id;

  PERFORM public.notify_create(
    v_user,
    'Proposta gerada',
    'Nova proposta: R$ ' || COALESCE(NEW.valor_proposta::text, '0') || ' (' || COALESCE(NEW.percentual_desconto::text, '0') || '%)',
    'info',
    'precatorio',
    NEW.precatorio_id,
    'precatorio.proposta_gerada',
    v_link,
    jsonb_build_object('valor_proposta', NEW.valor_proposta, 'percentual_desconto', NEW.percentual_desconto, 'actor_user_id', NEW.usuario_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'propostas'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_notify_proposta_gerada ON public.propostas';
    EXECUTE 'CREATE TRIGGER trigger_notify_proposta_gerada
      AFTER INSERT ON public.propostas
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_proposta_gerada()';
  ELSE
    RAISE NOTICE 'TODO: table propostas not found; skip trigger_notify_proposta_gerada.';
  END IF;
END $$;

-- G) Faixa de proposta alterada (percentuais no precatorio)
CREATE OR REPLACE FUNCTION public.notify_proposta_faixa_alterada()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
  v_link TEXT;
BEGIN
  IF NEW.proposta_menor_percentual IS DISTINCT FROM OLD.proposta_menor_percentual
     OR NEW.proposta_maior_percentual IS DISTINCT FROM OLD.proposta_maior_percentual THEN

    v_user := public.resolve_precatorio_responsavel_id(NEW.id);
    v_link := '/precatorios/detalhes?id=' || NEW.id;

    PERFORM public.notify_create(
      v_user,
      'Faixa de proposta alterada',
      'Min: ' || COALESCE(NEW.proposta_menor_percentual::text, '0') || '% | Max: ' || COALESCE(NEW.proposta_maior_percentual::text, '0') || '%',
      'info',
      'precatorio',
      NEW.id,
      'precatorio.proposta_faixa_alterada',
      v_link,
      jsonb_build_object('min', NEW.proposta_menor_percentual, 'max', NEW.proposta_maior_percentual, 'actor_user_id', auth.uid())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_proposta_faixa_alterada ON public.precatorios;
CREATE TRIGGER trigger_notify_proposta_faixa_alterada
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_proposta_faixa_alterada();

-- H) Juridico liberou fechamento / pediu ajuste
CREATE OR REPLACE FUNCTION public.notify_juridico()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
  v_link TEXT;
BEGIN
  v_user := public.resolve_precatorio_responsavel_id(NEW.id);
  v_link := '/precatorios/detalhes?id=' || NEW.id;

  IF NEW.juridico_liberou_fechamento IS DISTINCT FROM OLD.juridico_liberou_fechamento
     AND NEW.juridico_liberou_fechamento IS TRUE THEN
    PERFORM public.notify_create(
      v_user,
      'Juridico liberou fechamento',
      'Fechamento liberado pelo juridico.',
      'critical',
      'precatorio',
      NEW.id,
      'precatorio.juridico_liberou_fechamento',
      v_link,
      jsonb_build_object('juridico_liberou_fechamento', NEW.juridico_liberou_fechamento, 'actor_user_id', auth.uid())
    );
  END IF;

  IF NEW.juridico_parecer_status IS DISTINCT FROM OLD.juridico_parecer_status
     AND NEW.juridico_parecer_status = 'AJUSTAR_DADOS' THEN
    PERFORM public.notify_create(
      v_user,
      'Juridico pediu ajuste',
      'Parecer juridico solicitou ajustes.',
      'warn',
      'precatorio',
      NEW.id,
      'precatorio.juridico_ajuste_solicitado',
      v_link,
      jsonb_build_object('juridico_parecer_status', NEW.juridico_parecer_status, 'actor_user_id', auth.uid())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_juridico ON public.precatorios;
CREATE TRIGGER trigger_notify_juridico
  AFTER UPDATE ON public.precatorios
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_juridico();

-- I) Comentario com mencao
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_link TEXT;
  v_user UUID;
BEGIN
  v_link := '/precatorios/detalhes?id=' || NEW.precatorio_id;

  FOR v_user IN
    SELECT id
    FROM public.usuarios
    WHERE LOWER(NEW.texto) LIKE '%' || '@' || LOWER(email) || '%'
  LOOP
    IF v_user IS NOT NULL AND v_user <> NEW.usuario_id THEN
      PERFORM public.notify_create(
        v_user,
        'Voce foi mencionado',
        'Mencao em comentario no precatorio.',
        'info',
        'precatorio',
        NEW.precatorio_id,
        'comment.mention',
        v_link,
        jsonb_build_object('actor_user_id', NEW.usuario_id)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'comentarios'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_notify_comment_mentions ON public.comentarios';
    EXECUTE 'CREATE TRIGGER trigger_notify_comment_mentions
      AFTER INSERT ON public.comentarios
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_comment_mentions()';
  ELSE
    RAISE NOTICE 'TODO: table comentarios not found; skip trigger_notify_comment_mentions.';
  END IF;
END $$;

-- J) Chat message mentions (optional)
CREATE OR REPLACE FUNCTION public.notify_chat_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_link TEXT;
  v_user UUID;
BEGIN
  IF NEW.precatorio_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_link := '/precatorios/detalhes?id=' || NEW.precatorio_id;

  FOR v_user IN
    SELECT id
    FROM public.usuarios
    WHERE LOWER(NEW.texto) LIKE '%' || '@' || LOWER(email) || '%'
  LOOP
    IF v_user IS NOT NULL AND v_user <> NEW.remetente_id THEN
      PERFORM public.notify_create(
        v_user,
        'Voce foi mencionado',
        'Mencao em mensagem do chat.',
        'info',
        'precatorio',
        NEW.precatorio_id,
        'chat.mention',
        v_link,
        jsonb_build_object('actor_user_id', NEW.remetente_id)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_mensagens'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_notify_chat_mentions ON public.chat_mensagens';
    EXECUTE 'CREATE TRIGGER trigger_notify_chat_mentions
      AFTER INSERT ON public.chat_mensagens
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_chat_mentions()';
  ELSE
    RAISE NOTICE 'TODO: table chat_mensagens not found; skip trigger_notify_chat_mentions.';
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 6) SLA (certidoes pendentes ha X dias)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_sla_and_enqueue(p_days INTEGER DEFAULT 15)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_prec_id UUID;
  v_user UUID;
  v_link TEXT;
  v_exists BOOLEAN;
BEGIN
  FOR v_prec_id IN
    SELECT DISTINCT pi.precatorio_id
    FROM public.precatorio_itens pi
    WHERE pi.tipo_grupo = 'CERTIDAO'
      AND pi.status_item IN ('PENDENTE', 'SOLICITADO', 'INCOMPLETO', 'VENCIDO')
      AND pi.created_at <= NOW() - (p_days || ' days')::interval
  LOOP
    v_user := public.resolve_precatorio_responsavel_id(v_prec_id);
    v_link := '/precatorios/detalhes?id=' || v_prec_id;

    SELECT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = v_user
        AND n.event_type = 'precatorio.sla_certidoes'
        AND n.entity_id = v_prec_id
        AND n.created_at >= NOW() - INTERVAL '1 day'
    ) INTO v_exists;

    IF v_exists IS FALSE THEN
      PERFORM public.notify_create(
        v_user,
        'SLA estourando (Certidoes)',
        'Certidoes pendentes ha mais de ' || p_days || ' dias.',
        'warn',
        'precatorio',
        v_prec_id,
        'precatorio.sla_certidoes',
        v_link,
        jsonb_build_object('days', p_days)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_sla_and_enqueue TO authenticated;

-- --------------------------------------------------------------------------
-- 7) Weekly digest (summary)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.weekly_digest_generate()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user UUID;
  v_total INTEGER;
BEGIN
  FOR v_user, v_total IN
    SELECT
      (payload->>'target_user_id')::uuid AS user_id,
      COUNT(*) AS total_events
    FROM public.notification_events
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND event_type <> 'digest.weekly'
      AND payload ? 'target_user_id'
    GROUP BY 1
  LOOP
    IF v_user IS NOT NULL AND v_total > 0 THEN
      PERFORM public.notify_create(
        v_user,
        'Resumo semanal',
        'Voce tem ' || v_total || ' eventos na ultima semana.',
        'info',
        'digest',
        gen_random_uuid(),
        'digest.weekly',
        '/notificacoes',
        jsonb_build_object('count', v_total)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.weekly_digest_generate TO authenticated;

COMMIT;

SELECT 'Script 205 executed: notifications system created.' as status;
