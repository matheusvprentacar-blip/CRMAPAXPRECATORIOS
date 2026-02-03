-- ============================================
-- SCRIPT 187: FULL HR MODULE SETUP (Master Script)
-- Description: Ensures all necessary database structures exist for the HR System.
--              Includes converting roles to array, removing limits, and creating HR tables.
-- ============================================

BEGIN;

-- 1. Ensure 'role' column is an ARRAY (text[]) for multiple roles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'role'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.usuarios
      ALTER COLUMN role TYPE text[]
      USING CASE
        WHEN role IS NULL THEN NULL
        ELSE ARRAY[role]
      END;
      
    -- Set default to array
    ALTER TABLE public.usuarios
      ALTER COLUMN role SET DEFAULT ARRAY['operador_comercial']::text[];
  END IF;
END $$;

-- 2. Remove any role limitations (Unlimited Roles)
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS max_two_roles;
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS max_three_roles;

-- 3. Add HR Profile Fields to 'usuarios' table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'admission_date') THEN
        ALTER TABLE public.usuarios ADD COLUMN admission_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'position') THEN
        ALTER TABLE public.usuarios ADD COLUMN position TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'bank_info') THEN
        ALTER TABLE public.usuarios ADD COLUMN bank_info JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'address') THEN
        ALTER TABLE public.usuarios ADD COLUMN address JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. Create HR Documents Table
CREATE TABLE IF NOT EXISTS public.hr_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'documento', 'contrato', 'atestado', 'outros'
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create HR Financials Table
CREATE TABLE IF NOT EXISTS public.hr_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'salario', 'comissao', 'bonus', 'adiantamento'
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'pago'
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create HR Leaves Table (Ocorrências)
CREATE TABLE IF NOT EXISTS public.hr_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'atestado', 'falta', 'ferias', 'licenca'
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Enable Security (RLS)
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leaves ENABLE ROW LEVEL SECURITY;

-- 8. Create Policies (Drop existing first to avoid errors if re-running)

-- Clean up old policies if they exist by name (doing this via DO block to handle errors gracefully is tricky in pure SQL script without knowing names perfectly, 
-- but CREATE OR REPLACE implies just dropping usually. Here we use 'IF NOT EXISTS' logic by attempting creation or dropping first)

DROP POLICY IF EXISTS "Admin/HR can manager all documents" ON public.hr_documents;
CREATE POLICY "Admin/HR can manager all documents" ON public.hr_documents
    FOR ALL
    USING (
        auth.jwt() -> 'app_metadata' -> 'role' ?| array['admin', 'gestor']
    );

DROP POLICY IF EXISTS "Admin/HR can manager all financials" ON public.hr_financials;
CREATE POLICY "Admin/HR can manager all financials" ON public.hr_financials
    FOR ALL
    USING (
        auth.jwt() -> 'app_metadata' -> 'role' ?| array['admin', 'gestor']
    );

DROP POLICY IF EXISTS "Admin/HR can manager all leaves" ON public.hr_leaves;
CREATE POLICY "Admin/HR can manager all leaves" ON public.hr_leaves
    FOR ALL
    USING (
        auth.jwt() -> 'app_metadata' -> 'role' ?| array['admin', 'gestor']
    );

DROP POLICY IF EXISTS "Users can view own documents" ON public.hr_documents;
CREATE POLICY "Users can view own documents" ON public.hr_documents
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own financials" ON public.hr_financials;
CREATE POLICY "Users can view own financials" ON public.hr_financials
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own leaves" ON public.hr_leaves;
CREATE POLICY "Users can view own leaves" ON public.hr_leaves
    FOR SELECT
    USING (auth.uid() = user_id);


COMMIT;
