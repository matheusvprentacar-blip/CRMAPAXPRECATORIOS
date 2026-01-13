-- ============================================
-- Script 76: Kanban + Gates - Schema
-- ============================================
-- Adiciona novos campos e tabelas para o sistema de Kanban com Gates
-- Cria estrutura para controle de fluxo, documentos, certidões e jurídico

-- ============================================
-- 1. NOVOS CAMPOS NA TABELA precatorios
-- ============================================

-- Status Kanban (11 colunas)
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS status_kanban VARCHAR(50) DEFAULT 'entrada';

-- Interesse do Credor
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS interesse_status VARCHAR(50) DEFAULT 'SEM_CONTATO';

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS interesse_observacao TEXT;

-- Cálculo
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS calculo_desatualizado BOOLEAN DEFAULT false;

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS calculo_ultima_versao INTEGER DEFAULT 0;

-- Jurídico (sob demanda)
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS juridico_motivo VARCHAR(50);

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS juridico_descricao_bloqueio TEXT;

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS juridico_parecer_status VARCHAR(50);

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS juridico_parecer_texto TEXT;

-- Resultado do cálculo (no card)
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS data_base_calculo DATE;

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS premissas_calculo_resumo TEXT;

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS calculo_pdf_url TEXT;

-- ============================================
-- 2. CONSTRAINTS E CHECKS
-- ============================================

-- Check constraint para status_kanban
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'precatorios_status_kanban_check'
  ) THEN
    ALTER TABLE public.precatorios
    ADD CONSTRAINT precatorios_status_kanban_check
    CHECK (status_kanban IN (
      'entrada',
      'triagem_interesse',
      'docs_credor',
      'certidoes',
      'pronto_calculo',
      'calculo_andamento',
      'analise_juridica',
      'recalculo_pos_juridico',
      'calculo_concluido',
      'proposta_negociacao',
      'fechado'
    ));
  END IF;
END $$;

-- Check constraint para interesse_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'precatorios_interesse_status_check'
  ) THEN
    ALTER TABLE public.precatorios
    ADD CONSTRAINT precatorios_interesse_status_check
    CHECK (interesse_status IN (
      'SEM_CONTATO',
      'CONTATO_EM_ANDAMENTO',
      'PEDIR_RETORNO',
      'SEM_INTERESSE',
      'TEM_INTERESSE'
    ));
  END IF;
END $$;

-- Check constraint para juridico_motivo
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'precatorios_juridico_motivo_check'
  ) THEN
    ALTER TABLE public.precatorios
    ADD CONSTRAINT precatorios_juridico_motivo_check
    CHECK (juridico_motivo IN (
      'PENHORA',
      'CESSAO',
      'HONORARIOS',
      'HABILITACAO',
      'DUVIDA_BASE_INDICE',
      'OUTROS'
    ) OR juridico_motivo IS NULL);
  END IF;
END $$;

-- Check constraint para juridico_parecer_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'precatorios_juridico_parecer_status_check'
  ) THEN
    ALTER TABLE public.precatorios
    ADD CONSTRAINT precatorios_juridico_parecer_status_check
    CHECK (juridico_parecer_status IN (
      'APROVADO',
      'AJUSTAR_DADOS',
      'IMPEDIMENTO',
      'RISCO_ALTO'
    ) OR juridico_parecer_status IS NULL);
  END IF;
END $$;

-- ============================================
-- 3. TABELA: precatorio_itens (Documentos e Certidões)
-- ============================================

CREATE TABLE IF NOT EXISTS public.precatorio_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  tipo_grupo VARCHAR(20) NOT NULL CHECK (tipo_grupo IN ('DOC_CREDOR', 'CERTIDAO')),
  nome_item VARCHAR(200) NOT NULL,
  status_item VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' 
    CHECK (status_item IN ('PENDENTE', 'SOLICITADO', 'RECEBIDO', 'INCOMPLETO', 'VENCIDO', 'NAO_APLICAVEL')),
  validade DATE,
  observacao TEXT,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_precatorio_itens_precatorio_id 
  ON public.precatorio_itens(precatorio_id);

CREATE INDEX IF NOT EXISTS idx_precatorio_itens_tipo_grupo 
  ON public.precatorio_itens(tipo_grupo);

CREATE INDEX IF NOT EXISTS idx_precatorio_itens_status 
  ON public.precatorio_itens(status_item);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_precatorio_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_precatorio_itens_updated_at ON public.precatorio_itens;
CREATE TRIGGER trigger_precatorio_itens_updated_at
  BEFORE UPDATE ON public.precatorio_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_precatorio_itens_updated_at();

-- RLS
ALTER TABLE public.precatorio_itens ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver itens dos precatórios que têm acesso
DROP POLICY IF EXISTS "Usuários podem ver itens dos seus precatórios" ON public.precatorio_itens;
CREATE POLICY "Usuários podem ver itens dos seus precatórios"
  ON public.precatorio_itens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = precatorio_itens.precatorio_id
      AND (
        p.criado_por = auth.uid()
        OR p.responsavel = auth.uid()
        OR p.responsavel_calculo_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

-- Policy: Podem inserir/atualizar itens
DROP POLICY IF EXISTS "Usuários podem gerenciar itens" ON public.precatorio_itens;
CREATE POLICY "Usuários podem gerenciar itens"
  ON public.precatorio_itens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = precatorio_itens.precatorio_id
      AND (
        p.criado_por = auth.uid()
        OR p.responsavel = auth.uid()
        OR p.responsavel_calculo_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

-- ============================================
-- 4. TABELA: precatorio_calculos (Histórico/Versões)
-- ============================================

CREATE TABLE IF NOT EXISTS public.precatorio_calculos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  data_base DATE,
  valor_atualizado NUMERIC(15,2),
  saldo_liquido NUMERIC(15,2),
  premissas_json JSONB,
  premissas_resumo TEXT,
  arquivo_pdf_url TEXT,
  created_by UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(precatorio_id, versao)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_precatorio_calculos_precatorio_id 
  ON public.precatorio_calculos(precatorio_id);

CREATE INDEX IF NOT EXISTS idx_precatorio_calculos_versao 
  ON public.precatorio_calculos(versao DESC);

-- RLS
ALTER TABLE public.precatorio_calculos ENABLE ROW LEVEL SECURITY;

-- Policy: Ver cálculos
DROP POLICY IF EXISTS "Usuários podem ver cálculos dos seus precatórios" ON public.precatorio_calculos;
CREATE POLICY "Usuários podem ver cálculos dos seus precatórios"
  ON public.precatorio_calculos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = precatorio_calculos.precatorio_id
      AND (
        p.criado_por = auth.uid()
        OR p.responsavel = auth.uid()
        OR p.responsavel_calculo_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

-- Policy: Criar cálculos (apenas operador_calculo e admin)
DROP POLICY IF EXISTS "Operadores de cálculo podem criar versões" ON public.precatorio_calculos;
CREATE POLICY "Operadores de cálculo podem criar versões"
  ON public.precatorio_calculos FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('operador_calculo', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = precatorio_calculos.precatorio_id
      AND (
        p.responsavel_calculo_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

-- ============================================
-- 5. TABELA: precatorio_auditoria
-- ============================================

CREATE TABLE IF NOT EXISTS public.precatorio_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  acao VARCHAR(50) NOT NULL,
  de VARCHAR(100),
  para VARCHAR(100),
  payload_json JSONB,
  user_id UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_precatorio_auditoria_precatorio_id 
  ON public.precatorio_auditoria(precatorio_id);

CREATE INDEX IF NOT EXISTS idx_precatorio_auditoria_acao 
  ON public.precatorio_auditoria(acao);

CREATE INDEX IF NOT EXISTS idx_precatorio_auditoria_created_at 
  ON public.precatorio_auditoria(created_at DESC);

-- RLS
ALTER TABLE public.precatorio_auditoria ENABLE ROW LEVEL SECURITY;

-- Policy: Ver auditoria
DROP POLICY IF EXISTS "Usuários podem ver auditoria dos seus precatórios" ON public.precatorio_auditoria;
CREATE POLICY "Usuários podem ver auditoria dos seus precatórios"
  ON public.precatorio_auditoria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.precatorios p
      WHERE p.id = precatorio_auditoria.precatorio_id
      AND (
        p.criado_por = auth.uid()
        OR p.responsavel = auth.uid()
        OR p.responsavel_calculo_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

-- Policy: Criar auditoria (sistema)
DROP POLICY IF EXISTS "Sistema pode criar auditoria" ON public.precatorio_auditoria;
CREATE POLICY "Sistema pode criar auditoria"
  ON public.precatorio_auditoria FOR INSERT
  WITH CHECK (true); -- Qualquer usuário autenticado pode criar auditoria

-- ============================================
-- 6. COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN public.precatorios.status_kanban IS 'Coluna atual no Kanban (11 colunas)';
COMMENT ON COLUMN public.precatorios.interesse_status IS 'Status do interesse do credor';
COMMENT ON COLUMN public.precatorios.calculo_desatualizado IS 'Flag que indica se o cálculo precisa ser refeito';
COMMENT ON COLUMN public.precatorios.calculo_ultima_versao IS 'Número da última versão do cálculo';
COMMENT ON COLUMN public.precatorios.juridico_motivo IS 'Motivo do envio para análise jurídica';
COMMENT ON COLUMN public.precatorios.juridico_parecer_status IS 'Status do parecer jurídico';

COMMENT ON TABLE public.precatorio_itens IS 'Checklist de documentos e certidões por precatório';
COMMENT ON TABLE public.precatorio_calculos IS 'Histórico de versões dos cálculos';
COMMENT ON TABLE public.precatorio_auditoria IS 'Auditoria completa de todas as ações nos precatórios';

-- ============================================
-- SUCESSO
-- ============================================

SELECT 'Script 76 executado com sucesso! Schema do Kanban + Gates criado.' as status;
