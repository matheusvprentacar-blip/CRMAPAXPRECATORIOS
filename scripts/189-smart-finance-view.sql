-- ============================================
-- SCRIPT 189: SMART FINANCE VIEW
-- Description: Creates a normalized view for financial reporting.
--              Standardizes logic for dates, status, and calculated fields.
-- ============================================

CREATE OR REPLACE VIEW public.v_financial_transactions_norm AS
SELECT
    id,
    description,
    amount,
    type,       -- 'income' | 'expense'
    category,
    status,     -- 'pendente' | 'pago' | 'atrasado'
    department,
    installment_number,
    total_installments,
    user_id,
    created_at,
    
    -- Normalized Dates
    due_date,
    payment_date,
    COALESCE(payment_date, due_date) AS date_ref, -- Used for timeline plotting
    TO_CHAR(COALESCE(payment_date, due_date), 'YYYY-MM') AS month_ref,
    
    -- Boolean Flags for easy filtering/summing
    (type = 'income') AS is_receita,
    (type = 'expense') AS is_despesa,
    (status = 'pago') AS is_realizado,
    (status = 'pendente') AS is_pendente,
    
    -- Logic for Overdue (Atrasado)
    -- True if status is strictly 'atrasado' OR (pending AND due_date < today)
    (
        status = 'atrasado' OR 
        (status = 'pendente' AND due_date < CURRENT_DATE)
    ) AS is_atrasado_calc,
    
    -- Logic for Future (Projeção)
    (
        status = 'pendente' AND due_date >= CURRENT_DATE
    ) AS is_futuro

FROM public.financial_transactions;

-- Grant access to authenticated users
GRANT SELECT ON public.v_financial_transactions_norm TO authenticated;
