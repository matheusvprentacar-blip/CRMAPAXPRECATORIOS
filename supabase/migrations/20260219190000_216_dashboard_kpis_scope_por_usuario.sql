BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_kpis(
  p_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fim TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = v_user_id
        AND 'admin' = ANY(COALESCE(u.role, ARRAY[]::TEXT[]))
    ) INTO v_is_admin;
  END IF;

  WITH scoped_precatorios AS (
    SELECT p.*
    FROM public.precatorios p
    WHERE p.deleted_at IS NULL
      AND (
        v_is_admin
        OR (
          v_user_id IS NOT NULL
          AND (
            p.criado_por = v_user_id
            OR p.responsavel = v_user_id
            OR p.responsavel_calculo_id = v_user_id
            OR NULLIF(to_jsonb(p) ->> 'dono_usuario_id', '')::UUID = v_user_id
            OR NULLIF(to_jsonb(p) ->> 'responsavel_certidoes_id', '')::UUID = v_user_id
            OR NULLIF(to_jsonb(p) ->> 'responsavel_oficio_id', '')::UUID = v_user_id
            OR NULLIF(to_jsonb(p) ->> 'responsavel_juridico_id', '')::UUID = v_user_id
          )
        )
      )
  ),
  scoped_propostas AS (
    SELECT pr.*
    FROM public.propostas pr
    JOIN scoped_precatorios sp ON sp.id = pr.precatorio_id
  ),
  scoped_propostas_dashboard AS (
    SELECT
      COALESCE(pr.status, 'sem_status')::TEXT AS status,
      COALESCE(pr.valor_proposta, 0)::NUMERIC AS valor_proposta,
      COALESCE(pr.percentual_desconto, 0)::NUMERIC AS percentual_desconto,
      pr.created_at AS created_at
    FROM scoped_propostas pr

    UNION ALL

    SELECT
      CASE
        WHEN sp.status_kanban = 'proposta_aceita' THEN 'proposta_aceita'
        WHEN sp.status_kanban = 'proposta_negociacao' THEN 'proposta_negociacao'
        ELSE 'proposta_calculada'
      END::TEXT AS status,
      GREATEST(COALESCE(sp.proposta_maior_valor, 0), COALESCE(sp.proposta_menor_valor, 0))::NUMERIC AS valor_proposta,
      GREATEST(COALESCE(sp.proposta_maior_percentual, 0), COALESCE(sp.proposta_menor_percentual, 0))::NUMERIC AS percentual_desconto,
      sp.updated_at AS created_at
    FROM scoped_precatorios sp
    WHERE NOT EXISTS (SELECT 1 FROM scoped_propostas)
      AND (
        COALESCE(sp.proposta_maior_valor, 0) > 0
        OR COALESCE(sp.proposta_menor_valor, 0) > 0
      )
  ),
  scoped_precatorio_calculos AS (
    SELECT pc.*
    FROM public.precatorio_calculos pc
    JOIN scoped_precatorios sp ON sp.id = pc.precatorio_id
  ),
  scoped_itens AS (
    SELECT pi.*
    FROM public.precatorio_itens pi
    JOIN scoped_precatorios sp ON sp.id = pi.precatorio_id
  ),
  scoped_atividades AS (
    SELECT a.*
    FROM public.atividades a
    WHERE (p_inicio IS NULL OR a.created_at >= p_inicio)
      AND (p_fim IS NULL OR a.created_at <= p_fim)
      AND (
        v_is_admin
        OR (v_user_id IS NOT NULL AND a.usuario_id = v_user_id)
        OR EXISTS (
          SELECT 1
          FROM scoped_precatorios sp
          WHERE sp.id = a.precatorio_id
        )
      )
  ),
  scoped_chat_periodo AS (
    SELECT cm.*
    FROM public.chat_mensagens cm
    WHERE (p_inicio IS NULL OR cm.created_at >= p_inicio)
      AND (p_fim IS NULL OR cm.created_at <= p_fim)
      AND (
        v_is_admin
        OR (
          v_user_id IS NOT NULL
          AND (
            cm.remetente_id = v_user_id
            OR cm.destinatario_id = v_user_id
          )
        )
      )
  ),
  scoped_chat_unread AS (
    SELECT cm.*
    FROM public.chat_mensagens cm
    WHERE cm.lida IS FALSE
      AND (
        v_is_admin
        OR (v_user_id IS NOT NULL AND cm.destinatario_id = v_user_id)
      )
  ),
  credores_base AS (
    SELECT
      COALESCE(
        NULLIF(sp.credor_cpf_cnpj, ''),
        'SEM_CPF_' || md5(COALESCE(NULLIF(sp.credor_nome, ''), sp.id::TEXT))
      ) AS credor_key,
      COALESCE(sp.valor_principal, 0) AS valor_principal
    FROM scoped_precatorios sp
    WHERE COALESCE(NULLIF(sp.credor_nome, ''), '') <> ''
  ),
  credores_agg AS (
    SELECT
      COUNT(*)::BIGINT AS total_credores,
      COALESCE(SUM(valor_principal), 0)::NUMERIC AS valor_total_principal
    FROM (
      SELECT credor_key, SUM(valor_principal) AS valor_principal
      FROM credores_base
      GROUP BY credor_key
    ) c
  ),
  usuarios_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE u.ativo IS TRUE)::BIGINT AS ativos_total,
      COALESCE((
        SELECT jsonb_object_agg(role_key, total_role)
        FROM (
          SELECT role_key, COUNT(*) AS total_role
          FROM (
            SELECT jsonb_array_elements_text(
              CASE
                WHEN jsonb_typeof(to_jsonb(u2.role)) = 'array'
                  THEN to_jsonb(u2.role)
                ELSE jsonb_build_array(u2.role)
              END
            ) AS role_key
            FROM public.usuarios u2
            WHERE u2.ativo IS TRUE
              AND (
                v_is_admin
                OR (v_user_id IS NOT NULL AND u2.id = v_user_id)
              )
          ) expanded_roles
          GROUP BY role_key
        ) grouped_roles
      ), '{}'::jsonb) AS por_role
    FROM public.usuarios u
    WHERE u.ativo IS TRUE
      AND (
        v_is_admin
        OR (v_user_id IS NOT NULL AND u.id = v_user_id)
      )
  ),
  sla_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE sp.sla_status = 'no_prazo')::BIGINT AS no_prazo,
      COUNT(*) FILTER (WHERE sp.sla_status = 'atencao')::BIGINT AS atencao,
      COUNT(*) FILTER (WHERE sp.sla_status = 'atrasado')::BIGINT AS atrasado,
      COUNT(*) FILTER (WHERE sp.sla_status = 'nao_iniciado')::BIGINT AS nao_iniciado,
      COUNT(*) FILTER (WHERE sp.sla_status = 'concluido')::BIGINT AS concluido,
      AVG(
        CASE
          WHEN sp.data_entrada_calculo IS NOT NULL
            AND sp.status <> 'em_calculo'
          THEN EXTRACT(EPOCH FROM (sp.updated_at - sp.data_entrada_calculo)) / 3600
          ELSE NULL
        END
      ) AS tempo_medio_calculo_horas,
      COUNT(*) FILTER (WHERE sp.status = 'em_calculo')::BIGINT AS total_em_calculo
    FROM scoped_precatorios sp
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim),

    'resumo', jsonb_build_object(
      'total_precatorios', (SELECT COUNT(*) FROM scoped_precatorios),
      'total_principal', (SELECT COALESCE(SUM(sp.valor_principal), 0) FROM scoped_precatorios sp),
      'total_atualizado', (SELECT COALESCE(SUM(sp.valor_atualizado), 0) FROM scoped_precatorios sp),
      'total_saldo_liquido', (SELECT COALESCE(SUM(sp.saldo_liquido), 0) FROM scoped_precatorios sp),
      'total_credores', (SELECT ca.total_credores FROM credores_agg ca),
      'total_propostas', (SELECT COUNT(*) FROM scoped_propostas_dashboard)
    ),

    'periodo_kpis', jsonb_build_object(
      'novos_precatorios', (
        SELECT COUNT(*)
        FROM scoped_precatorios sp
        WHERE (p_inicio IS NULL OR sp.created_at >= p_inicio)
          AND (p_fim IS NULL OR sp.created_at <= p_fim)
      ),
      'precatorios_atualizados', (
        SELECT COUNT(*)
        FROM scoped_precatorios sp
        WHERE (p_inicio IS NULL OR sp.updated_at >= p_inicio)
          AND (p_fim IS NULL OR sp.updated_at <= p_fim)
      ),
      'propostas_criadas', (
        SELECT COUNT(*)
        FROM scoped_propostas_dashboard pr
        WHERE (p_inicio IS NULL OR pr.created_at >= p_inicio)
          AND (p_fim IS NULL OR pr.created_at <= p_fim)
      ),
      'atividades_periodo', (SELECT COUNT(*) FROM scoped_atividades),
      'mensagens_chat_periodo', (SELECT COUNT(*) FROM scoped_chat_periodo)
    ),

    'kanban', jsonb_build_object(
      'quantidade_por_status', COALESCE((
        SELECT jsonb_object_agg(status_key, total)
        FROM (
          SELECT
            COALESCE(sp.status_kanban, sp.localizacao_kanban, sp.status, 'sem_status') AS status_key,
            COUNT(*) AS total
          FROM scoped_precatorios sp
          GROUP BY 1
        ) s
      ), '{}'::jsonb),
      'valor_por_status', COALESCE((
        SELECT jsonb_object_agg(status_key, total_valor)
        FROM (
          SELECT
            COALESCE(sp.status_kanban, sp.localizacao_kanban, sp.status, 'sem_status') AS status_key,
            COALESCE(SUM(COALESCE(NULLIF(sp.valor_atualizado, 0), sp.valor_principal, 0)), 0) AS total_valor
          FROM scoped_precatorios sp
          GROUP BY 1
        ) s
      ), '{}'::jsonb)
    ),

    'financeiro', jsonb_build_object(
      'pss_total', (SELECT COALESCE(SUM(sp.pss_valor), 0) FROM scoped_precatorios sp),
      'irpf_total', (SELECT COALESCE(SUM(sp.irpf_valor), 0) FROM scoped_precatorios sp),
      'honorarios_total', (SELECT COALESCE(SUM(sp.honorarios_valor), 0) FROM scoped_precatorios sp),
      'adiantamento_total', (SELECT COALESCE(SUM(sp.adiantamento_valor), 0) FROM scoped_precatorios sp),
      'irpf_isento', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.irpf_isento IS TRUE),
      'irpf_nao_isento', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.irpf_isento IS FALSE OR sp.irpf_isento IS NULL)
    ),

    'propostas', jsonb_build_object(
      'por_status', COALESCE((
        SELECT jsonb_object_agg(status, total)
        FROM (
          SELECT COALESCE(pr.status, 'sem_status') AS status, COUNT(*) AS total
          FROM scoped_propostas_dashboard pr
          GROUP BY COALESCE(pr.status, 'sem_status')
        ) s
      ), '{}'::jsonb),
      'valor_total', (SELECT COALESCE(SUM(pr.valor_proposta), 0) FROM scoped_propostas_dashboard pr),
      'ticket_medio', (SELECT COALESCE(AVG(pr.valor_proposta), 0) FROM scoped_propostas_dashboard pr),
      'desconto_medio', (
        SELECT COALESCE(AVG(pr.percentual_desconto), 0)
        FROM scoped_propostas_dashboard pr
        WHERE pr.percentual_desconto IS NOT NULL
      )
    ),

    'calculo', jsonb_build_object(
      'pronto_calculo', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.status_kanban = 'pronto_calculo'),
      'em_calculo', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.status_kanban = 'calculo_andamento'),
      'concluido', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.status_kanban = 'calculo_concluido'),
      'desatualizado', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.calculo_desatualizado IS TRUE),
      'versoes_media', COALESCE((
        SELECT AVG(qtd)
        FROM (
          SELECT pc.precatorio_id, COUNT(*)::NUMERIC AS qtd
          FROM scoped_precatorio_calculos pc
          GROUP BY pc.precatorio_id
        ) t
      ), 0)
    ),

    'sla', COALESCE((
      SELECT to_jsonb(sa)
      FROM sla_agg sa
    ), '{}'::jsonb),

    'documentos_certidoes', jsonb_build_object(
      'total_docs', (SELECT COUNT(*) FROM scoped_itens si WHERE si.tipo_grupo = 'DOC_CREDOR'),
      'docs_recebidos', (SELECT COUNT(*) FROM scoped_itens si WHERE si.tipo_grupo = 'DOC_CREDOR' AND si.status_item = 'RECEBIDO'),
      'total_certidoes', (SELECT COUNT(*) FROM scoped_itens si WHERE si.tipo_grupo = 'CERTIDAO'),
      'certidoes_recebidas', (SELECT COUNT(*) FROM scoped_itens si WHERE si.tipo_grupo = 'CERTIDAO' AND si.status_item = 'RECEBIDO'),
      'certidoes_vencidas', (SELECT COUNT(*) FROM scoped_itens si WHERE si.tipo_grupo = 'CERTIDAO' AND si.status_item = 'VENCIDO')
    ),

    'credores', jsonb_build_object(
      'total_credores', (SELECT ca.total_credores FROM credores_agg ca),
      'valor_total_principal', (SELECT ca.valor_total_principal FROM credores_agg ca)
    ),

    'usuarios', jsonb_build_object(
      'ativos_total', (SELECT ua.ativos_total FROM usuarios_agg ua),
      'por_role', (SELECT ua.por_role FROM usuarios_agg ua)
    ),

    'juridico', jsonb_build_object(
      'parecer_por_status', COALESCE((
        SELECT jsonb_object_agg(status_key, total)
        FROM (
          SELECT COALESCE(sp.juridico_parecer_status, 'sem_parecer') AS status_key, COUNT(*) AS total
          FROM scoped_precatorios sp
          GROUP BY 1
        ) s
      ), '{}'::jsonb),
      'resultado_final', COALESCE((
        SELECT jsonb_object_agg(resultado_key, total)
        FROM (
          SELECT COALESCE(sp.juridico_resultado_final, 'sem_resultado') AS resultado_key, COUNT(*) AS total
          FROM scoped_precatorios sp
          GROUP BY 1
        ) s
      ), '{}'::jsonb)
    ),

    'oficios', jsonb_build_object(
      'analise_processual_inicial', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.status_kanban = 'analise_processual_inicial'),
      'aguardando_oficio', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.status_kanban = 'aguardando_oficio'),
      'com_oficio', (SELECT COUNT(*) FROM scoped_precatorios sp WHERE sp.file_url IS NOT NULL AND sp.file_url <> '')
    ),

    'atividades', jsonb_build_object(
      'por_tipo', COALESCE((
        SELECT jsonb_object_agg(tipo, total)
        FROM (
          SELECT sa.tipo, COUNT(*) AS total
          FROM scoped_atividades sa
          GROUP BY sa.tipo
        ) s
      ), '{}'::jsonb)
    ),

    'chat', jsonb_build_object(
      'mensagens_nao_lidas', (SELECT COUNT(*) FROM scoped_chat_unread)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_kpis(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMIT;
