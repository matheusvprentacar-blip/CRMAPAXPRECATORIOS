BEGIN;

-- =========================================================
-- RESET - Limpar tudo relacionado
-- =========================================================
DROP TRIGGER IF EXISTS trg_sync_precatorio_dados_calculo ON public.precatorios;
DROP TRIGGER IF EXISTS trg_sync_precatorio_from_dados_calculo ON public.precatorios;
DROP TRIGGER IF EXISTS trigger_sync_dados_calculo ON public.precatorios;

DROP FUNCTION IF EXISTS public.sync_precatorio_dados_calculo() CASCADE;
DROP FUNCTION IF EXISTS public.sync_precatorio_from_dados_calculo() CASCADE;

-- Drop de TODAS as variações de assinatura possíveis
DROP FUNCTION IF EXISTS public.jsonb_to_numeric(jsonb, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.jsonb_to_numeric(jsonb, text[], text[], text[], text[]) CASCADE;
DROP FUNCTION IF EXISTS public.jsonb_to_numeric(jsonb, text[][]) CASCADE;

DROP FUNCTION IF EXISTS public.jsonb_get_numeric(jsonb, text[]) CASCADE;

DROP FUNCTION IF EXISTS public.jsonb_to_boolean(jsonb, text[], text[], boolean) CASCADE;

-- =========================================================
-- Colunas (garantir que existam)
-- =========================================================
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS pss_oficio_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS pss_valor numeric(15,2) DEFAULT 0;

ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS valor_principal numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS valor_juros numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS valor_selic numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS valor_atualizado numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS saldo_liquido numeric(15,2) DEFAULT 0;

ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS irpf_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS honorarios_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS adiantamento_valor numeric(15,2) DEFAULT 0;

ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS proposta_menor_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS proposta_maior_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS proposta_menor_percentual numeric(5,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS proposta_maior_percentual numeric(5,2) DEFAULT 0;

ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS data_base date;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS data_expedicao date;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS data_calculo date;

-- =========================================================
-- Helper NUMERIC (SEM array 2D)
-- =========================================================
CREATE OR REPLACE FUNCTION public.jsonb_to_numeric(
  j  jsonb,
  p1 text[] DEFAULT NULL,
  p2 text[] DEFAULT NULL,
  p3 text[] DEFAULT NULL,
  p4 text[] DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  val text;
BEGIN
  IF j IS NULL THEN
    RETURN NULL;
  END IF;

  IF p1 IS NOT NULL THEN
    val := j #>> p1;
    IF val IS NOT NULL AND btrim(val) <> '' THEN
      BEGIN RETURN val::numeric; EXCEPTION WHEN others THEN END;
    END IF;
  END IF;

  IF p2 IS NOT NULL THEN
    val := j #>> p2;
    IF val IS NOT NULL AND btrim(val) <> '' THEN
      BEGIN RETURN val::numeric; EXCEPTION WHEN others THEN END;
    END IF;
  END IF;

  IF p3 IS NOT NULL THEN
    val := j #>> p3;
    IF val IS NOT NULL AND btrim(val) <> '' THEN
      BEGIN RETURN val::numeric; EXCEPTION WHEN others THEN END;
    END IF;
  END IF;

  IF p4 IS NOT NULL THEN
    val := j #>> p4;
    IF val IS NOT NULL AND btrim(val) <> '' THEN
      BEGIN RETURN val::numeric; EXCEPTION WHEN others THEN END;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- =========================================================
-- Helper BOOLEAN (SEM array 2D)
-- =========================================================
CREATE OR REPLACE FUNCTION public.jsonb_to_boolean(
  j jsonb,
  p1 text[] DEFAULT NULL,
  p2 text[] DEFAULT NULL,
  default_val boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  val text;
BEGIN
  IF j IS NULL THEN
    RETURN default_val;
  END IF;

  IF p1 IS NOT NULL THEN
    val := lower(trim(j #>> p1));
    IF val IN ('true','t','1','sim','yes') THEN RETURN true; END IF;
    IF val IN ('false','f','0','nao','não','no') THEN RETURN false; END IF;
  END IF;

  IF p2 IS NOT NULL THEN
    val := lower(trim(j #>> p2));
    IF val IN ('true','t','1','sim','yes') THEN RETURN true; END IF;
    IF val IN ('false','f','0','nao','não','no') THEN RETURN false; END IF;
  END IF;

  RETURN default_val;
END;
$$;

-- =========================================================
-- Trigger Function (JSON -> colunas, sem travar no DEFAULT 0)
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_precatorio_dados_calculo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v numeric;

  v_pss_oficio numeric;
  v_juros_mora_pct numeric;
  v_pss_isento boolean;
  v_pss_tem_desconto boolean;
BEGIN
  IF NEW.dados_calculo IS NULL OR NEW.dados_calculo = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- ===== VALORES PRINCIPAIS =====
  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['valor_principal'],
        ARRAY['atualizacao','valor_principal'],
        ARRAY['dados_iniciais','valor_principal'],
        ARRAY['dadosBasicos','valorPrincipal']
      );
  IF v IS NOT NULL THEN NEW.valor_principal := v; END IF;

  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['valor_juros'],
        ARRAY['atualizacao','juros_calculados'],
        ARRAY['atualizacao','valor_juros'],
        ARRAY['atualizacao','valorJuros']
      );
  IF v IS NOT NULL THEN NEW.valor_juros := v; END IF;

  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['valor_selic'],
        ARRAY['atualizacao','selic_calculada'],
        ARRAY['atualizacao','valor_selic'],
        ARRAY['atualizacao','valorSelic']
      );
  IF v IS NOT NULL THEN NEW.valor_selic := v; END IF;

  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['propostas','valor_atualizado'],
        ARRAY['atualizacao','valor_atualizado'],
        ARRAY['atualizacao','valor_corrigido_monetariamente'],
        ARRAY['valor_atualizado']
      );
  IF v IS NOT NULL THEN NEW.valor_atualizado := v; END IF;

  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['propostas','valor_liquido_credor'],
        ARRAY['propostas','base_calculo_liquida'],
        ARRAY['propostas','saldo_liquido'],
        ARRAY['saldo_liquido']
      );
  IF v IS NOT NULL THEN NEW.saldo_liquido := v; END IF;

  -- ===== PSS =====
  v_pss_oficio := public.jsonb_to_numeric(NEW.dados_calculo,
                   ARRAY['pss','pss_oficio_valor'],
                   ARRAY['pss_oficio_valor']
                 );
  IF v_pss_oficio IS NOT NULL THEN
    NEW.pss_oficio_valor := v_pss_oficio;
  ELSE
    v_pss_oficio := NEW.pss_oficio_valor;
  END IF;

  v_juros_mora_pct := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['juros_mora_percentual'],
      ARRAY['pss','juros_mora_percentual'],
      ARRAY['atualizacao','taxa_juros_moratorios']
    ),
    0
  );

  IF v_juros_mora_pct > 1 THEN
    v_juros_mora_pct := v_juros_mora_pct / 100;
  END IF;

  v_pss_isento := public.jsonb_to_boolean(NEW.dados_calculo,
    ARRAY['pss','isento_pss'],
    ARRAY['isento_pss'],
    false
  );

  v_pss_tem_desconto := public.jsonb_to_boolean(NEW.dados_calculo,
    ARRAY['pss','tem_desconto_pss'],
    ARRAY['tem_desconto_pss'],
    true
  );

  IF v_pss_isento OR (NOT v_pss_tem_desconto) THEN
    NEW.pss_valor := 0;
  ELSE
    NEW.pss_valor := COALESCE(v_pss_oficio, 0) * (1 + COALESCE(v_juros_mora_pct, 0));
  END IF;

  -- ===== IRPF =====
  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['propostas','valor_irpf'],
        ARRAY['irpf','valor_irpf'],
        ARRAY['irpf_valor']
      );
  IF v IS NOT NULL THEN NEW.irpf_valor := v; END IF;

  -- ===== HONORÁRIOS / ADIANTAMENTO =====
  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['propostas','honorarios'],
        ARRAY['honorarios_valor'],
        ARRAY['honorarios']
      );
  IF v IS NOT NULL THEN NEW.honorarios_valor := v; END IF;

  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['adiantamento_recebido'],
        ARRAY['propostas','adiantamento'],
        ARRAY['adiantamento_valor']
      );
  IF v IS NOT NULL THEN NEW.adiantamento_valor := v; END IF;

  -- ===== PROPOSTAS =====
  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['propostas','menor_proposta'],
        ARRAY['propostas','menorProposta'],
        ARRAY['propostas','proposta_menor'],
        ARRAY['proposta_menor_valor']
      );
  IF v IS NOT NULL THEN NEW.proposta_menor_valor := v; END IF;

  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['propostas','percentual_menor'],
        ARRAY['propostas','percentualMenor'],
        ARRAY['proposta_menor_percentual']
      );
  IF v IS NOT NULL THEN
    IF v > 1 THEN v := v/100; END IF;
    NEW.proposta_menor_percentual := v;
  END IF;

  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['propostas','maior_proposta'],
        ARRAY['propostas','maiorProposta'],
        ARRAY['propostas','proposta_maior'],
        ARRAY['proposta_maior_valor']
      );
  IF v IS NOT NULL THEN NEW.proposta_maior_valor := v; END IF;

  v := public.jsonb_to_numeric(NEW.dados_calculo,
        ARRAY['propostas','percentual_maior'],
        ARRAY['propostas','percentualMaior'],
        ARRAY['proposta_maior_percentual']
      );
  IF v IS NOT NULL THEN
    IF v > 1 THEN v := v/100; END IF;
    NEW.proposta_maior_percentual := v;
  END IF;

  -- ===== DATAS =====
  IF NEW.dados_calculo #>> ARRAY['data_base'] IS NOT NULL THEN
    BEGIN NEW.data_base := (NEW.dados_calculo #>> ARRAY['data_base'])::date; EXCEPTION WHEN others THEN END;
  END IF;

  IF NEW.dados_calculo #>> ARRAY['data_expedicao'] IS NOT NULL THEN
    BEGIN NEW.data_expedicao := (NEW.dados_calculo #>> ARRAY['data_expedicao'])::date; EXCEPTION WHEN others THEN END;
  END IF;

  IF NEW.dados_calculo #>> ARRAY['data_calculo'] IS NOT NULL THEN
    BEGIN NEW.data_calculo := (NEW.dados_calculo #>> ARRAY['data_calculo'])::date; EXCEPTION WHEN others THEN END;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER trg_sync_precatorio_dados_calculo
BEFORE INSERT OR UPDATE OF dados_calculo ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.sync_precatorio_dados_calculo();

-- Backfill
UPDATE public.precatorios
SET dados_calculo = dados_calculo
WHERE deleted_at IS NULL
  AND dados_calculo IS NOT NULL
  AND dados_calculo <> '{}'::jsonb;

COMMIT;

-- =========================================================
-- QUERY DE TESTE (executar separadamente após o script)
-- =========================================================
/*
SELECT
  id,
  titulo,
  valor_principal,
  valor_atualizado,
  saldo_liquido,
  pss_valor,
  irpf_valor,
  proposta_menor_valor,
  proposta_maior_valor,
  proposta_menor_percentual,
  proposta_maior_percentual,
  data_base,
  data_expedicao,
  data_calculo
FROM public.precatorios
WHERE dados_calculo IS NOT NULL
  AND dados_calculo <> '{}'::jsonb
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 3;
*/
