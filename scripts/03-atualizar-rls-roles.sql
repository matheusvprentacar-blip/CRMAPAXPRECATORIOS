-- ========================================
-- SCRIPT 03: RLS Policies por Role
-- ========================================
-- Este script configura Row Level Security (RLS) para controlar
-- acesso aos precatórios baseado no papel (role) do usuário.
--
-- Roles suportadas:
-- - admin: acesso total
-- - operador_calculo: acesso apenas aos precatórios atribuídos (via coluna 'responsavel')
-- - operador_comercial: visualiza todos, edita apenas proposta_enviada_cliente

-- ========================================
-- 1. LIMPEZA: Remover policies antigas
-- ========================================

DROP POLICY IF EXISTS "Admin vê todos os precatórios" ON precatorios;
DROP POLICY IF EXISTS "Operador cálculo vê seus precatórios" ON precatorios;
DROP POLICY IF EXISTS "Operador comercial vê precatórios" ON precatorios;
DROP POLICY IF EXISTS "Admin atualiza tudo" ON precatorios;
DROP POLICY IF EXISTS "Operador cálculo atualiza cálculos" ON precatorios;
DROP POLICY IF EXISTS "Operador comercial atualiza proposta" ON precatorios;
DROP POLICY IF EXISTS "Admin select precatorios" ON precatorios;
DROP POLICY IF EXISTS "Operador_calculo select seus precatorios" ON precatorios;
DROP POLICY IF EXISTS "Operador_comercial select precatorios" ON precatorios;
DROP POLICY IF EXISTS "Admin update precatorios" ON precatorios;
DROP POLICY IF EXISTS "Operador_calculo update calculo" ON precatorios;
DROP POLICY IF EXISTS "Operador_comercial update proposta" ON precatorios;
DROP POLICY IF EXISTS "Admin insert precatorios" ON precatorios;
DROP POLICY IF EXISTS "Admin delete precatorios" ON precatorios;
DROP POLICY IF EXISTS "Todos podem ver precatórios" ON precatorios;
DROP POLICY IF EXISTS "Todos podem criar precatórios" ON precatorios;
DROP POLICY IF EXISTS "Todos podem atualizar precatórios" ON precatorios;

-- ========================================
-- 2. GARANTIR RLS LIGADA + FUNÇÃO DE ROLE
-- ========================================

ALTER TABLE public.precatorios ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ========================================
-- 3. POLICIES DE SELECT (quem enxerga o quê)
-- ========================================

-- Admin vê todos os precatórios
CREATE POLICY "Admin select precatorios"
  ON precatorios FOR SELECT
  USING (get_user_role() = 'admin');

-- Operador de cálculo vê apenas precatórios atribuídos a ele
-- usando coluna 'responsavel' que existe no schema
CREATE POLICY "Operador_calculo select seus precatorios"
  ON precatorios FOR SELECT
  USING (
    get_user_role() = 'operador'
    AND responsavel = auth.uid()
  );

-- Operador comercial vê todos os precatórios (pode refinar depois)
CREATE POLICY "Operador_comercial select precatorios"
  ON precatorios FOR SELECT
  USING (get_user_role() IN ('operador', 'analista', 'gestor'));

-- ========================================
-- 4. POLICIES DE INSERT (quem pode criar)
-- ========================================

-- Admin cria precatórios
CREATE POLICY "Admin insert precatorios"
  ON precatorios FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

-- ========================================
-- 5. POLICIES DE UPDATE (quem pode editar)
-- ========================================

-- Admin pode atualizar tudo
CREATE POLICY "Admin update precatorios"
  ON precatorios FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Operador de cálculo atualiza apenas precatórios atribuídos a ele
-- usando coluna 'responsavel' que existe no schema
CREATE POLICY "Operador_calculo update calculo"
  ON precatorios FOR UPDATE
  USING (
    get_user_role() = 'operador'
    AND responsavel = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'operador'
    AND responsavel = auth.uid()
  );

-- Operador comercial/analista atualiza (na prática) só proposta_enviada_cliente.
-- A limitação de quais colunas ele mexe a gente garante no FRONT.
CREATE POLICY "Operador_comercial update proposta"
  ON precatorios FOR UPDATE
  USING (get_user_role() IN ('analista', 'gestor'))
  WITH CHECK (get_user_role() IN ('analista', 'gestor'));

-- ========================================
-- 6. POLICIES DE DELETE (quem pode deletar)
-- ========================================

-- Apenas Admin pode deletar precatórios
CREATE POLICY "Admin delete precatorios"
  ON precatorios FOR DELETE
  USING (get_user_role() = 'admin');

-- ========================================
-- 7. ÍNDICE PARA PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_precatorios_responsavel ON precatorios(responsavel);
