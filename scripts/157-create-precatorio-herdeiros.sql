-- ==============================================================================
-- MIGRATION: 157-create-precatorio-herdeiros.sql
-- PURPOSE: Create table to manage heirs for precatorios
-- ==============================================================================

BEGIN;

-- 1. Create table precatorio_herdeiros
CREATE TABLE IF NOT EXISTS public.precatorio_herdeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  precatorio_id UUID NOT NULL REFERENCES public.precatorios(id) ON DELETE CASCADE,

  -- Personal Data
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,

  -- Bank Data
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta TEXT, -- 'corrente', 'poupanca', 'pagamento', etc.
  chave_pix TEXT,

  -- Share & Negotiation
  percentual_participacao NUMERIC(5,2) DEFAULT 0, -- 0 to 100%

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_precatorio_herdeiros_precatorio_id
  ON public.precatorio_herdeiros(precatorio_id);

-- 3. RLS Policies
ALTER TABLE public.precatorio_herdeiros ENABLE ROW LEVEL SECURITY;

-- Policy: Select (All authenticated)
CREATE POLICY herdeiros_select_all
  ON public.precatorio_herdeiros FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Insert (Admin, Managers, Operators)
CREATE POLICY herdeiros_insert_role
  ON public.precatorio_herdeiros FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
      AND role && ARRAY['admin', 'gestor', 'operador', 'operador_comercial', 'operador_calculo']
    )
  );

-- Policy: Update (Admin, Managers, Operators)
CREATE POLICY herdeiros_update_role
  ON public.precatorio_herdeiros FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
      AND role && ARRAY['admin', 'gestor', 'operador', 'operador_comercial', 'operador_calculo']
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
      AND role && ARRAY['admin', 'gestor', 'operador', 'operador_comercial', 'operador_calculo']
    )
  );

-- Policy: Delete (Admin, Managers, Operators)
CREATE POLICY herdeiros_delete_role
  ON public.precatorio_herdeiros FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
      AND role && ARRAY['admin', 'gestor', 'operador', 'operador_comercial', 'operador_calculo']
    )
  );

-- 4. Trigger for updated_at
DROP TRIGGER IF EXISTS update_precatorio_herdeiros_updated_at ON public.precatorio_herdeiros;
CREATE TRIGGER update_precatorio_herdeiros_updated_at
  BEFORE UPDATE ON public.precatorio_herdeiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
