-- Migration 160: Financial Indices Schema Standardization (Task 1.1)
-- Garantir estrutura correta para Calculadora V2

-- 1. Create Table if not exists (Refining previous 159 definitions)
CREATE TABLE IF NOT EXISTS public.economic_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    reference_date DATE NOT NULL,
    value NUMERIC(15, 8) NOT NULL, -- Precisão aumentada para taxas mensais compostas
    is_percentual BOOLEAN DEFAULT true,
    source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint 1: Unicidade de índice por data
    CONSTRAINT economic_indices_type_date_key UNIQUE (type, reference_date)
);

-- 1.5 NORMALIZE DATA (Fix types from initial seeds if any)
-- A. Prevent conflicts: Delete legacy rows if the target standard row already exists
DELETE FROM public.economic_indices 
WHERE type = 'selic_mensal' 
  AND EXISTS (SELECT 1 FROM public.economic_indices e2 WHERE e2.type = 'selic' AND e2.reference_date = public.economic_indices.reference_date);

DELETE FROM public.economic_indices 
WHERE type = 'ipca_e_mensal' 
  AND EXISTS (SELECT 1 FROM public.economic_indices e2 WHERE e2.type = 'ipca_e' AND e2.reference_date = public.economic_indices.reference_date);

DELETE FROM public.economic_indices 
WHERE type = 'ipca_mensal' 
  AND EXISTS (SELECT 1 FROM public.economic_indices e2 WHERE e2.type = 'ipca' AND e2.reference_date = public.economic_indices.reference_date);

-- B. Migrate remaining legacy rows
UPDATE public.economic_indices SET type = 'selic' WHERE type = 'selic_mensal';
UPDATE public.economic_indices SET type = 'ipca_e' WHERE type = 'ipca_e_mensal';
UPDATE public.economic_indices SET type = 'ipca' WHERE type = 'ipca_mensal';

-- C. Cleanup: Delete any rows that are NOT in the allowed list to satisfy the CHECK constraint
DELETE FROM public.economic_indices 
WHERE type NOT IN ('selic', 'ipca', 'ipca_e', 'tr', 'poupança', 'ipca_fator_tjpr');

-- 2. Validate Allowed Types (Optional but recommended for strictness)
-- Tipos padronizados:
-- 'selic' (mensal percentual)
-- 'ipca' (mensal percentual)
-- 'tr' (mensal percentual - legacy/poupança)
-- 'ipca_e' (mensal percentual - legacy)
ALTER TABLE public.economic_indices DROP CONSTRAINT IF EXISTS check_indice_type;
ALTER TABLE public.economic_indices ADD CONSTRAINT check_indice_type 
    CHECK (type IN ('selic', 'ipca', 'ipca_e', 'tr', 'poupança', 'ipca_fator_tjpr'));

-- 3. Indices de Performance
CREATE INDEX IF NOT EXISTS idx_economic_indices_lookup 
    ON public.economic_indices(type, reference_date);

-- 4. RLS (Row Level Security)
ALTER TABLE public.economic_indices ENABLE ROW LEVEL SECURITY;

-- Leitura: Aberta para autenticados (Calculadora precisa ler)
CREATE POLICY "Indices_Select_Authenticated" 
    ON public.economic_indices FOR SELECT 
    TO authenticated 
    USING (true);

-- Escrita: Restrita (Apenas jobs/admins)
-- Ajuste a role conforme seu sistema ('admin', 'service_role', etc)
CREATE POLICY "Indices_Modify_Admin" 
    ON public.economic_indices FOR ALL 
    TO authenticated 
    USING (
        EXISTS ( 
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() 
            AND role && ARRAY['admin', 'gestor_calculo']::text[] 
        )
    );

COMMENT ON TABLE public.economic_indices IS 'Tabela oficial de índices econômicos (V2). Types: selic, ipca, ipca_e.';
