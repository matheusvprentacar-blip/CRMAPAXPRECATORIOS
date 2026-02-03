-- ============================================
-- SCRIPT 186: HR Module Initialization
-- Description: Unlocks roles, adds HR profile fields, and creates Document/Financial tables.
-- ============================================

BEGIN;

-- 1) Remove Role Limits (Unlimited Roles)
-- We previously had a constraint 'max_three_roles' or similar. Let's drop any possible limits.
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS max_two_roles;
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS max_three_roles;

-- 2) Add HR Profile Fields to 'usuarios'
-- Adding columns if they don't exist
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

-- 3) Create HR Documents Table
CREATE TABLE IF NOT EXISTS public.hr_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'documento', 'contrato', 'atestado', 'outros'
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) Create HR Financials Table (Salaries, Commissions, Bonuses)
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

-- 5) Create HR Medical Leaves / Absences (Ocorrencias)
CREATE TABLE IF NOT EXISTS public.hr_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'atestado', 'falta', 'ferias', 'licenca'
    start_date DATE NOT NULL,
    end_date DATE, -- If null, might be single day
    description TEXT,
    document_url TEXT, -- Link to atestado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6) RLS Policies (Security)
-- Enable RLS
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leaves ENABLE ROW LEVEL SECURITY;

-- Policy: Admin and Gestor (HR) can view/edit everything
CREATE POLICY "Admin/HR can manager all documents" ON public.hr_documents
    FOR ALL
    USING (
        auth.jwt() -> 'app_metadata' -> 'role' ?| array['admin', 'gestor']
    );

CREATE POLICY "Admin/HR can manager all financials" ON public.hr_financials
    FOR ALL
    USING (
        auth.jwt() -> 'app_metadata' -> 'role' ?| array['admin', 'gestor']
    );

CREATE POLICY "Admin/HR can manager all leaves" ON public.hr_leaves
    FOR ALL
    USING (
        auth.jwt() -> 'app_metadata' -> 'role' ?| array['admin', 'gestor']
    );

-- Policy: Users can view their own data (Optional: restrict financials?)
-- For now, letting users see their own docs/finance/leaves
CREATE POLICY "Users can view own documents" ON public.hr_documents
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own financials" ON public.hr_financials
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own leaves" ON public.hr_leaves
    FOR SELECT
    USING (auth.uid() = user_id);

COMMIT;
