-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (complementa auth.users)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  role TEXT NOT NULL DEFAULT 'operador' CHECK (role IN ('admin', 'operador', 'analista', 'gestor')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela principal de precatórios
CREATE TABLE IF NOT EXISTS precatorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificação
  titulo TEXT NOT NULL,
  numero_precatorio TEXT,
  numero_processo TEXT,
  numero_oficio TEXT,
  tribunal TEXT,
  devedor TEXT,
  esfera_devedor TEXT,
  
  -- Pessoas
  credor_nome TEXT,
  credor_cpf_cnpj TEXT,
  advogado_nome TEXT,
  advogado_cpf_cnpj TEXT,
  cessionario TEXT,
  titular_falecido BOOLEAN DEFAULT false,
  contatos JSONB DEFAULT '[]'::jsonb,
  
  -- Valores
  valor_principal NUMERIC(15,2) DEFAULT 0,
  valor_juros NUMERIC(15,2) DEFAULT 0,
  valor_selic NUMERIC(15,2) DEFAULT 0,
  valor_atualizado NUMERIC(15,2) DEFAULT 0,
  saldo_liquido NUMERIC(15,2) DEFAULT 0,
  
  -- Datas
  data_base DATE,
  data_expedicao DATE,
  data_calculo DATE,
  
  -- Descontos e Propostas
  pss_percentual NUMERIC(5,2) DEFAULT 0,
  pss_valor NUMERIC(15,2) DEFAULT 0,
  irpf_valor NUMERIC(15,2) DEFAULT 0,
  irpf_isento BOOLEAN DEFAULT false,
  honorarios_percentual NUMERIC(5,2) DEFAULT 0,
  honorarios_valor NUMERIC(15,2) DEFAULT 0,
  adiantamento_percentual NUMERIC(5,2) DEFAULT 0,
  adiantamento_valor NUMERIC(15,2) DEFAULT 0,
  proposta_menor_percentual NUMERIC(5,2) DEFAULT 0,
  proposta_maior_percentual NUMERIC(5,2) DEFAULT 0,
  proposta_menor_valor NUMERIC(15,2) DEFAULT 0,
  proposta_maior_valor NUMERIC(15,2) DEFAULT 0,
  
  -- Workflow
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'em_andamento', 'concluido', 'cancelado')),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  localizacao_kanban TEXT DEFAULT 'novo_precatorio',
  
  -- Responsáveis
  criado_por UUID REFERENCES usuarios(id),
  responsavel UUID REFERENCES usuarios(id),
  operador_calculo UUID REFERENCES usuarios(id),
  
  -- Dados extras
  dados_calculo JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de atividades (histórico de alterações)
CREATE TABLE IF NOT EXISTS atividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES precatorios(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('criacao', 'atualizacao', 'calculo', 'mudanca_status', 'mudanca_localizacao', 'comentario')),
  descricao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de comentários
CREATE TABLE IF NOT EXISTS comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES precatorios(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_precatorios_status ON precatorios(status);
CREATE INDEX IF NOT EXISTS idx_precatorios_localizacao ON precatorios(localizacao_kanban);
CREATE INDEX IF NOT EXISTS idx_precatorios_criado_por ON precatorios(criado_por);
CREATE INDEX IF NOT EXISTS idx_precatorios_responsavel ON precatorios(responsavel);
CREATE INDEX IF NOT EXISTS idx_atividades_precatorio ON atividades(precatorio_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_precatorio ON comentarios(precatorio_id);

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_precatorios_updated_at ON precatorios;
CREATE TRIGGER update_precatorios_updated_at BEFORE UPDATE ON precatorios 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comentarios_updated_at ON comentarios;
CREATE TRIGGER update_comentarios_updated_at BEFORE UPDATE ON comentarios 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE precatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver todos os outros usuários"
  ON usuarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON usuarios FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Todos podem ver precatórios"
  ON precatorios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem criar precatórios"
  ON precatorios FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem atualizar precatórios"
  ON precatorios FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem ver atividades"
  ON atividades FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem criar atividades"
  ON atividades FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem ver comentários"
  ON comentarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem criar comentários"
  ON comentarios FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar seus próprios comentários"
  ON comentarios FOR UPDATE
  USING (auth.uid() = usuario_id);
