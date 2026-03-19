BEGIN;

CREATE TABLE IF NOT EXISTS public.precatorio_proposta_fechamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precatorio_id UUID NOT NULL UNIQUE REFERENCES public.precatorios(id) ON DELETE CASCADE,
  proposta_percentual_credor NUMERIC(8,4),
  proposta_percentual_advogado NUMERIC(8,4),
  proposta_aceita BOOLEAN NOT NULL DEFAULT FALSE,
  proposta_data_aceite DATE,
  proposta_aceita_por UUID,
  fechamento_valor_compra NUMERIC(15,2),
  fechamento_comissao_operador NUMERIC(15,2),
  fechamento_comissao_apax NUMERIC(15,2),
  fechamento_escritura NUMERIC(15,2),
  fechamento_procuracao NUMERIC(15,2),
  fechamento_funrejus NUMERIC(15,2),
  fechamento_certidoes NUMERIC(15,2),
  fechamento_certidao_central NUMERIC(15,2),
  fechamento_autenticacao NUMERIC(15,2),
  fechamento_data_pagamento DATE,
  fechamento_status TEXT NOT NULL DEFAULT 'rascunho' CHECK (fechamento_status IN ('rascunho', 'finalizado')),
  financeiro_transacoes_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_ppf_precatorio_id ON public.precatorio_proposta_fechamento(precatorio_id);

ALTER TABLE public.precatorio_proposta_fechamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ppf_select_by_precatorio_access" ON public.precatorio_proposta_fechamento;
CREATE POLICY "ppf_select_by_precatorio_access"
  ON public.precatorio_proposta_fechamento
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.precatorios p WHERE p.id = precatorio_id));

DROP POLICY IF EXISTS "ppf_insert_by_precatorio_access" ON public.precatorio_proposta_fechamento;
CREATE POLICY "ppf_insert_by_precatorio_access"
  ON public.precatorio_proposta_fechamento
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.precatorios p WHERE p.id = precatorio_id));

DROP POLICY IF EXISTS "ppf_update_by_precatorio_access" ON public.precatorio_proposta_fechamento;
CREATE POLICY "ppf_update_by_precatorio_access"
  ON public.precatorio_proposta_fechamento
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.precatorios p WHERE p.id = precatorio_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.precatorios p WHERE p.id = precatorio_id));

DROP POLICY IF EXISTS "ppf_delete_by_precatorio_access" ON public.precatorio_proposta_fechamento;
CREATE POLICY "ppf_delete_by_precatorio_access"
  ON public.precatorio_proposta_fechamento
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.precatorios p WHERE p.id = precatorio_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.precatorio_proposta_fechamento TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_precatorio_proposta_fechamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_proposta_percentual_credor NUMERIC;
  v_proposta_percentual_advogado NUMERIC;
BEGIN
  v_proposta_percentual_credor := CASE
    WHEN COALESCE(NEW.dados_calculo ->> 'proposta_escolhida_percentual', '') ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
      THEN REPLACE(NEW.dados_calculo ->> 'proposta_escolhida_percentual', ',', '.')::NUMERIC
    ELSE NULL
  END;

  v_proposta_percentual_advogado := CASE
    WHEN COALESCE(NEW.dados_calculo ->> 'proposta_advogado_percentual', '') ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
      THEN REPLACE(NEW.dados_calculo ->> 'proposta_advogado_percentual', ',', '.')::NUMERIC
    ELSE NULL
  END;

  INSERT INTO public.precatorio_proposta_fechamento (
    precatorio_id,
    proposta_percentual_credor,
    proposta_percentual_advogado,
    proposta_aceita,
    proposta_data_aceite,
    proposta_aceita_por,
    fechamento_valor_compra,
    fechamento_comissao_operador,
    fechamento_comissao_apax,
    fechamento_escritura,
    fechamento_procuracao,
    fechamento_funrejus,
    fechamento_certidoes,
    fechamento_certidao_central,
    fechamento_autenticacao,
    fechamento_data_pagamento,
    fechamento_status,
    created_by,
    updated_by,
    updated_at
  )
  VALUES (
    NEW.id,
    v_proposta_percentual_credor,
    v_proposta_percentual_advogado,
    COALESCE(NEW.proposta_aceita, FALSE),
    NEW.data_aceite_proposta,
    NEW.proposta_aceita_id,
    NEW.fechamento_valor_compra,
    NEW.fechamento_comissao_operador,
    NEW.fechamento_comissao_apax,
    NEW.fechamento_escritura,
    NEW.fechamento_procuracao,
    NEW.fechamento_funrejus,
    NEW.fechamento_certidoes,
    NEW.fechamento_certidao_central,
    NEW.fechamento_autenticacao,
    CASE WHEN NEW.fechamento_data IS NULL THEN NULL ELSE (NEW.fechamento_data AT TIME ZONE 'UTC')::DATE END,
    COALESCE(NEW.fechamento_status, 'rascunho'),
    NEW.criado_por,
    auth.uid(),
    NOW()
  )
  ON CONFLICT (precatorio_id) DO UPDATE
  SET
    proposta_percentual_credor = EXCLUDED.proposta_percentual_credor,
    proposta_percentual_advogado = EXCLUDED.proposta_percentual_advogado,
    proposta_aceita = EXCLUDED.proposta_aceita,
    proposta_data_aceite = EXCLUDED.proposta_data_aceite,
    proposta_aceita_por = EXCLUDED.proposta_aceita_por,
    fechamento_valor_compra = EXCLUDED.fechamento_valor_compra,
    fechamento_comissao_operador = EXCLUDED.fechamento_comissao_operador,
    fechamento_comissao_apax = EXCLUDED.fechamento_comissao_apax,
    fechamento_escritura = EXCLUDED.fechamento_escritura,
    fechamento_procuracao = EXCLUDED.fechamento_procuracao,
    fechamento_funrejus = EXCLUDED.fechamento_funrejus,
    fechamento_certidoes = EXCLUDED.fechamento_certidoes,
    fechamento_certidao_central = EXCLUDED.fechamento_certidao_central,
    fechamento_autenticacao = EXCLUDED.fechamento_autenticacao,
    fechamento_data_pagamento = EXCLUDED.fechamento_data_pagamento,
    fechamento_status = EXCLUDED.fechamento_status,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_precatorio_proposta_fechamento ON public.precatorios;
CREATE TRIGGER trigger_sync_precatorio_proposta_fechamento
AFTER INSERT OR UPDATE OF
  dados_calculo,
  proposta_aceita,
  data_aceite_proposta,
  proposta_aceita_id,
  fechamento_valor_compra,
  fechamento_comissao_operador,
  fechamento_comissao_apax,
  fechamento_escritura,
  fechamento_procuracao,
  fechamento_funrejus,
  fechamento_certidoes,
  fechamento_certidao_central,
  fechamento_autenticacao,
  fechamento_data,
  fechamento_status
ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.sync_precatorio_proposta_fechamento();

INSERT INTO public.precatorio_proposta_fechamento (
  precatorio_id,
  proposta_percentual_credor,
  proposta_percentual_advogado,
  proposta_aceita,
  proposta_data_aceite,
  proposta_aceita_por,
  fechamento_valor_compra,
  fechamento_comissao_operador,
  fechamento_comissao_apax,
  fechamento_escritura,
  fechamento_procuracao,
  fechamento_funrejus,
  fechamento_certidoes,
  fechamento_certidao_central,
  fechamento_autenticacao,
  fechamento_data_pagamento,
  fechamento_status,
  created_by,
  updated_by
)
SELECT
  p.id,
  CASE WHEN COALESCE(p.dados_calculo ->> 'proposta_escolhida_percentual', '') ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
    THEN REPLACE(p.dados_calculo ->> 'proposta_escolhida_percentual', ',', '.')::NUMERIC ELSE NULL END,
  CASE WHEN COALESCE(p.dados_calculo ->> 'proposta_advogado_percentual', '') ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
    THEN REPLACE(p.dados_calculo ->> 'proposta_advogado_percentual', ',', '.')::NUMERIC ELSE NULL END,
  COALESCE(p.proposta_aceita, FALSE),
  p.data_aceite_proposta,
  p.proposta_aceita_id,
  p.fechamento_valor_compra,
  p.fechamento_comissao_operador,
  p.fechamento_comissao_apax,
  p.fechamento_escritura,
  p.fechamento_procuracao,
  p.fechamento_funrejus,
  p.fechamento_certidoes,
  p.fechamento_certidao_central,
  p.fechamento_autenticacao,
  CASE WHEN p.fechamento_data IS NULL THEN NULL ELSE (p.fechamento_data AT TIME ZONE 'UTC')::DATE END,
  COALESCE(p.fechamento_status, 'rascunho'),
  p.criado_por,
  auth.uid()
FROM public.precatorios p
ON CONFLICT (precatorio_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.delete_fechamento_auto_transactions(
  p_precatorio_id UUID,
  p_tracked_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  WITH deleted_rows AS (
    DELETE FROM public.financial_transactions ft
    WHERE ft.precatorio_id = p_precatorio_id
      AND (
        ft.id = ANY(COALESCE(p_tracked_ids, '{}'::UUID[]))
        OR COALESCE(ft.notes, '') LIKE 'fechamento_auto:%'
        OR COALESCE(ft.notes, '') ILIKE 'Gerado automaticamente pelo fechamento%'
        OR ft.description ILIKE 'Compra de Prec% - %'
        OR ft.description ILIKE 'Comiss% Operador - %'
        OR ft.description ILIKE 'Receita/% Apax - %'
        OR ft.description ILIKE 'Custa:%'
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted_rows;

  RETURN COALESCE(v_deleted_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.salvar_fechamento_precatorio(
  p_precatorio_id UUID,
  p_valor_compra NUMERIC,
  p_comissao_operador NUMERIC,
  p_comissao_apax NUMERIC,
  p_escritura NUMERIC,
  p_procuracao NUMERIC,
  p_funrejus NUMERIC,
  p_certidoes NUMERIC,
  p_certidao_central NUMERIC,
  p_autenticacao NUMERIC,
  p_data_pagamento DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_roles TEXT[];
  v_can_manage BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(u.role, ARRAY[]::TEXT[])
  INTO v_roles
  FROM public.usuarios u
  WHERE u.id = v_user_id;

  v_can_manage := public.user_is_admin_like(v_user_id) OR ('financeiro' = ANY(COALESCE(v_roles, ARRAY[]::TEXT[])));

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Acesso negado: apenas Admin ou Financeiro podem salvar o fechamento.' USING ERRCODE = 'P0001';
  END IF;

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
    fechamento_status = 'rascunho',
    updated_at = NOW()
  WHERE id = p_precatorio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'precatorio_nao_encontrado' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'status', 'rascunho');
END;
$$;

CREATE OR REPLACE FUNCTION public.finalizar_fechamento_precatorio(
  p_precatorio_id UUID,
  p_valor_compra NUMERIC,
  p_comissao_operador NUMERIC,
  p_comissao_apax NUMERIC,
  p_escritura NUMERIC,
  p_procuracao NUMERIC,
  p_funrejus NUMERIC,
  p_certidoes NUMERIC,
  p_certidao_central NUMERIC,
  p_autenticacao NUMERIC,
  p_data_pagamento DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_precatorio public.precatorios%ROWTYPE;
  v_store public.precatorio_proposta_fechamento%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_roles TEXT[];
  v_can_manage BOOLEAN := FALSE;
  v_tx_id UUID;
  v_tx_ids UUID[] := '{}'::UUID[];
  v_deleted_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(u.role, ARRAY[]::TEXT[])
  INTO v_roles
  FROM public.usuarios u
  WHERE u.id = v_user_id;

  v_can_manage := public.user_is_admin_like(v_user_id) OR ('financeiro' = ANY(COALESCE(v_roles, ARRAY[]::TEXT[])));

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Acesso negado: apenas Admin ou Financeiro podem finalizar o fechamento.' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_precatorio
  FROM public.precatorios
  WHERE id = p_precatorio_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'precatorio_nao_encontrado' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_store
  FROM public.precatorio_proposta_fechamento
  WHERE precatorio_id = p_precatorio_id
  FOR UPDATE;

  v_deleted_count := public.delete_fechamento_auto_transactions(
    p_precatorio_id,
    COALESCE(v_store.financeiro_transacoes_ids, '{}'::UUID[])
  );

  INSERT INTO public.financial_transactions (
    description, amount, type, category, status, due_date, payment_date, precatorio_id, notes, created_by
  )
  VALUES (
    'Compra de Precatorio - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
    COALESCE(p_valor_compra, 0), 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento,
    p_precatorio_id, 'fechamento_auto:' || p_precatorio_id::TEXT || ':compra', v_user_id
  )
  RETURNING id INTO v_tx_id;
  v_tx_ids := array_append(v_tx_ids, v_tx_id);

  IF COALESCE(p_comissao_operador, 0) > 0 THEN
    INSERT INTO public.financial_transactions (
      description, amount, type, category, status, due_date, payment_date, precatorio_id, user_id, department, notes, created_by
    )
    VALUES (
      'Comissao Operador - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
      p_comissao_operador, 'expense', 'pessoal', 'pendente', p_data_pagamento, NULL, p_precatorio_id,
      v_precatorio.responsavel, 'vendas', 'fechamento_auto:' || p_precatorio_id::TEXT || ':comissao_operador', v_user_id
    )
    RETURNING id INTO v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
  END IF;

  IF COALESCE(p_comissao_apax, 0) > 0 THEN
    INSERT INTO public.financial_transactions (
      description, amount, type, category, status, due_date, payment_date, precatorio_id, department, notes, created_by
    )
    VALUES (
      'Receita/Comissao Apax - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
      p_comissao_apax, 'income', 'vendas', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id,
      'adm', 'fechamento_auto:' || p_precatorio_id::TEXT || ':comissao_apax', v_user_id
    )
    RETURNING id INTO v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
  END IF;

  IF COALESCE(p_escritura, 0) > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, notes, created_by)
    VALUES (
      'Custa: Escritura Publica - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
      p_escritura, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id,
      'fechamento_auto:' || p_precatorio_id::TEXT || ':escritura', v_user_id
    )
    RETURNING id INTO v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
  END IF;

  IF COALESCE(p_procuracao, 0) > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, notes, created_by)
    VALUES (
      'Custa: Procuracao - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
      p_procuracao, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id,
      'fechamento_auto:' || p_precatorio_id::TEXT || ':procuracao', v_user_id
    )
    RETURNING id INTO v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
  END IF;

  IF COALESCE(p_funrejus, 0) > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, notes, created_by)
    VALUES (
      'Custa: Funrejus - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
      p_funrejus, 'expense', 'impostos', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id,
      'fechamento_auto:' || p_precatorio_id::TEXT || ':funrejus', v_user_id
    )
    RETURNING id INTO v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
  END IF;

  IF COALESCE(p_certidoes, 0) > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, notes, created_by)
    VALUES (
      'Custa: Certidoes Simples - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
      p_certidoes, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id,
      'fechamento_auto:' || p_precatorio_id::TEXT || ':certidoes', v_user_id
    )
    RETURNING id INTO v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
  END IF;

  IF COALESCE(p_certidao_central, 0) > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, notes, created_by)
    VALUES (
      'Custa: Certidao Central - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
      p_certidao_central, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id,
      'fechamento_auto:' || p_precatorio_id::TEXT || ':certidao_central', v_user_id
    )
    RETURNING id INTO v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
  END IF;

  IF COALESCE(p_autenticacao, 0) > 0 THEN
    INSERT INTO public.financial_transactions (description, amount, type, category, status, due_date, payment_date, precatorio_id, notes, created_by)
    VALUES (
      'Custa: Autenticacao - ' || COALESCE(v_precatorio.numero_precatorio, p_precatorio_id::TEXT),
      p_autenticacao, 'expense', 'operacional', 'pago', p_data_pagamento, p_data_pagamento, p_precatorio_id,
      'fechamento_auto:' || p_precatorio_id::TEXT || ':autenticacao', v_user_id
    )
    RETURNING id INTO v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
  END IF;

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

  UPDATE public.precatorio_proposta_fechamento
  SET
    fechamento_data_pagamento = p_data_pagamento,
    fechamento_status = 'finalizado',
    financeiro_transacoes_ids = COALESCE(v_tx_ids, '{}'::UUID[]),
    updated_by = v_user_id,
    updated_at = NOW()
  WHERE precatorio_id = p_precatorio_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'finalizado',
    'transacoes_geradas', COALESCE(array_length(v_tx_ids, 1), 0),
    'transacoes_removidas', COALESCE(v_deleted_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.limpar_fechamento_precatorio(
  p_precatorio_id UUID,
  p_apagar_lancamentos BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_store public.precatorio_proposta_fechamento%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_roles TEXT[];
  v_can_manage BOOLEAN := FALSE;
  v_deleted_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(u.role, ARRAY[]::TEXT[])
  INTO v_roles
  FROM public.usuarios u
  WHERE u.id = v_user_id;

  v_can_manage := public.user_is_admin_like(v_user_id) OR ('financeiro' = ANY(COALESCE(v_roles, ARRAY[]::TEXT[])));

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Acesso negado: apenas Admin ou Financeiro podem limpar o fechamento.' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_store
  FROM public.precatorio_proposta_fechamento
  WHERE precatorio_id = p_precatorio_id
  FOR UPDATE;

  IF COALESCE(p_apagar_lancamentos, TRUE) THEN
    v_deleted_count := public.delete_fechamento_auto_transactions(
      p_precatorio_id,
      COALESCE(v_store.financeiro_transacoes_ids, '{}'::UUID[])
    );
  END IF;

  UPDATE public.precatorios
  SET
    fechamento_valor_compra = NULL,
    fechamento_comissao_operador = NULL,
    fechamento_comissao_apax = NULL,
    fechamento_escritura = NULL,
    fechamento_procuracao = NULL,
    fechamento_funrejus = NULL,
    fechamento_certidoes = NULL,
    fechamento_certidao_central = NULL,
    fechamento_autenticacao = NULL,
    fechamento_data = NULL,
    fechamento_status = 'rascunho',
    updated_at = NOW()
  WHERE id = p_precatorio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'precatorio_nao_encontrado' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.precatorio_proposta_fechamento
  SET
    fechamento_valor_compra = NULL,
    fechamento_comissao_operador = NULL,
    fechamento_comissao_apax = NULL,
    fechamento_escritura = NULL,
    fechamento_procuracao = NULL,
    fechamento_funrejus = NULL,
    fechamento_certidoes = NULL,
    fechamento_certidao_central = NULL,
    fechamento_autenticacao = NULL,
    fechamento_data_pagamento = NULL,
    fechamento_status = 'rascunho',
    financeiro_transacoes_ids = '{}'::UUID[],
    updated_by = v_user_id,
    updated_at = NOW()
  WHERE precatorio_id = p_precatorio_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'rascunho',
    'transacoes_removidas', COALESCE(v_deleted_count, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_fechamento_auto_transactions(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_fechamento_precatorio(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_fechamento_precatorio(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.limpar_fechamento_precatorio(UUID, BOOLEAN) TO authenticated;

COMMIT;
