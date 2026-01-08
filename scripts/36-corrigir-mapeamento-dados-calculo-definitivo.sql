-- =========================================================
-- CORREÇÃO DEFINITIVA: Mapear dados_calculo JSON -> colunas do banco
-- SEM alterar a lógica da calculadora
-- =========================================================

BEGIN;

-- 1) Garantir que todas as colunas existem
ALTER TABLE public.precatorios
  ADD COLUMN IF NOT EXISTS pss_oficio_valor NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS honorarios_valor NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adiantamento_valor NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposta_menor_percentual NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposta_maior_percentual NUMERIC(5,2) DEFAULT 0;

-- 2) Função helper: extrair número do JSON de forma segura
CREATE OR REPLACE FUNCTION public.jsonb_to_numeric(j jsonb, VARIADIC paths text[][])
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  path_arr text[];
  val text;
BEGIN
  -- Tenta cada caminho até encontrar um valor
  FOREACH path_arr SLICE 1 IN ARRAY paths
  LOOP
    val := j #>> path_arr;
    IF val IS NOT NULL AND val <> '' THEN
      BEGIN
        RETURN val::numeric;
      EXCEPTION WHEN others THEN
        CONTINUE;
      END;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- 3) TRIGGER PRINCIPAL: sincroniza dados_calculo -> colunas
CREATE OR REPLACE FUNCTION public.sync_precatorio_dados_calculo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  -- PSS
  pss_oficio numeric;
  pss_isento boolean;
  juros_mora_pct numeric;
  pss_calculado numeric;
  
  -- Valores principais
  val_principal numeric;
  val_juros numeric;
  val_selic numeric;
  val_atualizado numeric;
  val_liquido numeric;
  
  -- Descontos
  irpf_total numeric;
  honorarios_total numeric;
  adiantamento_total numeric;
  
  -- Propostas
  prop_menor numeric;
  prop_maior numeric;
  prop_menor_pct numeric;
  prop_maior_pct numeric;
BEGIN
  -- Se não tem dados_calculo, não faz nada
  IF NEW.dados_calculo IS NULL OR NEW.dados_calculo = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  RAISE NOTICE '[TRIGGER] Sincronizando dados_calculo para colunas...';

  -- ========== PSS ==========
  -- Pegar PSS do ofício (vários caminhos possíveis)
  pss_oficio := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['pss','pss_oficio_valor'],
    ARRAY['pss_oficio_valor'],
    ARRAY['pss','pssOficioValor']
  );
  
  -- Verificar se é isento
  pss_isento := COALESCE(
    (NEW.dados_calculo #>> ARRAY['pss','isento_pss'])::boolean,
    (NEW.dados_calculo #>> ARRAY['pss','isenção_pss'])::boolean,
    false
  );
  
  -- Pegar juros de mora percentual
  juros_mora_pct := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['pss','juros_mora_percentual'],
    ARRAY['juros_mora_percentual'],
    ARRAY['atualizacao','taxa_juros_moratorios']
  );
  
  -- Calcular PSS atualizado: pss_oficio * (1 + juros_mora_pct)
  IF pss_isento THEN
    pss_calculado := 0;
  ELSE
    pss_calculado := COALESCE(pss_oficio, 0) * (1 + COALESCE(juros_mora_pct, 0));
  END IF;

  -- ========== VALORES PRINCIPAIS ==========
  val_principal := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['dadosBasicos','valorPrincipal'],
    ARRAY['valor_principal']
  );
  
  val_juros := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['atualizacao','valorJuros'],
    ARRAY['valor_juros']
  );
  
  val_selic := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['atualizacao','valorSelic'],
    ARRAY['valor_selic']
  );
  
  val_atualizado := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['atualizacao','valorAtualizado'],
    ARRAY['propostas','valor_atualizado'],
    ARRAY['valor_atualizado']
  );
  
  val_liquido := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['resumoFinal','valorLiquidoCredor'],
    ARRAY['propostas','valor_liquido_credor'],
    ARRAY['propostas','base_calculo_liquida'],
    ARRAY['saldo_liquido']
  );

  -- ========== DESCONTOS ==========
  irpf_total := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['irpf','irTotal'],
    ARRAY['propostas','valor_irpf'],
    ARRAY['irpf_valor']
  );
  
  honorarios_total := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['honorarios','honorariosTotal'],
    ARRAY['honorarios_valor']
  );
  
  adiantamento_total := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['honorarios','adiantamentoValor'],
    ARRAY['adiantamento_valor']
  );

  -- ========== PROPOSTAS ==========
  -- A calculadora salva como "menor_proposta" e "maior_proposta"
  prop_menor := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['propostas','menor_proposta'],
    ARRAY['propostas','menorProposta']
  );
  
  prop_maior := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['propostas','maior_proposta'],
    ARRAY['propostas','maiorProposta']
  );
  
  prop_menor_pct := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['propostas','menor_proposta_percentual'],
    ARRAY['propostas','menorPropostaPercentual']
  );
  
  prop_maior_pct := public.jsonb_to_numeric(
    NEW.dados_calculo,
    ARRAY['propostas','maior_proposta_percentual'],
    ARRAY['propostas','maiorPropostaPercentual']
  );

  -- ========== ATUALIZAR COLUNAS ==========
  RAISE NOTICE '[TRIGGER] PSS: oficio=%, calculado=%', pss_oficio, pss_calculado;
  RAISE NOTICE '[TRIGGER] Propostas: menor=%, maior=%', prop_menor, prop_maior;
  RAISE NOTICE '[TRIGGER] IRPF=%, Honorários=%, Adiantamento=%', irpf_total, honorarios_total, adiantamento_total;

  -- PSS
  IF pss_oficio IS NOT NULL THEN
    NEW.pss_oficio_valor := pss_oficio;
  END IF;
  IF pss_calculado IS NOT NULL THEN
    NEW.pss_valor := pss_calculado;
  END IF;

  -- Valores principais
  IF val_principal IS NOT NULL THEN
    NEW.valor_principal := val_principal;
  END IF;
  IF val_juros IS NOT NULL THEN
    NEW.valor_juros := val_juros;
  END IF;
  IF val_selic IS NOT NULL THEN
    NEW.valor_selic := val_selic;
  END IF;
  IF val_atualizado IS NOT NULL THEN
    NEW.valor_atualizado := val_atualizado;
  END IF;
  IF val_liquido IS NOT NULL THEN
    NEW.saldo_liquido := val_liquido;
  END IF;

  -- Descontos
  IF irpf_total IS NOT NULL THEN
    NEW.irpf_valor := irpf_total;
  END IF;
  IF honorarios_total IS NOT NULL THEN
    NEW.honorarios_valor := honorarios_total;
  END IF;
  IF adiantamento_total IS NOT NULL THEN
    NEW.adiantamento_valor := adiantamento_total;
  END IF;

  -- Propostas (mapeamento correto!)
  IF prop_menor IS NOT NULL THEN
    NEW.proposta_menor_valor := prop_menor;
  END IF;
  IF prop_maior IS NOT NULL THEN
    NEW.proposta_maior_valor := prop_maior;
  END IF;
  IF prop_menor_pct IS NOT NULL THEN
    NEW.proposta_menor_percentual := prop_menor_pct;
  END IF;
  IF prop_maior_pct IS NOT NULL THEN
    NEW.proposta_maior_percentual := prop_maior_pct;
  END IF;

  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trg_sync_precatorio_from_dados_calculo ON public.precatorios;
DROP TRIGGER IF EXISTS trg_sync_precatorio_dados_calculo ON public.precatorios;

-- Cria novo trigger
CREATE TRIGGER trg_sync_precatorio_dados_calculo
BEFORE INSERT OR UPDATE OF dados_calculo ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.sync_precatorio_dados_calculo();

-- 4) BACKFILL: aplicar em todos os precatórios existentes
DO $$
BEGIN
  RAISE NOTICE '[BACKFILL] Atualizando precatórios existentes...';

  UPDATE public.precatorios
  SET dados_calculo = dados_calculo -- Força trigger
  WHERE deleted_at IS NULL
    AND dados_calculo IS NOT NULL
    AND dados_calculo <> '{}'::jsonb;

  RAISE NOTICE '[BACKFILL] Concluído!';
END $$;

COMMIT;

-- =========================================================
-- FIM - Agora os valores devem aparecer corretamente nos cards!
-- =========================================================
