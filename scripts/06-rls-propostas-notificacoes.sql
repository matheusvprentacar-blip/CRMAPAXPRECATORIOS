-- ============================================================================
-- Script 06: RLS Policies para Propostas e Notificações
-- ============================================================================
-- Este script adiciona políticas RLS otimizadas para as tabelas:
-- - propostas
-- - notificacoes
--
-- Usa auth.jwt() para melhor performance (sem DB lookup)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. CRIAR TABELAS SE NÃO EXISTIREM
-- ============================================================================

-- Criar tabela propostas se não existir
CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precatorio_id UUID REFERENCES public.precatorios(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor_proposta NUMERIC(15,2),
  percentual_desconto NUMERIC(5,2),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'rejeitada', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela notificacoes se não existir
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  precatorio_id UUID REFERENCES public.precatorios(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('calculo_disponivel', 'calculo_concluido', 'proposta_enviada', 'proposta_aceita')),
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar trigger para updated_at em propostas
DROP TRIGGER IF EXISTS update_propostas_updated_at ON public.propostas;
CREATE TRIGGER update_propostas_updated_at 
  BEFORE UPDATE ON public.propostas 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Criar trigger para updated_at em notificacoes
DROP TRIGGER IF EXISTS update_notificacoes_updated_at ON public.notificacoes;
CREATE TRIGGER update_notificacoes_updated_at 
  BEFORE UPDATE ON public.notificacoes 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 1. PROPOSTAS - Políticas RLS
-- ============================================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas se existirem
DROP POLICY IF EXISTS propostas_admin_select ON public.propostas;
DROP POLICY IF EXISTS propostas_owner_select ON public.propostas;
DROP POLICY IF EXISTS propostas_operador_calculo_select ON public.propostas;
DROP POLICY IF EXISTS propostas_insert ON public.propostas;
DROP POLICY IF EXISTS propostas_owner_update ON public.propostas;
DROP POLICY IF EXISTS propostas_admin_update ON public.propostas;
DROP POLICY IF EXISTS propostas_admin_delete ON public.propostas;

-- SELECT: Admin vê todas as propostas
CREATE POLICY propostas_admin_select
  ON public.propostas FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- SELECT: Usuário vê suas próprias propostas
CREATE POLICY propostas_owner_select
  ON public.propostas FOR SELECT
  USING (
    usuario_id = auth.uid()
  );

-- SELECT: Operador de cálculo vê propostas de precatórios atribuídos a ele
CREATE POLICY propostas_operador_calculo_select
  ON public.propostas FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'operador_calculo'
    AND EXISTS (
      SELECT 1 FROM public.precatorios
      WHERE precatorios.id = propostas.precatorio_id
      AND precatorios.responsavel_calculo_id = auth.uid()
    )
  );

-- INSERT: Operadores comerciais e admin podem criar propostas
CREATE POLICY propostas_insert
  ON public.propostas FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'operador_comercial', 'operador')
    AND usuario_id = auth.uid()
  );

-- UPDATE: Usuário atualiza apenas suas propostas pendentes
CREATE POLICY propostas_owner_update
  ON public.propostas FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND status = 'pendente'
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND status = 'pendente'
  );

-- UPDATE: Admin pode atualizar qualquer proposta
CREATE POLICY propostas_admin_update
  ON public.propostas FOR UPDATE
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- DELETE: Apenas admin pode deletar propostas
CREATE POLICY propostas_admin_delete
  ON public.propostas FOR DELETE
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================================================
-- 2. NOTIFICAÇÕES - Políticas RLS
-- ============================================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas se existirem
DROP POLICY IF EXISTS notificacoes_admin_select ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_owner_select ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_insert ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_owner_update ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_admin_delete ON public.notificacoes;

-- SELECT: Admin vê todas as notificações
CREATE POLICY notificacoes_admin_select
  ON public.notificacoes FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- SELECT: Usuário vê apenas suas notificações
CREATE POLICY notificacoes_owner_select
  ON public.notificacoes FOR SELECT
  USING (
    usuario_id = auth.uid()
  );

-- INSERT: Qualquer usuário autenticado pode criar notificações
-- (normalmente feito por triggers ou service_role)
CREATE POLICY notificacoes_insert
  ON public.notificacoes FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: Usuário pode atualizar apenas suas próprias notificações
-- (geralmente apenas marcar como lida)
CREATE POLICY notificacoes_owner_update
  ON public.notificacoes FOR UPDATE
  USING (
    usuario_id = auth.uid()
  )
  WITH CHECK (
    usuario_id = auth.uid()
  );

-- DELETE: Apenas admin pode deletar notificações
CREATE POLICY notificacoes_admin_delete
  ON public.notificacoes FOR DELETE
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para propostas
CREATE INDEX IF NOT EXISTS idx_propostas_usuario_id 
  ON public.propostas(usuario_id);

CREATE INDEX IF NOT EXISTS idx_propostas_precatorio_id 
  ON public.propostas(precatorio_id);

CREATE INDEX IF NOT EXISTS idx_propostas_status 
  ON public.propostas(status);

-- Índice composto para query comum (propostas pendentes de um usuário)
CREATE INDEX IF NOT EXISTS idx_propostas_usuario_status 
  ON public.propostas(usuario_id, status);

-- Índices para notificacoes
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id 
  ON public.notificacoes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_precatorio_id 
  ON public.notificacoes(precatorio_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_lida 
  ON public.notificacoes(lida);

-- Índice composto para query comum (notificações não lidas de um usuário)
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida 
  ON public.notificacoes(usuario_id, lida);

-- Índice para tipo de notificação
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo 
  ON public.notificacoes(tipo);

COMMIT;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Próximos passos:
-- 1. Execute este script após o script 04
-- 2. Verifique se as policies estão funcionando corretamente
-- 3. Teste com diferentes roles (admin, operador_comercial, operador_calculo)
-- ============================================================================
