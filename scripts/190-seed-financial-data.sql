-- ============================================
-- SCRIPT 190: ROBUST TEST DATA SEEDING (V2)
-- Description: Inserts 12 months of financial data for robust Dashboard testing.
-- ============================================

DO $$
DECLARE
    rec_date DATE;
    base_month DATE;
    i INTEGER;
BEGIN
    -- Clear existing test data (Optional: remove if you want to keep)
    -- DELETE FROM public.financial_transactions WHERE notes = 'Seed Data';

    -- Loop for past 6 months and future 6 months
    FOR i IN -6..5 LOOP
        base_month := (CURRENT_DATE + (i || ' month')::INTERVAL)::DATE;
        
        -- 1. SALÁRIOS (Monthly Expense - High Value)
        INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, department, notes)
        VALUES (
            'Folha de Pagamento - ' || TO_CHAR(base_month, 'Mon/YY'),
            45000.00,
            'expense',
            'pessoal',
            CASE WHEN i < 0 THEN 'pago' ELSE 'pendente' END,
            base_month + INTERVAL '5 days', -- 5th of month
            CASE WHEN i < 0 THEN base_month + INTERVAL '5 days' ELSE NULL END,
            'rh',
            'Seed Data'
        );

        -- 2. ALUGUEL (Monthly Expense - Fixed)
        INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, department, notes)
        VALUES (
            'Aluguel Corporativo',
            3500.00,
            'expense',
            'operacional',
            CASE WHEN i < 0 THEN 'pago' ELSE 'pendente' END,
            base_month + INTERVAL '10 days',
            CASE WHEN i < 0 THEN base_month + INTERVAL '10 days' ELSE NULL END,
            'adm',
            'Seed Data'
        );

        -- 3. VENDAS (Variable Income)
        -- Transaction A
        INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, department, notes)
        VALUES (
            'Venda de Precatório - Lote ' || ABS(i),
            (20000 + (random() * 15000))::NUMERIC(10,2), -- Random between 20k and 35k
            'income',
            'vendas',
            CASE WHEN i <= 0 THEN 'pago' ELSE 'pendente' END,
            base_month + INTERVAL '15 days',
            CASE WHEN i <= 0 THEN base_month + INTERVAL '16 days' ELSE NULL END,
            'vendas',
            'Seed Data'
        );
        
        -- Transaction B (Random small income)
        INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, department, notes)
        VALUES (
            'Consultoria Honorários',
            (5000 + (random() * 2000))::NUMERIC(10,2), 
            'income',
            'servicos',
            CASE WHEN i < 0 THEN 'pago' ELSE 'pendente' END,
            base_month + INTERVAL '20 days',
            CASE WHEN i < 0 THEN base_month + INTERVAL '20 days' ELSE NULL END,
            'juridico',
            'Seed Data'
        );
        
         -- 4. IMPOSTOS (Quarterly-ish but we add randomized)
        IF i % 3 = 0 THEN
             INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, department, notes)
            VALUES (
                'Impostos Trimestrais',
                12500.00,
                'expense',
                'impostos',
                CASE WHEN i < 0 THEN 'pago' ELSE 'pendente' END,
                base_month + INTERVAL '25 days',
                CASE WHEN i < 0 THEN base_month + INTERVAL '25 days' ELSE NULL END,
                'financeiro',
                'Seed Data'
            );
        END IF;

    END LOOP;
    
    -- 5. LATE PAYMENTS (Simulate Overdue)
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, department, notes)
    VALUES 
    ('Fornecedor de TI (Atrasado)', 1200.00, 'expense', 'tecnologia', 'atrasado', CURRENT_DATE - INTERVAL '15 days', 'ti', 'Seed Data'),
    ('Cliente X - Parcela 2 (Atrasado)', 5000.00, 'income', 'vendas', 'atrasado', CURRENT_DATE - INTERVAL '10 days', 'vendas', 'Seed Data');

END $$;
