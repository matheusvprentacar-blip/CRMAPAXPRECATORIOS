-- scripts/201-add-closing-expenses.sql
-- Adiciona campos de despesas detalhadas ao fechamento do precatório
-- E atualiza a RPC para lançar cada item individualmente no financeiro

BEGIN;

-- 1. Adicionar colunas de despesas extras na tabela precatorios
ALTER TABLE public.precatorios
ADD COLUMN IF NOT EXISTS fechamento_escritura NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS fechamento_procuracao NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS fechamento_funrejus NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS fechamento_certidoes NUMERIC(15, 2), -- Simples
ADD COLUMN IF NOT EXISTS fechamento_certidao_central NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS fechamento_autenticacao NUMERIC(15, 2);

-- 2. Atualizar RPC para aceitar e processar novos campos
CREATE OR REPLACE FUNCTION public.finalizar_fechamento_precatorio(
  p_precatorio_id UUID,
  p_valor_compra NUMERIC,
  p_comissao_operador NUMERIC,
  p_comissao_apax NUMERIC,
  -- Novos campos (opcionais, default 0 no frontend)
  p_escritura NUMERIC,
  p_procuracao NUMERIC,
  p_funrejus NUMERIC,
  p_certidoes NUMERIC,
  p_certidao_central NUMERIC,
  p_autenticacao NUMERIC,
  -- Data
  p_data_pagamento DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_precatorio RECORD;
  v_user_id UUID;
  v_roles TEXT[];
BEGIN
  v_user_id := auth.uid();
  
  -- Verificar permissões (Admin ou Financeiro)
  SELECT role INTO v_roles FROM public.usuarios WHERE id = v_user_id;
  
  IF NOT ('admin' = ANY(v_roles) OR 'financeiro' = ANY(v_roles)) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas Admin ou Financeiro podem finalizar o fechamento.';
  END IF;

  -- Buscar dados do precatório
  SELECT * INTO v_precatorio FROM public.precatorios WHERE id = p_precatorio_id;
  
  IF v_precatorio IS NULL THEN
    RAISE EXCEPTION 'Precatório não encontrado.';
  END IF;

  -- 1. Atualizar precatório
  UPDATE public.precatorios
  SET 
    fechamento_valor_compra = p_valor_compra,
    fechamento_comissao_operador = p_comissao_operador,
    fechamento_comissao_apax = p_comissao_apax,
    
    fechamento_escritura = p_escritura,
    fechamento_procuracao = p_procuracao,
    fechamento_funrejus = p_funrejus,
    fechamento_certidoes = p_certidoes,
    fechamento_certidao_central = p_certidao_central,
    fechamento_autenticacao = p_autenticacao,

    fechamento_data = p_data_pagamento,
    fechamento_status = 'finalizado',
    updated_at = NOW()
  WHERE id = p_precatorio_id;

  -- 2. Gerar Transações Financeiras

  -- Helper function to insert expense if value > 0
  -- (Inline logic to keep simple without sub-function)

  -- 2.1 Compra do Crédito
  INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, notes, created_by)
  VALUES ('Compra de Precatório - ' || v_precatorio.numero_precatorio, p_valor_compra, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id, 'Fechamento Automático', v_user_id);

  -- 2.2 Comissão Operador
  IF p_comissao_operador > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, user_id, department, notes, created_by)
    VALUES ('Comissão Operador - ' || v_precatorio.numero_precatorio, p_comissao_operador, 'expense', 'pessoal', 'pendente', p_data_pagamento, NULL, p_precatorio_id, v_precatorio.responsavel, 'vendas', 'Fechamento Automático', v_user_id);
  END IF;

  -- 2.3 Receita Apax
  IF p_comissao_apax > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, department, notes, created_by)
    VALUES ('Receita/Comissão Apax - ' || v_precatorio.numero_precatorio, p_comissao_apax, 'income', 'vendas', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id, 'adm', 'Fechamento Automático', v_user_id);
  END IF;

  -- 2.4 Despesas Extras (Custas)
  -- Todas entram como 'expense' e 'operacional' (ou 'impostos'/'taxas' se tivesse). Usaremos 'operacional'.

  IF p_escritura > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, created_by)
    VALUES ('Custa: Escritura Pública - ' || v_precatorio.numero_precatorio, p_escritura, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id, v_user_id);
  END IF;

  IF p_procuracao > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, created_by)
    VALUES ('Custa: Procuração - ' || v_precatorio.numero_precatorio, p_procuracao, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id, v_user_id);
  END IF;

  IF p_funrejus > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, created_by)
    VALUES ('Custa: Funrejus - ' || v_precatorio.numero_precatorio, p_funrejus, 'expense', 'impostos', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id, v_user_id);
  END IF;

  IF p_certidoes > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, created_by)
    VALUES ('Custa: Certidões Simples - ' || v_precatorio.numero_precatorio, p_certidoes, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id, v_user_id);
  END IF;

  IF p_certidao_central > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, created_by)
    VALUES ('Custa: Certidão Central - ' || v_precatorio.numero_precatorio, p_certidao_central, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id, v_user_id);
  END IF;

  IF p_autenticacao > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, created_by)
    VALUES ('Custa: Autenticação - ' || v_precatorio.numero_precatorio, p_autenticacao, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id, v_user_id);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
