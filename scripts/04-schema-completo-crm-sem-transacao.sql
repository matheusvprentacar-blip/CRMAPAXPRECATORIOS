-- ============================================
-- SCHEMA COMPLETO DO CRM DE PRECATÓRIOS
-- Versão SEM TRANSAÇÃO para debug
-- Execute este se o script 04 estiver dando erro
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CRIAR TABELA DE USUÁRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  foto_url TEXT,
  role TEXT NOT NULL DEFAULT 'operador' CHECK (role IN ('admin', 'operador_comercial', 'operador_calculo', 'operador', 'analista', 'gestor')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CRIAR TABELA DE PRECATÓRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.precatorios (
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
  
  -- Workflow e Status
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'em_calculo', 'calculado', 'aguardando_cliente', 'concluido', 'cancelado')),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  localizacao_kanban TEXT DEFAULT 'novo_precatorio',
  
  -- Responsáveis (sistema antigo + novo)
  criado_por UUID REFERENCES public.usuarios(id),
  responsavel UUID REFERENCES public.usuarios(id),
  operador_calculo UUID REFERENCES public.usuarios(id),
  
  -- Campos para workspace por usuário (sistema CRM)
  dono_usuario_id UUID REFERENCES public.usuarios(id),
  responsavel_calculo_id UUID REFERENCES public.usuarios(id),
  
  -- Dados extras
  dados_calculo JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CRIAR TABELAS AUXILIARES
-- ============================================

CREATE TABLE IF NOT EXISTS public.atividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('criacao', 'atualizacao', 'calculo', 'mudanca_status', 'mudanca_localizacao', 'comentario')),
  descricao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id),
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_precatorios_status_old ON public.precatorios(status);
CREATE INDEX IF NOT EXISTS idx_precatorios_localizacao ON public.precatorios(localizacao_kanban);
CREATE INDEX IF NOT EXISTS idx_precatorios_criado_por ON public.precatorios(criado_por);
CREATE INDEX IF NOT EXISTS idx_precatorios_responsavel_old ON public.precatorios(responsavel);
CREATE INDEX IF NOT EXISTS idx_precatorios_dono ON public.precatorios(dono_usuario_id);
CREATE INDEX IF NOT EXISTS idx_precatorios_responsavel_calculo ON public.precatorios(responsavel_calculo_id);
CREATE INDEX IF NOT EXISTS idx_precatorios_status_dono ON public.precatorios(status, dono_usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON public.usuarios(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_precatorio ON public.atividades(precatorio_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_precatorio ON public.comentarios(precatorio_id);

-- ============================================
-- 5. FUNCTIONS E TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER update_usuarios_updated_at 
  BEFORE UPDATE ON public.usuarios 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_precatorios_updated_at ON public.precatorios;
CREATE TRIGGER update_precatorios_updated_at 
  BEFORE UPDATE ON public.precatorios 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comentarios_updated_at ON public.comentarios;
CREATE TRIGGER update_comentarios_updated_at 
  BEFORE UPDATE ON public.comentarios 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT 
LANGUAGE sql 
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.usuarios WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver todos os outros usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Todos podem ver precatórios" ON public.precatorios;
DROP POLICY IF EXISTS "Todos podem criar precatórios" ON public.precatorios;
DROP POLICY IF EXISTS "Todos podem atualizar precatórios" ON public.precatorios;
DROP POLICY IF EXISTS "Todos podem ver atividades" ON public.atividades;
DROP POLICY IF EXISTS "Todos podem criar atividades" ON public.atividades;
DROP POLICY IF EXISTS "Todos podem ver comentários" ON public.comentarios;
DROP POLICY IF EXISTS "Todos podem criar comentários" ON public.comentarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios comentários" ON public.comentarios;

CREATE POLICY usuarios_select_own_or_admin
  ON public.usuarios FOR SELECT
  USING (
    id = auth.uid() 
    OR (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY usuarios_update_self
  ON public.usuarios FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      (auth.jwt() ->> 'role') = 'admin'
      OR role = (SELECT role FROM public.usuarios WHERE id = auth.uid())
    )
  );

CREATE POLICY usuarios_update_admin
  ON public.usuarios FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY precatorios_admin_select
  ON public.precatorios FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY precatorios_operador_comercial_select
  ON public.precatorios FOR SELECT
  USING (
    (auth.jwt() ->> 'role') IN ('operador_comercial', 'operador')
    AND dono_usuario_id = auth.uid()
  );

CREATE POLICY precatorios_operador_calculo_select
  ON public.precatorios FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'operador_calculo'
    AND responsavel_calculo_id = auth.uid()
  );

CREATE POLICY precatorios_insert_ops
  ON public.precatorios FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'operador_comercial', 'operador')
  );

CREATE POLICY precatorios_admin_update
  ON public.precatorios FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY precatorios_operador_comercial_update
  ON public.precatorios FOR UPDATE
  USING (
    (auth.jwt() ->> 'role') IN ('operador_comercial', 'operador')
    AND dono_usuario_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('operador_comercial', 'operador')
    AND dono_usuario_id = auth.uid()
  );

CREATE POLICY precatorios_operador_calculo_update
  ON public.precatorios FOR UPDATE
  USING (
    (auth.jwt() ->> 'role') = 'operador_calculo'
    AND responsavel_calculo_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'operador_calculo'
    AND responsavel_calculo_id = auth.uid()
  );

CREATE POLICY precatorios_admin_delete
  ON public.precatorios FOR DELETE
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY atividades_select_all
  ON public.atividades FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY atividades_insert_all
  ON public.atividades FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY comentarios_select_all
  ON public.comentarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY comentarios_insert_all
  ON public.comentarios FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY comentarios_update_own
  ON public.comentarios FOR UPDATE
  USING (auth.uid() = usuario_id);

-- ============================================
-- 7. MIGRAÇÃO DE DADOS LEGADOS (se aplicável)
-- ============================================

-- Removido seed do admin - deve ser criado manualmente no Supabase Dashboard
-- Sincronizar campos legados com novos campos de workspace
UPDATE public.precatorios 
SET dono_usuario_id = criado_por 
WHERE dono_usuario_id IS NULL AND criado_por IS NOT NULL;

UPDATE public.precatorios 
SET responsavel_calculo_id = operador_calculo 
WHERE responsavel_calculo_id IS NULL AND operador_calculo IS NOT NULL;

-- ============================================
-- SCRIPT CONCLUÍDO
-- ============================================
-- Próximos passos:
-- 1. Criar usuário admin no Supabase Dashboard (Authentication > Users)
--    Email: admin@test.com | Senha: Admin@123
-- 2. Copiar o UUID gerado
-- 3. Executar: INSERT INTO public.usuarios (id, email, nome, role) 
--    VALUES ('UUID-COPIADO', 'admin@test.com', 'Administrador', 'admin');
-- 4. Configurar JWT Custom Claims Hook (ver ORDEM-EXECUCAO-SCRIPTS.md)
