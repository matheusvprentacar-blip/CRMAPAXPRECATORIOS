BEGIN;

-- Single-call RPC that replaces 3x buscar_precatorios_global + 1 distribution N+1 query.
--
-- Improvements over the old pattern:
--   • CTE MATERIALIZED computes the filtered set ONCE and reuses for counts + pagination.
--   • Summary counts (calculados, em_calculo_ou_novo) derived from the same filtered CTE.
--   • Distribution fields (dono_usuario_id, distribuido_por_admin, etc.) included in row output.
--   • p_distribuicao filter applied server-side, fixing client-side pagination misalignment.
--   • p_offset / p_limit replace PostgREST .range() so pagination is part of the single call.
--
-- Expected network round-trips: 1  (was: 4)

CREATE OR REPLACE FUNCTION public.buscar_precatorios_com_summary(
  p_termo                        TEXT      DEFAULT NULL,
  p_status                       TEXT[]    DEFAULT NULL,
  p_responsavel_id               UUID      DEFAULT NULL,
  p_tribunal                     TEXT      DEFAULT NULL,
  p_criador_id                   UUID      DEFAULT NULL,
  p_complexidade                 TEXT[]    DEFAULT NULL,
  p_sla_status                   TEXT[]    DEFAULT NULL,
  p_tipo_atraso                  TEXT[]    DEFAULT NULL,
  p_impacto_atraso               TEXT[]    DEFAULT NULL,
  p_data_criacao_inicio          DATE      DEFAULT NULL,
  p_data_criacao_fim             DATE      DEFAULT NULL,
  p_data_entrada_calculo_inicio  DATE      DEFAULT NULL,
  p_data_entrada_calculo_fim     DATE      DEFAULT NULL,
  p_valor_min                    NUMERIC   DEFAULT NULL,
  p_valor_max                    NUMERIC   DEFAULT NULL,
  p_valor_atualizado_min         NUMERIC   DEFAULT NULL,
  p_valor_atualizado_max         NUMERIC   DEFAULT NULL,
  p_valor_sem_atualizacao_min    NUMERIC   DEFAULT NULL,
  p_valor_sem_atualizacao_max    NUMERIC   DEFAULT NULL,
  p_urgente                      BOOLEAN   DEFAULT NULL,
  p_titular_falecido             BOOLEAN   DEFAULT NULL,
  p_valor_calculado              BOOLEAN   DEFAULT NULL,
  p_calculo_andamento            BOOLEAN   DEFAULT NULL,
  p_calculo_finalizado           BOOLEAN   DEFAULT NULL,
  -- new: distribution server-side filter
  p_distribuicao                 TEXT      DEFAULT NULL,
  -- new: pagination (replaces PostgREST .range())
  p_offset                       INT       DEFAULT 0,
  p_limit                        INT       DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID;
  v_user_roles TEXT[];
  v_rows       JSONB;
  v_total      BIGINT;
  v_calculados BIGINT;
  v_em_calculo BIGINT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'rows', '[]'::JSONB,
      'total', 0,
      'calculados', 0,
      'em_calculo_ou_novo', 0
    );
  END IF;

  SELECT u.role INTO v_user_roles
  FROM public.usuarios u
  WHERE u.id = v_user_id;

  -- MATERIALIZED: compute filtered set once, reuse for counts + paginated rows.
  WITH filtered AS MATERIALIZED (
    SELECT
      p.id,
      p.titulo::TEXT,
      p.numero_precatorio::TEXT,
      p.numero_processo::TEXT,
      p.numero_oficio::TEXT,
      p.tribunal::TEXT,
      p.devedor::TEXT,
      p.esfera_devedor::TEXT,
      p.credor_nome::TEXT,
      p.credor_cpf_cnpj::TEXT,
      p.advogado_nome::TEXT,
      p.advogado_cpf_cnpj::TEXT,
      p.cessionario::TEXT,
      p.valor_principal,
      p.valor_atualizado,
      p.status::TEXT,
      p.urgente,
      p.created_at,
      p.criado_por,
      p.responsavel,
      p.responsavel_calculo_id,
      u_criador.nome::TEXT   AS criador_nome,
      u_resp.nome::TEXT      AS responsavel_nome,
      u_calc.nome::TEXT      AS responsavel_calculo_nome,
      p.nivel_complexidade::TEXT,
      p.score_complexidade,
      p.sla_status::TEXT,
      p.sla_horas,
      p.tipo_atraso::TEXT,
      p.impacto_atraso::TEXT,
      p.motivo_atraso_calculo::TEXT,
      p.responsavel_certidoes_id,
      p.responsavel_oficio_id,
      -- distribution fields (eliminates the N+1 secondary query)
      p.dono_usuario_id,
      p.distribuido_por_admin,
      p.distribuido_por_admin_em,
      p.distribuido_por_admin_id
    FROM public.precatorios p
    LEFT JOIN public.usuarios u_criador ON p.criado_por          = u_criador.id
    LEFT JOIN public.usuarios u_resp    ON p.responsavel         = u_resp.id
    LEFT JOIN public.usuarios u_calc    ON p.responsavel_calculo_id = u_calc.id
    WHERE p.deleted_at IS NULL

      -- row-level security (identical to buscar_precatorios_global)
      AND (
        ('admin'              = ANY(v_user_roles)) OR
        ('gestor'             = ANY(v_user_roles)) OR
        ('operador_comercial' = ANY(v_user_roles) AND (
          p.responsavel = v_user_id
          OR p.dono_usuario_id = v_user_id
          OR public.precatorio_criador_sem_responsavel(p, v_user_id)
        )) OR
        ('operador_calculo'   = ANY(v_user_roles) AND (
          p.responsavel_calculo_id = v_user_id
          OR p.operador_calculo    = v_user_id
          OR p.responsavel         = v_user_id
          OR public.precatorio_criador_sem_responsavel(p, v_user_id)
        )) OR
        ('gestor_certidoes'   = ANY(v_user_roles) AND p.responsavel_certidoes_id = v_user_id) OR
        ('gestor_oficio'      = ANY(v_user_roles) AND p.responsavel_oficio_id    = v_user_id) OR
        ('juridico'           = ANY(v_user_roles) AND (
          p.responsavel_juridico_id = v_user_id
          OR p.responsavel          = v_user_id
          OR p.dono_usuario_id      = v_user_id
          OR public.precatorio_criador_sem_responsavel(p, v_user_id)
        ))
      )

      -- full-text / field filters
      AND (
        p_termo IS NULL OR
        unaccent(p.titulo)            ILIKE '%' || unaccent(p_termo) || '%' OR
        unaccent(p.numero_precatorio) ILIKE '%' || unaccent(p_termo) || '%' OR
        unaccent(p.numero_processo)   ILIKE '%' || unaccent(p_termo) || '%' OR
        unaccent(p.credor_nome)       ILIKE '%' || unaccent(p_termo) || '%' OR
        unaccent(p.credor_cpf_cnpj)   ILIKE '%' || unaccent(p_termo) || '%' OR
        unaccent(p.devedor)           ILIKE '%' || unaccent(p_termo) || '%'
      )
      AND (p_tribunal IS NULL OR unaccent(p.tribunal) ILIKE '%' || unaccent(p_tribunal) || '%')
      AND (p_status              IS NULL OR p.status             = ANY(p_status))
      AND (p_responsavel_id      IS NULL OR p.responsavel        = p_responsavel_id)
      AND (p_criador_id          IS NULL OR p.criado_por         = p_criador_id)
      AND (p_complexidade        IS NULL OR p.nivel_complexidade = ANY(p_complexidade))
      AND (p_sla_status          IS NULL OR p.sla_status         = ANY(p_sla_status))
      AND (p_tipo_atraso         IS NULL OR p.tipo_atraso        = ANY(p_tipo_atraso))
      AND (p_impacto_atraso      IS NULL OR p.impacto_atraso     = ANY(p_impacto_atraso))
      AND (p_data_criacao_inicio IS NULL OR p.created_at::DATE   >= p_data_criacao_inicio)
      AND (p_data_criacao_fim    IS NULL OR p.created_at::DATE   <= p_data_criacao_fim)
      AND (p_data_entrada_calculo_inicio IS NULL OR p.data_entrada_calculo::DATE >= p_data_entrada_calculo_inicio)
      AND (p_data_entrada_calculo_fim    IS NULL OR p.data_entrada_calculo::DATE <= p_data_entrada_calculo_fim)
      AND (p_valor_min IS NULL OR COALESCE(p.valor_atualizado, p.valor_principal) >= p_valor_min)
      AND (p_valor_max IS NULL OR COALESCE(p.valor_atualizado, p.valor_principal) <= p_valor_max)
      AND (p_valor_atualizado_min IS NULL OR (p.valor_atualizado IS NOT NULL AND p.valor_atualizado > 0 AND p.valor_atualizado >= p_valor_atualizado_min))
      AND (p_valor_atualizado_max IS NULL OR (p.valor_atualizado IS NOT NULL AND p.valor_atualizado > 0 AND p.valor_atualizado <= p_valor_atualizado_max))
      AND (p_valor_sem_atualizacao_min IS NULL OR (COALESCE(p.valor_atualizado, 0) = 0 AND p.valor_principal >= p_valor_sem_atualizacao_min))
      AND (p_valor_sem_atualizacao_max IS NULL OR (COALESCE(p.valor_atualizado, 0) = 0 AND p.valor_principal <= p_valor_sem_atualizacao_max))
      AND (p_urgente           IS NULL OR p.urgente      = p_urgente)
      AND (p_titular_falecido  IS NULL OR p.tipo_atraso  = 'titular_falecido')
      AND (
        p_valor_calculado IS NULL OR
        (p_valor_calculado = TRUE AND (
          COALESCE(p.valor_atualizado, 0) > 0 OR
          COALESCE(p.saldo_liquido, 0)    > 0 OR
          p.data_calculo IS NOT NULL
        ))
      )
      AND (
        (p_calculo_andamento IS NULL AND p_calculo_finalizado IS NULL) OR
        (p_calculo_andamento IS TRUE AND p.status IN ('calculo_andamento', 'em_calculo')) OR
        (p_calculo_finalizado IS TRUE AND p.status IN ('calculo_concluido', 'calculado'))
      )
      -- distribution filter (was client-side, now server-side)
      AND (
        p_distribuicao IS NULL OR
        (p_distribuicao = 'distribuido'       AND (p.responsavel IS NOT NULL OR p.dono_usuario_id IS NOT NULL)) OR
        (p_distribuicao = 'pendente'          AND p.responsavel IS NULL AND p.dono_usuario_id IS NULL AND p.distribuido_por_admin = FALSE) OR
        (p_distribuicao = 'distribuido_admin' AND p.distribuido_por_admin = TRUE)
      )
  )

  -- Single SELECT: paginated rows + all counts from the materialized CTE
  SELECT
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(r))
       FROM (
         SELECT * FROM filtered
         ORDER BY urgente DESC, created_at DESC
         LIMIT p_limit OFFSET p_offset
       ) r),
      '[]'::JSONB
    ),
    (SELECT COUNT(*)::BIGINT FROM filtered),
    (SELECT COUNT(*)::BIGINT FROM filtered WHERE status IN ('calculado', 'concluido')),
    (SELECT COUNT(*)::BIGINT FROM filtered WHERE status IN ('em_calculo', 'novo'))
  INTO v_rows, v_total, v_calculados, v_em_calculo;

  RETURN jsonb_build_object(
    'rows',             COALESCE(v_rows, '[]'::JSONB),
    'total',            COALESCE(v_total, 0),
    'calculados',       COALESCE(v_calculados, 0),
    'em_calculo_ou_novo', COALESCE(v_em_calculo, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_precatorios_com_summary(
  TEXT, TEXT[], UUID, TEXT, UUID, TEXT[], TEXT[], TEXT[], TEXT[],
  DATE, DATE, DATE, DATE,
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN,
  TEXT, INT, INT
) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
