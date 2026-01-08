-- =====================================================
-- SCRIPT 47: Timeline - Eventos de SLA
-- =====================================================
-- Descrição: Adiciona trigger para registrar mudanças
--            de status do SLA na timeline
-- Autor: Sistema CRM Precatórios
-- Data: 2025
-- =====================================================

-- 1. Criar função para registrar mudanças de SLA
CREATE OR REPLACE FUNCTION public.trigger_registrar_mudanca_sla()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_descricao TEXT;
  v_dados JSONB;
BEGIN
  -- Detectar mudança de status do SLA
  IF NEW.sla_status IS DISTINCT FROM OLD.sla_status AND NEW.sla_status IS NOT NULL THEN
    
    -- Determinar usuário (responsável de cálculo ou responsável)
    v_usuario_id := COALESCE(NEW.responsavel_calculo_id, NEW.responsavel, NEW.criado_por);
    
    -- Montar descrição baseada no novo status
    CASE NEW.sla_status
      WHEN 'no_prazo' THEN
        v_descricao := 'SLA iniciado - Dentro do prazo';
      WHEN 'atencao' THEN
        v_descricao := 'SLA em atenção - Prazo próximo do vencimento';
      WHEN 'atrasado' THEN
        v_descricao := 'SLA estourado - Prazo vencido';
      WHEN 'concluido' THEN
        v_descricao := 'SLA concluído - Cálculo finalizado';
      ELSE
        v_descricao := 'Status do SLA alterado para ' || NEW.sla_status;
    END CASE;
    
    -- Montar dados do evento
    v_dados := jsonb_build_object(
      'sla_status_anterior', OLD.sla_status,
      'sla_status_novo', NEW.sla_status,
      'sla_horas', NEW.sla_horas,
      'data_entrada_calculo', NEW.data_entrada_calculo
    );
    
    -- Registrar evento na timeline
    PERFORM public.registrar_evento_timeline(
      NEW.id,
      v_usuario_id,
      'mudanca_sla',
      v_descricao,
      v_dados
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Adicionar comentário
COMMENT ON FUNCTION public.trigger_registrar_mudanca_sla IS 
'Registra mudanças de status do SLA na timeline do precatório';

-- 3. Aplicar trigger na tabela precatorios
DROP TRIGGER IF EXISTS trigger_timeline_sla ON public.precatorios;
CREATE TRIGGER trigger_timeline_sla
AFTER UPDATE ON public.precatorios
FOR EACH ROW
WHEN (OLD.sla_status IS DISTINCT FROM NEW.sla_status)
EXECUTE FUNCTION public.trigger_registrar_mudanca_sla();

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.trigger_registrar_mudanca_sla TO authenticated;

-- =====================================================
-- TESTES
-- =====================================================

-- Verificar se o trigger foi criado
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_timeline_sla';

-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- DROP TRIGGER IF EXISTS trigger_timeline_sla ON public.precatorios;
-- DROP FUNCTION IF EXISTS public.trigger_registrar_mudanca_sla();

-- =====================================================
-- NOTAS
-- =====================================================
-- Este trigger registra automaticamente na timeline quando:
-- - SLA muda de NULL para "no_prazo" (início do cálculo)
-- - SLA muda de "no_prazo" para "atencao" (prazo próximo)
-- - SLA muda de "atencao" para "atrasado" (prazo vencido)
-- - SLA muda para "concluido" (cálculo finalizado)
--
-- Tipos de evento criados:
-- - tipo: "mudanca_sla"
-- - descricao: Texto descritivo do que aconteceu
-- - dados_novos: JSON com status anterior, novo, horas e data
-- =====================================================
