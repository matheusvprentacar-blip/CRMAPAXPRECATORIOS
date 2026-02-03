-- ============================================
-- SCRIPT 191: FIX FINANCE RLS & VIEW
-- Description: Re-creates the View and updates RLS to use real-time table lookup
--              (avoiding stale JWT issues).
-- ============================================

BEGIN;

-- 1. Re-create the View (Safety check)
DROP VIEW IF EXISTS public.v_financial_transactions_norm CASCADE;

CREATE OR REPLACE VIEW public.v_financial_transactions_norm AS
SELECT
    id,
    description,
    amount,
    type,
    category,
    status,
    due_date,
    payment_date,
    installment_number,
    total_installments,
    department,
    user_id,
    created_at,
    -- Standardized Date Reference (Payment Date if paid, else Due Date)
    COALESCE(payment_date, due_date) AS date_ref,
    -- Month Reference (YYYY-MM) for grouping
    TO_CHAR(COALESCE(payment_date, due_date), 'YYYY-MM') AS month_ref,
    -- Booleans for easy frontend logic
    (type = 'income') AS is_receita,
    (type = 'expense') AS is_despesa,
    (status = 'pago') AS is_realizado,
    -- Late calculation (Pending AND Due Date < Today)
    (status = 'atrasado' OR (status = 'pendente' AND due_date < CURRENT_DATE)) AS is_atrasado_calc
FROM public.financial_transactions;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Finance/Admin can manage all transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.financial_transactions;

-- 3. New Policy: Real-time Check against public.usuarios (Fixes Stale JWT)
-- Allows Admin and Financeiro to View/Manage ALL
CREATE POLICY "Finance/Admin Realtime Policy" ON public.financial_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE id = auth.uid()
            AND (
                'admin' = ANY(role) OR 
                'financeiro' = ANY(role)
            )
        )
    );

-- 4. New Policy: Users can view their own rows (Standard)
CREATE POLICY "Users Own Logic" ON public.financial_transactions
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- 5. Grant Permissions (Ensure web_anon/authenticated can read view)
GRANT SELECT ON public.v_financial_transactions_norm TO authenticated;
GRANT SELECT ON public.v_financial_transactions_norm TO service_role;

COMMIT;
