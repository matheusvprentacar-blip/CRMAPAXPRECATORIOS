BEGIN;

-- Adiciona coluna origem para identificar precatórios criados pelo setor de atendimento
ALTER TABLE precatorios
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'direto'
    CHECK (origem IN ('direto', 'atendimento'));

-- Adiciona status de atendimento (ciclo de vida dentro do setor)
ALTER TABLE precatorios
  ADD COLUMN IF NOT EXISTS status_atendimento TEXT
    CHECK (status_atendimento IN ('na_fila', 'em_contato', 'interessado', 'sem_interesse'));

CREATE INDEX IF NOT EXISTS idx_precatorios_origem ON precatorios(origem);
CREATE INDEX IF NOT EXISTS idx_precatorios_status_atendimento ON precatorios(status_atendimento);

-- Tabela de tentativas de contato do setor de atendimento
CREATE TABLE IF NOT EXISTS atendimento_tentativas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  precatorio_id UUID        NOT NULL REFERENCES precatorios(id) ON DELETE CASCADE,
  agente_id     UUID        NOT NULL REFERENCES auth.users(id),
  agente_nome   TEXT        NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo          TEXT        NOT NULL CHECK (tipo IN ('ligacao', 'whatsapp', 'email')),
  resultado     TEXT        NOT NULL CHECK (resultado IN ('atendeu', 'nao_atendeu', 'interessado', 'sem_interesse')),
  observacoes   TEXT
);

CREATE INDEX IF NOT EXISTS idx_atendimento_tentativas_precatorio ON atendimento_tentativas(precatorio_id);
CREATE INDEX IF NOT EXISTS idx_atendimento_tentativas_agente      ON atendimento_tentativas(agente_id);
CREATE INDEX IF NOT EXISTS idx_atendimento_tentativas_criado_em   ON atendimento_tentativas(criado_em DESC);

-- Adiciona agente_atendimento à lista de roles válidas
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS valid_roles_array;

ALTER TABLE public.usuarios
  ADD CONSTRAINT valid_roles_array
  CHECK (
    role <@ ARRAY[
      'admin'::TEXT,
      'tecnico_ti'::TEXT,
      'operador_comercial'::TEXT,
      'operador_calculo'::TEXT,
      'operador'::TEXT,
      'analista'::TEXT,
      'analista_processual'::TEXT,
      'gestor'::TEXT,
      'gestor_certidoes'::TEXT,
      'gestor_oficio'::TEXT,
      'gestor_escrituras'::TEXT,
      'juridico'::TEXT,
      'financeiro'::TEXT,
      'agente_atendimento'::TEXT
    ]
  );

-- RLS: agente_atendimento pode ler precatórios de origem atendimento
-- (apenas colunas não-financeiras são filtradas no frontend; RLS garante escopo de linha)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'precatorios' AND policyname = 'agente_atendimento_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY agente_atendimento_select ON precatorios
        FOR SELECT
        USING (
          origem = 'atendimento'
          AND (
            SELECT role && ARRAY['agente_atendimento']::text[]
            FROM usuarios WHERE id = auth.uid()
          )
        )
    $policy$;
  END IF;
END
$$;

-- RLS: agente_atendimento pode inserir e ler tentativas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'atendimento_tentativas' AND policyname = 'tentativas_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY tentativas_select_own ON atendimento_tentativas
        FOR SELECT USING (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'atendimento_tentativas' AND policyname = 'tentativas_insert_agente'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY tentativas_insert_agente ON atendimento_tentativas
        FOR INSERT WITH CHECK (agente_id = auth.uid())
    $policy$;
  END IF;
END
$$;

-- Habilita RLS na nova tabela
ALTER TABLE atendimento_tentativas ENABLE ROW LEVEL SECURITY;

COMMIT;
