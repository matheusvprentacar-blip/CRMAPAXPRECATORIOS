-- ============================================================================
-- Script 183: Dashboard KPIs (Consolidado)
-- ============================================================================
-- Cria uma funcao unica que retorna um JSON com os principais acumulados
-- do sistema, com filtros opcionais por periodo.
-- ============================================================================

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
BEGIN
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim),

    'resumo', jsonb_build_object(
      'total_precatorios', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL),
      'total_principal', (SELECT COALESCE(SUM(valor_principal), 0) FROM public.precatorios WHERE deleted_at IS NULL),
      'total_atualizado', (SELECT COALESCE(SUM(valor_atualizado), 0) FROM public.precatorios WHERE deleted_at IS NULL),
      'total_saldo_liquido', (SELECT COALESCE(SUM(saldo_liquido), 0) FROM public.precatorios WHERE deleted_at IS NULL),
      'total_credores', (SELECT COUNT(*) FROM public.view_credores),
      'total_propostas', (
        SELECT COUNT(*)
        FROM public.propostas pr
        JOIN public.precatorios p ON p.id = pr.precatorio_id
        WHERE p.deleted_at IS NULL
      )
    ),

    'periodo_kpis', jsonb_build_object(
      'novos_precatorios', (
        SELECT COUNT(*) FROM public.precatorios
        WHERE deleted_at IS NULL
          AND (p_inicio IS NULL OR created_at >= p_inicio)
          AND (p_fim IS NULL OR created_at <= p_fim)
      ),
      'precatorios_atualizados', (
        SELECT COUNT(*) FROM public.precatorios
        WHERE deleted_at IS NULL
          AND (p_inicio IS NULL OR updated_at >= p_inicio)
          AND (p_fim IS NULL OR updated_at <= p_fim)
      ),
      'propostas_criadas', (
        SELECT COUNT(*)
        FROM public.propostas pr
        JOIN public.precatorios p ON p.id = pr.precatorio_id
        WHERE p.deleted_at IS NULL
          AND (p_inicio IS NULL OR pr.created_at >= p_inicio)
          AND (p_fim IS NULL OR pr.created_at <= p_fim)
      ),
      'atividades_periodo', (
        SELECT COUNT(*)
        FROM public.atividades
        WHERE (p_inicio IS NULL OR created_at >= p_inicio)
          AND (p_fim IS NULL OR created_at <= p_fim)
      ),
      'mensagens_chat_periodo', (
        SELECT COUNT(*)
        FROM public.chat_mensagens
        WHERE (p_inicio IS NULL OR created_at >= p_inicio)
          AND (p_fim IS NULL OR created_at <= p_fim)
      )
    ),

    'kanban', jsonb_build_object(
      'quantidade_por_status', COALESCE((
        SELECT jsonb_object_agg(status_key, total)
        FROM (
          SELECT
            COALESCE(status_kanban, localizacao_kanban, status, 'sem_status') AS status_key,
            COUNT(*) AS total
          FROM public.precatorios
          WHERE deleted_at IS NULL
          GROUP BY 1
        ) s
      ), '{}'::jsonb),
      'valor_por_status', COALESCE((
        SELECT jsonb_object_agg(status_key, total_valor)
        FROM (
          SELECT
            COALESCE(status_kanban, localizacao_kanban, status, 'sem_status') AS status_key,
            COALESCE(SUM(COALESCE(NULLIF(valor_atualizado, 0), valor_principal, 0)), 0) AS total_valor
          FROM public.precatorios
          WHERE deleted_at IS NULL
          GROUP BY 1
        ) s
      ), '{}'::jsonb)
    ),

    'financeiro', jsonb_build_object(
      'pss_total', (SELECT COALESCE(SUM(pss_valor), 0) FROM public.precatorios WHERE deleted_at IS NULL),
      'irpf_total', (SELECT COALESCE(SUM(irpf_valor), 0) FROM public.precatorios WHERE deleted_at IS NULL),
      'honorarios_total', (SELECT COALESCE(SUM(honorarios_valor), 0) FROM public.precatorios WHERE deleted_at IS NULL),
      'adiantamento_total', (SELECT COALESCE(SUM(adiantamento_valor), 0) FROM public.precatorios WHERE deleted_at IS NULL),
      'irpf_isento', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL AND irpf_isento IS TRUE),
      'irpf_nao_isento', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL AND (irpf_isento IS FALSE OR irpf_isento IS NULL))
    ),

    'propostas', jsonb_build_object(
      'por_status', COALESCE((
        SELECT jsonb_object_agg(status, total)
        FROM (
          SELECT COALESCE(pr.status, 'sem_status') AS status, COUNT(*) AS total
          FROM public.propostas pr
          JOIN public.precatorios p ON p.id = pr.precatorio_id
          WHERE p.deleted_at IS NULL
          GROUP BY COALESCE(pr.status, 'sem_status')
        ) s
      ), '{}'::jsonb),
      'valor_total', (
        SELECT COALESCE(SUM(pr.valor_proposta), 0)
        FROM public.propostas pr
        JOIN public.precatorios p ON p.id = pr.precatorio_id
        WHERE p.deleted_at IS NULL
      ),
      'ticket_medio', (
        SELECT COALESCE(AVG(pr.valor_proposta), 0)
        FROM public.propostas pr
        JOIN public.precatorios p ON p.id = pr.precatorio_id
        WHERE p.deleted_at IS NULL
      ),
      'desconto_medio', (
        SELECT COALESCE(AVG(pr.percentual_desconto), 0)
        FROM public.propostas pr
        JOIN public.precatorios p ON p.id = pr.precatorio_id
        WHERE p.deleted_at IS NULL
      )
    ),

    'calculo', jsonb_build_object(
      'pronto_calculo', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL AND status_kanban = 'pronto_calculo'),
      'em_calculo', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL AND status_kanban = 'calculo_andamento'),
      'concluido', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL AND status_kanban = 'calculo_concluido'),
      'desatualizado', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL AND calculo_desatualizado IS TRUE),
      'versoes_media', COALESCE((
        SELECT AVG(qtd)
        FROM (
          SELECT precatorio_id, COUNT(*)::NUMERIC AS qtd
          FROM public.precatorio_calculos
          GROUP BY precatorio_id
        ) t
      ), 0)
    ),

    'sla', COALESCE((
      SELECT to_jsonb(ms) FROM public.metricas_sla ms
    ), '{}'::jsonb),

    'documentos_certidoes', jsonb_build_object(
      'total_docs', (SELECT COALESCE(SUM(total_docs), 0) FROM public.view_resumo_itens_precatorio),
      'docs_recebidos', (SELECT COALESCE(SUM(docs_recebidos), 0) FROM public.view_resumo_itens_precatorio),
      'total_certidoes', (SELECT COALESCE(SUM(total_certidoes), 0) FROM public.view_resumo_itens_precatorio),
      'certidoes_recebidas', (SELECT COALESCE(SUM(certidoes_recebidas), 0) FROM public.view_resumo_itens_precatorio),
      'certidoes_vencidas', (SELECT COALESCE(SUM(certidoes_vencidas), 0) FROM public.view_resumo_itens_precatorio)
    ),

    'credores', jsonb_build_object(
      'total_credores', (SELECT COUNT(*) FROM public.view_credores),
      'valor_total_principal', (SELECT COALESCE(SUM(valor_total_principal), 0) FROM public.view_credores)
    ),

    'usuarios', jsonb_build_object(
      'ativos_total', (SELECT COUNT(*) FROM public.usuarios WHERE ativo IS TRUE),
      'por_role', COALESCE((
        SELECT jsonb_object_agg(role, total)
        FROM (
          SELECT role_key AS role, COUNT(*) AS total
          FROM (
            SELECT jsonb_array_elements_text(
              CASE
                WHEN jsonb_typeof(to_jsonb(role)) = 'array'
                  THEN to_jsonb(role)
                ELSE jsonb_build_array(role)
              END
            ) AS role_key
            FROM public.usuarios
            WHERE ativo IS TRUE
          ) r
          GROUP BY role_key
        ) r
      ), '{}'::jsonb)
    ),

    'juridico', jsonb_build_object(
      'parecer_por_status', COALESCE((
        SELECT jsonb_object_agg(status_key, total)
        FROM (
          SELECT COALESCE(juridico_parecer_status, 'sem_parecer') AS status_key, COUNT(*) AS total
          FROM public.precatorios
          WHERE deleted_at IS NULL
          GROUP BY 1
        ) s
      ), '{}'::jsonb),
      'resultado_final', COALESCE((
        SELECT jsonb_object_agg(resultado_key, total)
        FROM (
          SELECT COALESCE(juridico_resultado_final, 'sem_resultado') AS resultado_key, COUNT(*) AS total
          FROM public.precatorios
          WHERE deleted_at IS NULL
          GROUP BY 1
        ) s
      ), '{}'::jsonb)
    ),

    'oficios', jsonb_build_object(
      'aguardando_oficio', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL AND status_kanban = 'aguardando_oficio'),
      'com_oficio', (SELECT COUNT(*) FROM public.precatorios WHERE deleted_at IS NULL AND file_url IS NOT NULL AND file_url <> '')
    ),

    'atividades', jsonb_build_object(
      'por_tipo', COALESCE((
        SELECT jsonb_object_agg(tipo, total)
        FROM (
          SELECT tipo, COUNT(*) AS total
          FROM public.atividades
          WHERE (p_inicio IS NULL OR created_at >= p_inicio)
            AND (p_fim IS NULL OR created_at <= p_fim)
          GROUP BY tipo
        ) s
      ), '{}'::jsonb)
    ),

    'chat', jsonb_build_object(
      'mensagens_nao_lidas', (SELECT COUNT(*) FROM public.chat_mensagens WHERE lida IS FALSE)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_kpis(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMIT;

SELECT 'Script 183 executado com sucesso! KPIs do dashboard consolidados.' as status;
