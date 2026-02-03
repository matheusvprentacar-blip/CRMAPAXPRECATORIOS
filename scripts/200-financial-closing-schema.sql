-- scripts/200-financial-closing-schema.sql
-- Módulo de Fechamento Financeiro
-- Adiciona campos de fechamento ao precatório e vínculo financeiro

BEGIN;

-- 1. Alterar tabela precatorios
ALTER TABLE public.precatorios
ADD COLUMN IF NOT EXISTS fechamento_valor_compra NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS fechamento_comissao_operador NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS fechamento_comissao_apax NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS fechamento_data TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fechamento_status TEXT DEFAULT 'rascunho' CHECK (fechamento_status IN ('rascunho', 'finalizado'));

-- 2. Alterar tabela financial_transactions
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS precatorio_id UUID REFERENCES public.precatorios(id) ON DELETE SET NULL;

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_financial_precatorio ON public.financial_transactions(precatorio_id);

-- 3. RPC para Finalizar Fechamento
-- Grava dados no precatório e gera transações financeiras automaticamente

CREATE OR REPLACE FUNCTION public.finalizar_fechamento_precatorio(
  p_precatorio_id UUID,
  p_valor_compra NUMERIC,
  p_comissao_operador NUMERIC,
  p_comissao_apax NUMERIC,
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
    fechamento_data = p_data_pagamento, -- Usando data do pagamento como data de fechamento efetivo
    fechamento_status = 'finalizado',
    updated_at = NOW()
  WHERE id = p_precatorio_id;

  -- 2. Gerar Transações Financeiras

  -- 2.1 Despesa: Compra do Crédito (Pago ao Credor)
  INSERT INTO public.financial_transactions (
    description,
    amount,
    type,
    category,
    status,
    due_date,
    payment_date,
    precatorio_id,
    notes,
    created_by
  ) VALUES (
    'Compra de Precatório - ' || v_precatorio.numero_precatorio,
    p_valor_compra,
    'expense',
    'operacional', -- Categoria sugerida para compra de ativos
    'pago', -- Assume-se pago ao finalizar fechamento? Ou pendente? O user disse "finalizar fechamento", entendo que consolidou.
    p_data_pagamento,
    p_data_pagamento,
    p_precatorio_id,
    'Gerado automaticamente pelo fechamento',
    v_user_id
  );

  -- 2.2 Despesa: Comissão do Operador (se houver)
  IF p_comissao_operador > 0 THEN
    INSERT INTO public.financial_transactions (
      description,
      amount,
      type,
      category,
      status,
      due_date,
      payment_date,
      precatorio_id,
      user_id, -- Vincula ao operador se possível? (precisaria passar ID, por enquanto deixamos null ou pegamos do precatorio.responsavel)
      department,
      notes,
      created_by
    ) VALUES (
      'Comissão Operador - ' || v_precatorio.numero_precatorio,
      p_comissao_operador,
      'expense',
      'pessoal', -- Comissão entra como pessoal/vendas
      'pendente', -- Comissão gera conta a pagar (pendente)
      p_data_pagamento, -- Vencimento na data do fechamento?
      NULL,
      p_precatorio_id,
      v_precatorio.responsavel, -- Tenta vincular ao responsavel do precatorio
      'vendas',
      'Gerado automaticamente pelo fechamento',
      v_user_id
    );
  END IF;

  -- 2.3 Receita: Comissão Apax ? 
  -- O user disse "comissão da Apax tbm deve ser informada... resultados devem ser inclusos no financeiro como receita ou despesas"
  -- Se a Apax "ganha" comissão, é Receita Operacional ou é apenas o spread?
  -- Geralmente Compra = Despesa. Venda futura = Receita.
  -- Se "Comissão Apax" é um valor que a Apax DESTINOU a si mesma de um montante maior, contabilmente seria Receita?
  -- Vou assumir que isso representa a "Receita Bruta" ou "Spread" que a Apax reconhece nesse momento.
  
  IF p_comissao_apax > 0 THEN
    INSERT INTO public.financial_transactions (
      description,
      amount,
      type,
      category,
      status,
      due_date,
      payment_date,
      precatorio_id,
      department,
      notes,
      created_by
    ) VALUES (
      'Receita/Comissão Apax - ' || v_precatorio.numero_precatorio,
      p_comissao_apax,
      'income',
      'vendas', -- Ou operacional
      'pago', -- Se o fechamento ocorreu, o dinheiro já deve ter entrado/saído
      p_data_pagamento,
      p_data_pagamento,
      p_precatorio_id,
      'adm',
      'Gerado automaticamente pelo fechamento',
      v_user_id
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Permissões
REVOKE ALL ON FUNCTION public.finalizar_fechamento_precatorio(UUID, NUMERIC, NUMERIC, NUMERIC, DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.finalizar_fechamento_precatorio(UUID, NUMERIC, NUMERIC, NUMERIC, DATE) TO authenticated;

COMMIT;
