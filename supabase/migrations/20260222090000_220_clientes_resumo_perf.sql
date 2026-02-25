BEGIN;

CREATE INDEX IF NOT EXISTS idx_precatorios_responsavel_ativo
  ON public.precatorios (responsavel)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_precatorios_dono_usuario_id_texto_ativo
  ON public.precatorios ((NULLIF(BTRIM(dono_usuario_id::TEXT), '')))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_precatorios_ref_data_ativo
  ON public.precatorios ((COALESCE(updated_at, created_at)))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_precatorios_credor_agrupamento_ativo
  ON public.precatorios (credor_cpf_cnpj, credor_nome, credor_cidade, credor_uf)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.listar_clientes_resumo()
RETURNS TABLE (
  id_unico TEXT,
  credor_nome TEXT,
  credor_cpf_cnpj TEXT,
  cidade TEXT,
  uf TEXT,
  telefone TEXT,
  email TEXT,
  total_precatorios BIGINT,
  valor_total_principal NUMERIC,
  valor_total_atualizado NUMERIC,
  ultimo_precatorio_data TIMESTAMPTZ,
  ultimo_status TEXT,
  ultimo_precatorio_valor NUMERIC
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
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

  IF v_is_admin THEN
    RETURN QUERY
    WITH scoped_precatorios AS (
      SELECT
        p.id,
        COALESCE(NULLIF(BTRIM(p.credor_nome), ''), 'Credor sem nome') AS credor_nome,
        NULLIF(BTRIM(p.credor_cpf_cnpj), '') AS credor_cpf_cnpj,
        NULLIF(BTRIM(p.credor_cidade), '') AS credor_cidade,
        NULLIF(BTRIM(p.credor_uf), '') AS credor_uf,
        NULLIF(BTRIM(p.credor_telefone), '') AS credor_telefone,
        NULLIF(BTRIM(p.credor_email), '') AS credor_email,
        COALESCE(p.valor_principal, 0)::NUMERIC AS valor_principal,
        COALESCE(NULLIF(p.valor_atualizado, 0), p.valor_principal, 0)::NUMERIC AS valor_atualizado,
        COALESCE(p.status_kanban, p.localizacao_kanban, p.status)::TEXT AS status_atual,
        COALESCE(p.updated_at, p.created_at) AS ref_data
      FROM public.precatorios p
      WHERE p.deleted_at IS NULL
    ),
    normalized AS (
      SELECT
        CASE
          WHEN sp.credor_cpf_cnpj IS NOT NULL
            AND sp.credor_cpf_cnpj NOT LIKE 'SEM_CPF%'
          THEN 'cpf:' || sp.credor_cpf_cnpj
          ELSE 'nome:' || sp.credor_nome || '|' || COALESCE(sp.credor_cidade, '') || '|' || COALESCE(sp.credor_uf, '')
        END AS id_unico,
        sp.*
      FROM scoped_precatorios sp
    ),
    aggregated AS (
      SELECT
        n.id_unico,
        MIN(n.credor_nome) AS credor_nome,
        MIN(n.credor_cpf_cnpj) FILTER (
          WHERE n.credor_cpf_cnpj IS NOT NULL
            AND n.credor_cpf_cnpj NOT LIKE 'SEM_CPF%'
        ) AS credor_cpf_cnpj,
        MIN(n.credor_cidade) FILTER (WHERE n.credor_cidade IS NOT NULL) AS cidade,
        MIN(n.credor_uf) FILTER (WHERE n.credor_uf IS NOT NULL) AS uf,
        MIN(n.credor_telefone) FILTER (WHERE n.credor_telefone IS NOT NULL) AS telefone,
        MIN(n.credor_email) FILTER (WHERE n.credor_email IS NOT NULL) AS email,
        COUNT(*)::BIGINT AS total_precatorios,
        COALESCE(SUM(n.valor_principal), 0)::NUMERIC AS valor_total_principal,
        COALESCE(SUM(n.valor_atualizado), 0)::NUMERIC AS valor_total_atualizado,
        MAX(n.ref_data) AS ultimo_precatorio_data
      FROM normalized n
      GROUP BY n.id_unico
    ),
    latest AS (
      SELECT DISTINCT ON (n.id_unico)
        n.id_unico,
        n.status_atual,
        n.valor_atualizado
      FROM normalized n
      ORDER BY n.id_unico, n.ref_data DESC NULLS LAST, n.id DESC
    )
    SELECT
      a.id_unico,
      COALESCE(a.credor_nome, 'Credor sem nome') AS credor_nome,
      a.credor_cpf_cnpj,
      a.cidade,
      a.uf,
      a.telefone,
      a.email,
      a.total_precatorios,
      a.valor_total_principal,
      a.valor_total_atualizado,
      a.ultimo_precatorio_data,
      l.status_atual AS ultimo_status,
      COALESCE(l.valor_atualizado, 0)::NUMERIC AS ultimo_precatorio_valor
    FROM aggregated a
    LEFT JOIN latest l
      ON l.id_unico = a.id_unico
    ORDER BY a.valor_total_atualizado DESC;

    RETURN;
  END IF;

  RETURN QUERY
  WITH scoped_precatorios AS (
    SELECT
      p.id,
      COALESCE(NULLIF(BTRIM(p.credor_nome), ''), 'Credor sem nome') AS credor_nome,
      NULLIF(BTRIM(p.credor_cpf_cnpj), '') AS credor_cpf_cnpj,
      NULLIF(BTRIM(p.credor_cidade), '') AS credor_cidade,
      NULLIF(BTRIM(p.credor_uf), '') AS credor_uf,
      NULLIF(BTRIM(p.credor_telefone), '') AS credor_telefone,
      NULLIF(BTRIM(p.credor_email), '') AS credor_email,
      COALESCE(p.valor_principal, 0)::NUMERIC AS valor_principal,
      COALESCE(NULLIF(p.valor_atualizado, 0), p.valor_principal, 0)::NUMERIC AS valor_atualizado,
      COALESCE(p.status_kanban, p.localizacao_kanban, p.status)::TEXT AS status_atual,
      COALESCE(p.updated_at, p.created_at) AS ref_data
    FROM public.precatorios p
    WHERE p.deleted_at IS NULL
      AND v_user_id IS NOT NULL
      AND (
        NULLIF(BTRIM(p.dono_usuario_id::TEXT), '') = v_user_id::TEXT
        OR p.responsavel = v_user_id
      )
  ),
  normalized AS (
    SELECT
      CASE
        WHEN sp.credor_cpf_cnpj IS NOT NULL
          AND sp.credor_cpf_cnpj NOT LIKE 'SEM_CPF%'
        THEN 'cpf:' || sp.credor_cpf_cnpj
        ELSE 'nome:' || sp.credor_nome || '|' || COALESCE(sp.credor_cidade, '') || '|' || COALESCE(sp.credor_uf, '')
      END AS id_unico,
      sp.*
    FROM scoped_precatorios sp
  ),
  aggregated AS (
    SELECT
      n.id_unico,
      MIN(n.credor_nome) AS credor_nome,
      MIN(n.credor_cpf_cnpj) FILTER (
        WHERE n.credor_cpf_cnpj IS NOT NULL
          AND n.credor_cpf_cnpj NOT LIKE 'SEM_CPF%'
      ) AS credor_cpf_cnpj,
      MIN(n.credor_cidade) FILTER (WHERE n.credor_cidade IS NOT NULL) AS cidade,
      MIN(n.credor_uf) FILTER (WHERE n.credor_uf IS NOT NULL) AS uf,
      MIN(n.credor_telefone) FILTER (WHERE n.credor_telefone IS NOT NULL) AS telefone,
      MIN(n.credor_email) FILTER (WHERE n.credor_email IS NOT NULL) AS email,
      COUNT(*)::BIGINT AS total_precatorios,
      COALESCE(SUM(n.valor_principal), 0)::NUMERIC AS valor_total_principal,
      COALESCE(SUM(n.valor_atualizado), 0)::NUMERIC AS valor_total_atualizado,
      MAX(n.ref_data) AS ultimo_precatorio_data
    FROM normalized n
    GROUP BY n.id_unico
  ),
  latest AS (
    SELECT DISTINCT ON (n.id_unico)
      n.id_unico,
      n.status_atual,
      n.valor_atualizado
    FROM normalized n
    ORDER BY n.id_unico, n.ref_data DESC NULLS LAST, n.id DESC
  )
  SELECT
    a.id_unico,
    COALESCE(a.credor_nome, 'Credor sem nome') AS credor_nome,
    a.credor_cpf_cnpj,
    a.cidade,
    a.uf,
    a.telefone,
    a.email,
    a.total_precatorios,
    a.valor_total_principal,
    a.valor_total_atualizado,
    a.ultimo_precatorio_data,
    l.status_atual AS ultimo_status,
    COALESCE(l.valor_atualizado, 0)::NUMERIC AS ultimo_precatorio_valor
  FROM aggregated a
  LEFT JOIN latest l
    ON l.id_unico = a.id_unico
  ORDER BY a.valor_total_atualizado DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_clientes_resumo() TO authenticated;

COMMIT;
