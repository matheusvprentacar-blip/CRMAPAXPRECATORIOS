-- =========================================================
-- RESET COMPLETO: Sincronização dados_calculo → colunas
-- =========================================================
-- Objetivo: Garantir que resultados da calculadora salvos em dados_calculo (JSONB)
-- sejam automaticamente mapeados para colunas normalizadas da tabela precatorios
-- 
-- IMPORTANTE: Executar este script do início ao fim no Supabase SQL Editor
-- =========================================================

BEGIN;

-- =========================================================
-- PARTE A: DIAGNÓSTICO (comentado - executar manualmente antes se necessário)
-- =========================================================
/*
-- 1) Estrutura atual da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='precatorios'
ORDER BY ordinal_position;

-- 2) Triggers existentes na tabela
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.precatorios'::regclass
AND NOT tgisinternal;

-- 3) Funções relacionadas (se existirem)
SELECT proname, oidvectortypes(proargtypes) AS args
FROM pg_proc
JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
WHERE n.nspname='public'
AND proname IN ('sync_precatorio_dados_calculo','jsonb_to_numeric','sync_precatorio_from_dados_calculo','jsonb_get_numeric');
*/

-- =========================================================
-- PARTE B: RESET - Limpar tudo relacionado
-- =========================================================

-- Drop triggers (todas as variações possíveis)
DROP TRIGGER IF EXISTS trg_sync_precatorio_dados_calculo ON public.precatorios;
DROP TRIGGER IF EXISTS trg_sync_precatorio_from_dados_calculo ON public.precatorios;
DROP TRIGGER IF EXISTS trigger_sync_dados_calculo ON public.precatorios;

-- Drop functions (todas as variações possíveis)
DROP FUNCTION IF EXISTS public.sync_precatorio_dados_calculo() CASCADE;
DROP FUNCTION IF EXISTS public.sync_precatorio_from_dados_calculo() CASCADE;
DROP FUNCTION IF EXISTS public.jsonb_to_numeric(jsonb, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.jsonb_get_numeric(jsonb, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.jsonb_to_numeric(jsonb, text[], text[], text[], text[]) CASCADE;

-- =========================================================
-- PARTE C: Padronização de colunas (garantir que existam)
-- =========================================================

-- Colunas de valores principais
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS pss_oficio_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS pss_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS valor_principal numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS valor_juros numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS valor_selic numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS valor_atualizado numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS saldo_liquido numeric(15,2) DEFAULT 0;

-- Colunas de descontos e honorários
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS irpf_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS honorarios_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS adiantamento_valor numeric(15,2) DEFAULT 0;

-- Colunas de propostas
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS proposta_menor_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS proposta_maior_valor numeric(15,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS proposta_menor_percentual numeric(5,2) DEFAULT 0;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS proposta_maior_percentual numeric(5,2) DEFAULT 0;

-- Colunas de datas
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS data_base date;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS data_expedicao date;
ALTER TABLE public.precatorios ADD COLUMN IF NOT EXISTS data_calculo date;

-- =========================================================
-- PARTE D: Helper function SEM ambiguidade
-- =========================================================

-- Helper 1: Extrair número de JSONB com múltiplos caminhos possíveis
CREATE OR REPLACE FUNCTION public.jsonb_to_numeric(
  j jsonb,
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
  paths text[][] := ARRAY[p1, p2, p3, p4];
  path text[];
BEGIN
  -- Se JSON é nulo, retorna NULL
  IF j IS NULL THEN
    RETURN NULL;
  END IF;

  -- Tentar cada path na ordem
  FOREACH path SLICE 1 IN ARRAY paths
  LOOP
    IF path IS NOT NULL THEN
      val := j #>> path;
      IF val IS NOT NULL AND val != '' THEN
        BEGIN
          RETURN val::numeric;
        EXCEPTION WHEN others THEN
          -- Se falhar conversão, continua tentando próximo path
          CONTINUE;
        END;
      END IF;
    END IF;
  END LOOP;

  -- Nenhum path funcionou
  RETURN NULL;
END;
$$;

-- Helper 2: Extrair boolean de JSONB com segurança
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
  paths text[][] := ARRAY[p1, p2];
  path text[];
BEGIN
  IF j IS NULL THEN
    RETURN default_val;
  END IF;

  FOREACH path SLICE 1 IN ARRAY paths
  LOOP
    IF path IS NOT NULL THEN
      val := LOWER(TRIM(j #>> path));
      IF val IN ('true', 't', '1', 'sim', 'yes') THEN
        RETURN true;
      ELSIF val IN ('false', 'f', '0', 'nao', 'não', 'no', '') THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;

  RETURN default_val;
END;
$$;

-- =========================================================
-- PARTE E: Trigger Function (mapeamento robusto)
-- =========================================================

CREATE OR REPLACE FUNCTION public.sync_precatorio_dados_calculo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  -- Variáveis temporárias para extração
  v_pss_oficio numeric;
  v_juros_mora_percentual numeric;
  v_pss_isento boolean;
  v_pss_tem_desconto boolean;
  v_pss_atualizado numeric;
BEGIN
  -- Se dados_calculo for NULL ou vazio, não faz nada
  IF NEW.dados_calculo IS NULL OR NEW.dados_calculo = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- ====================================
  -- 1) VALORES PRINCIPAIS
  -- ====================================
  
  -- valor_principal (pode vir de várias fontes)
  NEW.valor_principal := COALESCE(
    NEW.valor_principal,
    public.jsonb_to_numeric(NEW.dados_calculo, 
      ARRAY['valor_principal'],
      ARRAY['atualizacao','valor_principal'],
      ARRAY['dados_iniciais','valor_principal']
    )
  );

  -- valor_juros
  NEW.valor_juros := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['valor_juros'],
      ARRAY['atualizacao','juros_calculados'],
      ARRAY['atualizacao','valor_juros']
    ),
    NEW.valor_juros
  );

  -- valor_selic
  NEW.valor_selic := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['valor_selic'],
      ARRAY['atualizacao','selic_calculada'],
      ARRAY['atualizacao','valor_selic']
    ),
    NEW.valor_selic
  );

  -- valor_atualizado (valor principal + juros + selic)
  NEW.valor_atualizado := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['propostas','valor_atualizado'],
      ARRAY['atualizacao','valor_atualizado'],
      ARRAY['atualizacao','valor_corrigido_monetariamente'],
      ARRAY['valor_atualizado']
    ),
    NEW.valor_atualizado
  );

  -- saldo_liquido (valor após todos os descontos)
  NEW.saldo_liquido := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['propostas','valor_liquido_credor'],
      ARRAY['propostas','base_calculo_liquida'],
      ARRAY['propostas','saldo_liquido'],
      ARRAY['saldo_liquido']
    ),
    NEW.saldo_liquido
  );

  -- ====================================
  -- 2) PSS (com cálculo automático)
  -- ====================================
  
  -- PSS do ofício (valor informado pelo operador)
  v_pss_oficio := COALESCE(
    NEW.pss_oficio_valor,
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['pss','pss_oficio_valor'],
      ARRAY['pss_oficio_valor']
    )
  );

  -- Juros de mora percentual (para calcular PSS atualizado)
  v_juros_mora_percentual := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['juros_mora_percentual'],
      ARRAY['pss','juros_mora_percentual'],
      ARRAY['atualizacao','taxa_juros_moratorios']
    ),
    0
  );

  -- Verificar se é isento de PSS
  v_pss_isento := public.jsonb_to_boolean(NEW.dados_calculo,
    ARRAY['pss','isento_pss'],
    ARRAY['isento_pss'],
    false
  );

  -- Verificar se tem desconto PSS
  v_pss_tem_desconto := public.jsonb_to_boolean(NEW.dados_calculo,
    ARRAY['pss','tem_desconto_pss'],
    ARRAY['tem_desconto_pss'],
    true
  );

  -- Calcular PSS atualizado: pss_oficio * (1 + juros_mora_percentual)
  -- Normalizar percentual: se > 1, dividir por 100
  IF v_juros_mora_percentual > 1 THEN
    v_juros_mora_percentual := v_juros_mora_percentual / 100;
  END IF;

  IF v_pss_isento = true OR v_pss_tem_desconto = false THEN
    v_pss_atualizado := 0;
  ELSE
    v_pss_atualizado := COALESCE(v_pss_oficio, 0) * (1 + COALESCE(v_juros_mora_percentual, 0));
  END IF;

  -- Salvar valores de PSS
  NEW.pss_oficio_valor := COALESCE(v_pss_oficio, NEW.pss_oficio_valor);
  NEW.pss_valor := v_pss_atualizado;

  -- ====================================
  -- 3) IRPF
  -- ====================================
  
  NEW.irpf_valor := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['propostas','valor_irpf'],
      ARRAY['irpf','valor_irpf'],
      ARRAY['irpf_valor']
    ),
    NEW.irpf_valor
  );

  -- ====================================
  -- 4) HONORÁRIOS E ADIANTAMENTO
  -- ====================================
  
  NEW.honorarios_valor := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['propostas','honorarios'],
      ARRAY['honorarios_valor'],
      ARRAY['honorarios']
    ),
    NEW.honorarios_valor
  );

  NEW.adiantamento_valor := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['adiantamento_recebido'],
      ARRAY['propostas','adiantamento'],
      ARRAY['adiantamento_valor']
    ),
    NEW.adiantamento_valor
  );

  -- ====================================
  -- 5) PROPOSTAS (valor e percentual)
  -- ====================================
  
  -- Proposta menor
  NEW.proposta_menor_valor := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['propostas','menor_proposta'],
      ARRAY['propostas','menorProposta'],
      ARRAY['propostas','proposta_menor'],
      ARRAY['proposta_menor_valor']
    ),
    NEW.proposta_menor_valor
  );

  NEW.proposta_menor_percentual := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['propostas','percentual_menor'],
      ARRAY['propostas','percentualMenor'],
      ARRAY['proposta_menor_percentual']
    ),
    NEW.proposta_menor_percentual
  );

  -- Proposta maior
  NEW.proposta_maior_valor := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['propostas','maior_proposta'],
      ARRAY['propostas','maiorProposta'],
      ARRAY['propostas','proposta_maior'],
      ARRAY['proposta_maior_valor']
    ),
    NEW.proposta_maior_valor
  );

  NEW.proposta_maior_percentual := COALESCE(
    public.jsonb_to_numeric(NEW.dados_calculo,
      ARRAY['propostas','percentual_maior'],
      ARRAY['propostas','percentualMaior'],
      ARRAY['proposta_maior_percentual']
    ),
    NEW.proposta_maior_percentual
  );

  -- ====================================
  -- 6) DATAS
  -- ====================================
  
  -- data_base
  IF NEW.dados_calculo #>> ARRAY['data_base'] IS NOT NULL THEN
    BEGIN
      NEW.data_base := (NEW.dados_calculo #>> ARRAY['data_base'])::date;
    EXCEPTION WHEN others THEN
      -- Ignorar erro de conversão
    END;
  END IF;

  -- data_expedicao
  IF NEW.dados_calculo #>> ARRAY['data_expedicao'] IS NOT NULL THEN
    BEGIN
      NEW.data_expedicao := (NEW.dados_calculo #>> ARRAY['data_expedicao'])::date;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  -- data_calculo
  IF NEW.dados_calculo #>> ARRAY['data_calculo'] IS NOT NULL THEN
    BEGIN
      NEW.data_calculo := (NEW.dados_calculo #>> ARRAY['data_calculo'])::date;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================================
-- Criar o trigger
-- =========================================================

CREATE TRIGGER trg_sync_precatorio_dados_calculo
BEFORE INSERT OR UPDATE OF dados_calculo ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.sync_precatorio_dados_calculo();

-- =========================================================
-- PARTE F: Backfill + Teste
-- =========================================================

-- Backfill: forçar recálculo de todos os precatórios existentes
UPDATE public.precatorios
SET dados_calculo = dados_calculo
WHERE deleted_at IS NULL
  AND dados_calculo IS NOT NULL
  AND dados_calculo <> '{}'::jsonb;

COMMIT;

-- =========================================================
-- Query de teste (executar após COMMIT)
-- =========================================================
/*
SELECT 
  id,
  titulo,
  valor_principal,
  valor_atualizado,
  saldo_liquido,
  pss_oficio_valor,
  pss_valor,
  irpf_valor,
  honorarios_valor,
  adiantamento_valor,
  proposta_menor_valor,
  proposta_menor_percentual,
  proposta_maior_valor,
  proposta_maior_percentual,
  data_base,
  data_expedicao,
  data_calculo,
  status
FROM public.precatorios
WHERE deleted_at IS NULL
  AND dados_calculo IS NOT NULL
  AND dados_calculo <> '{}'::jsonb
ORDER BY updated_at DESC
LIMIT 3;
*/
