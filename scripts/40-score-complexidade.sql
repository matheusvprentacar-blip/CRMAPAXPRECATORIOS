-- ============================================
-- SCRIPT 40: SCORE DE COMPLEXIDADE
-- ============================================
-- Adiciona sistema de pontuação automática para
-- identificar a complexidade de cada precatório
-- ============================================

-- 1. Adicionar colunas de complexidade
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS score_complexidade INTEGER DEFAULT 0;

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS nivel_complexidade TEXT DEFAULT 'baixa';

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_precatorios_complexidade 
ON public.precatorios(nivel_complexidade, score_complexidade);

-- 3. Adicionar comentários
COMMENT ON COLUMN public.precatorios.score_complexidade IS 
'Pontuação calculada automaticamente baseada em critérios de complexidade (0-100+)';

COMMENT ON COLUMN public.precatorios.nivel_complexidade IS 
'Nível de complexidade: baixa (0-30), media (31-60), alta (61+)';

-- 4. Criar função para calcular score de complexidade
CREATE OR REPLACE FUNCTION public.calcular_score_complexidade(precatorio_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  prec RECORD;
BEGIN
  -- Buscar dados do precatório
  SELECT * INTO prec FROM public.precatorios WHERE id = precatorio_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- CRITÉRIO 1: Titular falecido (+30 pontos)
  IF prec.titular_falecido = true THEN 
    score := score + 30; 
  END IF;
  
  -- CRITÉRIO 2: Valor muito alto (+25 pontos)
  IF prec.valor_atualizado > 1000000 THEN 
    score := score + 25;
  -- CRITÉRIO 3: Valor alto (+15 pontos)
  ELSIF prec.valor_atualizado > 500000 THEN 
    score := score + 15;
  END IF;
  
  -- CRITÉRIO 4: Cessão de crédito (+20 pontos)
  IF prec.cessionario IS NOT NULL AND prec.cessionario != '' THEN 
    score := score + 20; 
  END IF;
  
  -- CRITÉRIO 5: Múltiplos descontos - PSS + IRPF (+15 pontos)
  IF prec.pss_valor > 0 AND prec.irpf_valor > 0 THEN 
    score := score + 15; 
  END IF;
  
  -- CRITÉRIO 6: Honorários altos (+10 pontos)
  IF prec.honorarios_percentual > 20 THEN 
    score := score + 10; 
  END IF;
  
  -- CRITÉRIO 7: Processo sem número (+10 pontos)
  IF prec.numero_processo IS NULL OR prec.numero_processo = '' THEN 
    score := score + 10; 
  END IF;
  
  -- CRITÉRIO 8: Sem data base (+10 pontos)
  IF prec.data_base IS NULL THEN 
    score := score + 10; 
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar função para determinar nível baseado no score
CREATE OR REPLACE FUNCTION public.determinar_nivel_complexidade(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF score <= 30 THEN 
    RETURN 'baixa';
  ELSIF score <= 60 THEN 
    RETURN 'media';
  ELSE 
    RETURN 'alta';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Criar trigger para atualizar score automaticamente
CREATE OR REPLACE FUNCTION public.trigger_atualizar_score_complexidade()
RETURNS TRIGGER AS $$
DECLARE
  novo_score INTEGER;
  novo_nivel TEXT;
BEGIN
  -- Calcular novo score
  novo_score := public.calcular_score_complexidade(NEW.id);
  
  -- Determinar nível
  novo_nivel := public.determinar_nivel_complexidade(novo_score);
  
  -- Atualizar campos
  NEW.score_complexidade := novo_score;
  NEW.nivel_complexidade := novo_nivel;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger (drop se existir)
DROP TRIGGER IF EXISTS trigger_score_complexidade ON public.precatorios;

CREATE TRIGGER trigger_score_complexidade
BEFORE INSERT OR UPDATE ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.trigger_atualizar_score_complexidade();

-- 8. Atualizar scores de todos os precatórios existentes
UPDATE public.precatorios
SET 
  score_complexidade = public.calcular_score_complexidade(id),
  nivel_complexidade = public.determinar_nivel_complexidade(public.calcular_score_complexidade(id));

-- 9. Conceder permissões
GRANT EXECUTE ON FUNCTION public.calcular_score_complexidade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.determinar_nivel_complexidade(INTEGER) TO authenticated;

-- ============================================
-- FIM DO SCRIPT 40
-- ============================================
-- Resultado esperado:
-- ✅ Coluna score_complexidade adicionada
-- ✅ Coluna nivel_complexidade adicionada
-- ✅ Função de cálculo criada
-- ✅ Trigger automático criado
-- ✅ Scores calculados para precatórios existentes
-- ============================================
