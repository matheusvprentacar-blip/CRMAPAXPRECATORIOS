-- ============================================
-- SCRIPT 41: SLA DE CÁLCULO
-- ============================================
-- Adiciona sistema de SLA (Service Level Agreement)
-- para medir e controlar o tempo de cálculo
-- ============================================

-- 1. Adicionar colunas de SLA
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS data_entrada_calculo TIMESTAMP;

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS sla_horas INTEGER DEFAULT 48;

ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'nao_iniciado';

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_precatorios_sla 
ON public.precatorios(sla_status, data_entrada_calculo);

CREATE INDEX IF NOT EXISTS idx_precatorios_data_entrada_calculo 
ON public.precatorios(data_entrada_calculo) 
WHERE data_entrada_calculo IS NOT NULL;

-- 3. Adicionar comentários
COMMENT ON COLUMN public.precatorios.data_entrada_calculo IS 
'Data/hora em que o precatório entrou na fila de cálculo (status = em_calculo)';

COMMENT ON COLUMN public.precatorios.sla_horas IS 
'SLA em horas: 24h (urgente), 48h (padrão), 72h (alta complexidade)';

COMMENT ON COLUMN public.precatorios.sla_status IS 
'Status do SLA: nao_iniciado, no_prazo, atencao, atrasado';

-- 4. Criar função para calcular status do SLA
CREATE OR REPLACE FUNCTION public.calcular_sla_status(precatorio_id UUID)
RETURNS TEXT AS $$
DECLARE
  prec RECORD;
  horas_decorridas NUMERIC;
  percentual_sla NUMERIC;
BEGIN
  -- Buscar dados do precatório
  SELECT * INTO prec FROM public.precatorios WHERE id = precatorio_id;
  
  IF NOT FOUND THEN
    RETURN 'nao_iniciado';
  END IF;
  
  -- Se não iniciou o cálculo
  IF prec.data_entrada_calculo IS NULL THEN
    RETURN 'nao_iniciado';
  END IF;
  
  -- Se já finalizou o cálculo (não está mais em_calculo)
  IF prec.status != 'em_calculo' THEN
    RETURN 'concluido';
  END IF;
  
  -- Calcular horas decorridas
  horas_decorridas := EXTRACT(EPOCH FROM (NOW() - prec.data_entrada_calculo)) / 3600;
  
  -- Calcular percentual do SLA
  percentual_sla := (horas_decorridas / prec.sla_horas) * 100;
  
  -- Determinar status
  IF percentual_sla < 80 THEN 
    RETURN 'no_prazo';
  ELSIF percentual_sla < 100 THEN 
    RETURN 'atencao';
  ELSE 
    RETURN 'atrasado';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar função para determinar SLA baseado em complexidade e urgência
CREATE OR REPLACE FUNCTION public.determinar_sla_horas(
  p_urgente BOOLEAN,
  p_nivel_complexidade TEXT
)
RETURNS INTEGER AS $$
BEGIN
  -- Urgente: 24 horas
  IF p_urgente = true THEN
    RETURN 24;
  END IF;
  
  -- Alta complexidade: 72 horas
  IF p_nivel_complexidade = 'alta' THEN
    RETURN 72;
  END IF;
  
  -- Padrão: 48 horas
  RETURN 48;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Criar trigger para gerenciar SLA
CREATE OR REPLACE FUNCTION public.trigger_gerenciar_sla()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando entra em cálculo pela primeira vez
  IF NEW.status = 'em_calculo' AND (OLD.status IS NULL OR OLD.status != 'em_calculo') THEN
    -- Registrar data de entrada
    NEW.data_entrada_calculo := NOW();
    
    -- Definir SLA baseado em urgência e complexidade
    NEW.sla_horas := public.determinar_sla_horas(NEW.urgente, NEW.nivel_complexidade);
  END IF;
  
  -- Atualizar status do SLA sempre que houver mudança
  IF NEW.data_entrada_calculo IS NOT NULL THEN
    NEW.sla_status := public.calcular_sla_status(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger (drop se existir)
DROP TRIGGER IF EXISTS trigger_sla_calculo ON public.precatorios;

CREATE TRIGGER trigger_sla_calculo
BEFORE INSERT OR UPDATE ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.trigger_gerenciar_sla();

-- 8. Atualizar SLA de precatórios que já estão em cálculo
UPDATE public.precatorios
SET 
  data_entrada_calculo = COALESCE(data_entrada_calculo, created_at),
  sla_horas = public.determinar_sla_horas(urgente, nivel_complexidade),
  sla_status = public.calcular_sla_status(id)
WHERE status = 'em_calculo' AND data_entrada_calculo IS NULL;

-- 9. Criar view para métricas de SLA
CREATE OR REPLACE VIEW public.metricas_sla AS
SELECT 
  COUNT(*) FILTER (WHERE sla_status = 'no_prazo') as no_prazo,
  COUNT(*) FILTER (WHERE sla_status = 'atencao') as atencao,
  COUNT(*) FILTER (WHERE sla_status = 'atrasado') as atrasado,
  COUNT(*) FILTER (WHERE sla_status = 'nao_iniciado') as nao_iniciado,
  COUNT(*) FILTER (WHERE sla_status = 'concluido') as concluido,
  AVG(
    CASE 
      WHEN data_entrada_calculo IS NOT NULL AND status != 'em_calculo'
      THEN EXTRACT(EPOCH FROM (updated_at - data_entrada_calculo)) / 3600
      ELSE NULL
    END
  ) as tempo_medio_calculo_horas,
  COUNT(*) FILTER (WHERE status = 'em_calculo') as total_em_calculo
FROM public.precatorios
WHERE deleted_at IS NULL;

-- 10. Conceder permissões
GRANT EXECUTE ON FUNCTION public.calcular_sla_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.determinar_sla_horas(BOOLEAN, TEXT) TO authenticated;
GRANT SELECT ON public.metricas_sla TO authenticated;

-- ============================================
-- FIM DO SCRIPT 41
-- ============================================
-- Resultado esperado:
-- ✅ Coluna data_entrada_calculo adicionada
-- ✅ Coluna sla_horas adicionada
-- ✅ Coluna sla_status adicionada
-- ✅ Função de cálculo de SLA criada
-- ✅ Trigger automático criado
-- ✅ View de métricas criada
-- ✅ SLA atualizado para precatórios em cálculo
-- ============================================
