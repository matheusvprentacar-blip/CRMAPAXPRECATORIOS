-- ============================================
-- SCRIPT 44: FUNÇÃO PARA TIMELINE
-- ============================================
-- FASE 2: Cria função helper para registrar
-- eventos na timeline de forma padronizada
-- ============================================

-- 1. Criar função para registrar eventos na timeline
CREATE OR REPLACE FUNCTION public.registrar_evento_timeline(
  p_precatorio_id UUID,
  p_usuario_id UUID,
  p_tipo TEXT,
  p_descricao TEXT,
  p_dados JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_atividade_id UUID;
BEGIN
  -- Inserir evento na tabela atividades
  INSERT INTO public.atividades (
    precatorio_id,
    usuario_id,
    tipo,
    descricao,
    dados_novos,
    created_at
  ) VALUES (
    p_precatorio_id,
    p_usuario_id,
    p_tipo,
    p_descricao,
    p_dados,
    NOW()
  )
  RETURNING id INTO v_atividade_id;
  
  RETURN v_atividade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Adicionar comentário
COMMENT ON FUNCTION public.registrar_evento_timeline IS 
'Registra um evento na timeline do precatório. Tipos válidos: criacao, inclusao_fila, inicio_calculo, atraso, retomada, finalizacao, mudanca_status, comentario';

-- 3. Criar trigger para registrar criação automaticamente
CREATE OR REPLACE FUNCTION public.trigger_registrar_criacao_precatorio()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar evento de criação
  PERFORM public.registrar_evento_timeline(
    NEW.id,
    NEW.criado_por,
    'criacao',
    'Precatório criado',
    jsonb_build_object(
      'titulo', NEW.titulo,
      'valor_atualizado', NEW.valor_atualizado,
      'credor_nome', NEW.credor_nome
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar trigger para registrar mudanças de status
CREATE OR REPLACE FUNCTION public.trigger_registrar_mudanca_status()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_descricao TEXT;
BEGIN
  -- Detectar mudança de status
  IF NEW.status != OLD.status THEN
    -- Determinar usuário (priorizar responsável de cálculo se for mudança para em_calculo)
    IF NEW.status = 'em_calculo' THEN
      v_usuario_id := COALESCE(NEW.responsavel_calculo_id, NEW.responsavel, NEW.criado_por);
      v_descricao := 'Precatório incluído na fila de cálculo';
    ELSE
      v_usuario_id := COALESCE(NEW.responsavel, NEW.criado_por);
      v_descricao := 'Status alterado de ' || OLD.status || ' para ' || NEW.status;
    END IF;
    
    -- Registrar evento
    PERFORM public.registrar_evento_timeline(
      NEW.id,
      v_usuario_id,
      'mudanca_status',
      v_descricao,
      jsonb_build_object(
        'status_anterior', OLD.status,
        'status_novo', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger para registrar atraso
CREATE OR REPLACE FUNCTION public.trigger_registrar_atraso()
RETURNS TRIGGER AS $$
BEGIN
  -- Detectar registro de atraso
  IF NEW.motivo_atraso_calculo IS NOT NULL AND 
     (OLD.motivo_atraso_calculo IS NULL OR OLD.motivo_atraso_calculo != NEW.motivo_atraso_calculo) THEN
    
    -- Registrar evento de atraso
    PERFORM public.registrar_evento_timeline(
      NEW.id,
      NEW.registrado_atraso_por,
      'atraso',
      'Atraso reportado: ' || COALESCE(NEW.tipo_atraso, 'não especificado'),
      jsonb_build_object(
        'tipo_atraso', NEW.tipo_atraso,
        'impacto_atraso', NEW.impacto_atraso,
        'motivo', NEW.motivo_atraso_calculo
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Aplicar triggers na tabela precatorios
DROP TRIGGER IF EXISTS trigger_timeline_criacao ON public.precatorios;
CREATE TRIGGER trigger_timeline_criacao
AFTER INSERT ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION public.trigger_registrar_criacao_precatorio();

DROP TRIGGER IF EXISTS trigger_timeline_status ON public.precatorios;
CREATE TRIGGER trigger_timeline_status
AFTER UPDATE ON public.precatorios
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trigger_registrar_mudanca_status();

DROP TRIGGER IF EXISTS trigger_timeline_atraso ON public.precatorios;
CREATE TRIGGER trigger_timeline_atraso
AFTER UPDATE ON public.precatorios
FOR EACH ROW
WHEN (OLD.motivo_atraso_calculo IS DISTINCT FROM NEW.motivo_atraso_calculo)
EXECUTE FUNCTION public.trigger_registrar_atraso();

-- 7. Criar view para timeline com nomes de usuários
CREATE OR REPLACE VIEW public.timeline_precatorios AS
SELECT 
  a.id,
  a.precatorio_id,
  a.usuario_id,
  a.tipo,
  a.descricao,
  a.dados_anteriores,
  a.dados_novos,
  a.created_at,
  u.nome as usuario_nome,
  u.email as usuario_email
FROM public.atividades a
LEFT JOIN public.usuarios u ON a.usuario_id = u.id
ORDER BY a.created_at DESC;

-- 8. Conceder permissões
GRANT EXECUTE ON FUNCTION public.registrar_evento_timeline TO authenticated;
GRANT SELECT ON public.timeline_precatorios TO authenticated;

-- ============================================
-- FIM DO SCRIPT 44
-- ============================================
-- Resultado esperado:
-- ✅ Função registrar_evento_timeline criada
-- ✅ Trigger de criação criado
-- ✅ Trigger de mudança de status criado
-- ✅ Trigger de atraso criado
-- ✅ View timeline_precatorios criada
-- ✅ Permissões concedidas
-- ============================================
