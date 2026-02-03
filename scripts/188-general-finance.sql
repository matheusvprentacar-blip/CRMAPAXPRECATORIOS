-- ============================================
-- SCRIPT 188: GENERAL FINANCIAL SYSTEM
-- Description: Creates a unified table for all financial transactions (HR, Expenses, Incomes).
--              Supersedes 'hr_financials' for a broader scope.
-- ============================================

BEGIN;

-- 1. Create Financial Transactions Table
-- This table handles Incomes (Receitas), Expenses (Despesas), and HR Payments.
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL, -- Positive value always, 'type' determines sign for calc
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')), 
    category TEXT NOT NULL, -- 'vendas', 'servicos', 'pessoal', 'impostos', 'operacional', 'marketing', 'outros'
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'atrasado')),
    
    due_date DATE NOT NULL, -- Data de Vencimento (Previsto)
    payment_date DATE, -- Data do Pagamento (Realizado)
    
    -- Installment Support
    recurrence_id UUID, -- To group installments of the same purchase/sale
    installment_number INTEGER DEFAULT 1,
    total_installments INTEGER DEFAULT 1,
    
    -- HR Link (Optional)
    user_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    
    -- Metadata
    department TEXT, -- 'rh', 'vendas', 'adm'
    document_url TEXT, -- Receipt/Invoice
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Migrate existing HR Financials (Optional - if we want to keep history)
-- Mapping: hr_financials -> financial_transactions
-- type: 'salario' -> expense (category: pessoal)
-- type: 'comissao' -> expense (category: pessoal)
-- type: 'bonus' -> expense (category: pessoal)
-- type: 'adiantamento' -> expense (category: pessoal)

INSERT INTO public.financial_transactions (
    description,
    amount,
    type,
    category,
    status,
    due_date,
    payment_date,
    user_id,
    department,
    notes,
    created_at
)
SELECT 
    COALESCE(description, 'Pagamento RH - ' || type),
    amount,
    'expense',
    'pessoal',
    status,
    date, -- assuming date was due_date or payment_date depending on status, mapping to due_date roughly
    CASE WHEN status = 'pago' THEN date ELSE NULL END, -- Set payment_date if paid
    user_id,
    'rh',
    'Migrado de hr_financials',
    created_at
FROM public.hr_financials;

-- 3. Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Admin/Sub-Admin/Financeiro/Gestor can Manage All
CREATE POLICY "Finance/Admin can manage all transactions" ON public.financial_transactions
    FOR ALL
    USING (
        auth.jwt() -> 'app_metadata' -> 'role' ?| array['admin', 'gestor', 'financeiro']
    );

-- Users can View their own HR transactions
CREATE POLICY "Users can view own transactions" ON public.financial_transactions
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- 5. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_financial_date ON public.financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_type ON public.financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_user ON public.financial_transactions(user_id);

COMMIT;
