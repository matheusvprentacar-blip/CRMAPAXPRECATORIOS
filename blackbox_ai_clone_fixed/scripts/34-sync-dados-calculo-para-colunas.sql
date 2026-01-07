-- =========================================================
-- FIX DEFINITIVO: sincronizar dados_calculo -> colunas do card
-- =========================================================

-- 1) Garantir colunas que o card usa
ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS pss_oficio_valor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- 2) Função helper: pegar número do jsonb com fallback
CREATE OR REPLACE FUNCTION public.jsonb_get_numeric(j jsonb, path text[])
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE v text;
BEGIN
  v := j #>> path;
  IF v IS NULL OR v = '' THEN
    RETURN NULL;
  END IF;
  RETURN v::numeric;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- 3) TRIGGER: ao atualizar dados_calculo, recalcular colunas principais
CREATE OR REPLACE FUNCTION public.sync_precatorio_from_dados_calculo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  juros_mora_percentual numeric;
  pss_oficio numeric;
  pss_isento boolean;
  pss_tem_desconto boolean;

  valor_atualizado_calc numeric;
  saldo_liquido_calc numeric;
  irpf_calc numeric;
  proposta_menor_calc numeric;
  proposta_maior_calc numeric;

  pss_atualizado numeric;
BEGIN
  -- Se não mexeu em dados_calculo, não faz nada
  IF NEW.dados_calculo IS NULL OR NEW.dados_calculo = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- --- Juros mora percentual (existe no seu JSON)
  juros_mora_percentual :=
    COALESCE(
      public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['juros_mora_percentual']),
      public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['pss','juros_mora_percentual']),
      0
    );

  -- --- PSS do ofício e flags
  pss_oficio := COALESCE(NEW.pss_oficio_valor, public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['pss','pss_oficio_valor']), 0);
  pss_isento := COALESCE((NEW.dados_calculo #>> ARRAY['pss','isento_pss'])::boolean, false);
  pss_tem_desconto := COALESCE((NEW.dados_calculo #>> ARRAY['pss','tem_desconto_pss'])::boolean, true);

  -- --- PSS atualizado (regra que você definiu):
  -- pss_atualizado = pss_oficio * (1 + juros_mora_percentual)
  IF pss_isento = true OR pss_tem_desconto = false THEN
    pss_atualizado := 0;
  ELSE
    pss_atualizado := COALESCE(pss_oficio,0) * (1 + COALESCE(juros_mora_percentual,0));
  END IF;

  -- --- Valores finais do cálculo (do seu JSON: dados_calculo.propostas.*)
  valor_atualizado_calc := COALESCE(
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['propostas','valor_atualizado']),
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['atualizacao','valor_corrigido_monetariamente'])
  );

  saldo_liquido_calc := COALESCE(
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['propostas','valor_liquido_credor']),
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['propostas','base_calculo_liquida'])
  );

  irpf_calc := COALESCE(
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['propostas','valor_irpf']),
    0
  );

  proposta_menor_calc := COALESCE(
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['propostas','menor_proposta']),
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['propostas','menorProposta'])
  );

  proposta_maior_calc := COALESCE(
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['propostas','maior_proposta']),
    public.jsonb_get_numeric(NEW.dados_calculo, ARRAY['propostas','maiorProposta'])
  );

  -- --- Escrever nas colunas que o card precisa (ESSENCIAL)
  NEW.pss_valor := COALESCE(pss_atualizado, 0);
  NEW.irpf_valor := COALESCE(irpf_calc, 0);

  -- Se tiver valor_atualizado calculado, preenche (senão mantém o existente)
  IF valor_atualizado_calc IS NOT NULL THEN
    NEW.valor_atualizado := valor_atualizado_calc;
  END IF;

  -- Saldo líquido do credor (base líquida)
  IF saldo_liquido_calc IS NOT NULL THEN
    NEW.saldo_liquido := saldo_liquido_calc;
  END IF;

  -- Propostas finais
  IF proposta_menor_calc IS NOT NULL THEN
    NEW.proposta_menor_valor := proposta_menor_calc;
  END IF;
  IF proposta_maior_calc IS NOT NULL THEN
    NEW.proposta_maior_valor := proposta_maior_calc;
  END IF;

  -- Se tem propostas calculadas, pode setar status calculado automaticamente (opcional)
  -- NEW.status := COALESCE(NEW.status, 'calculado');
  -- NEW.localizacao_kanban := COALESCE(NEW.localizacao_kanban, NEW.status);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_precatorio_from_dados_calculo ON public.precatorios;
CREATE TRIGGER trg_sync_precatorio_from_dados_calculo
BEFORE UPDATE OF dados_calculo ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.sync_precatorio_from_dados_calculo();

-- 4) Backfill: aplicar em precatórios já calculados (atualiza colunas a partir do JSON)
UPDATE public.precatorios
SET dados_calculo = dados_calculo
WHERE deleted_at IS NULL
  AND dados_calculo IS NOT NULL
  AND dados_calculo <> '{}'::jsonb;

-- =========================================================
-- FIM
-- =========================================================
