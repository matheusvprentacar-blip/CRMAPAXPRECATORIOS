-- =====================================================
-- SCRIPT 228 (Opcional DEV): Seed Parecer Juridico
-- =====================================================
-- Execute manualmente em ambiente de desenvolvimento.
-- Este script cria 2 pareceres de exemplo vinculados a precatorios.
-- =====================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_1 UUID;
  v_user_2 UUID;
  v_prec_1 UUID;
  v_prec_2 UUID;
  v_op_1 UUID;
  v_op_2 UUID;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.tenants
  ORDER BY created_at
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Nenhum tenant encontrado. Aplique a migration 227 primeiro.';
    RETURN;
  END IF;

  SELECT id INTO v_user_1 FROM public.usuarios ORDER BY created_at LIMIT 1;
  SELECT id INTO v_user_2 FROM public.usuarios ORDER BY created_at OFFSET 1 LIMIT 1;

  IF v_user_1 IS NULL THEN
    RAISE NOTICE 'Nenhum usuario encontrado para seed.';
    RETURN;
  END IF;

  IF v_user_2 IS NULL THEN
    v_user_2 := v_user_1;
  END IF;

  SELECT id INTO v_prec_1 FROM public.precatorios WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_prec_2 FROM public.precatorios WHERE deleted_at IS NULL ORDER BY created_at DESC OFFSET 1 LIMIT 1;

  IF v_prec_1 IS NULL THEN
    RAISE NOTICE 'Nenhum precatorio encontrado para seed.';
    RETURN;
  END IF;

  IF v_prec_2 IS NULL THEN
    v_prec_2 := v_prec_1;
  END IF;

  INSERT INTO public.legal_opinions (
    tenant_id,
    precatorio_id,
    requested_by,
    assigned_to,
    title,
    type,
    status,
    priority,
    due_date,
    executive_summary,
    analysis,
    recommendation,
    conclusion,
    checklist
  )
  VALUES (
    v_tenant_id,
    v_prec_1,
    v_user_1,
    v_user_2,
    'Analise de risco processual e estrategia de atuacao',
    'risco_processual',
    'em_analise',
    'alta',
    CURRENT_DATE + 7,
    'Risco processual moderado com pontos de atencao em impugnacao de calculo.',
    'Foram identificados fundamentos para sustentacao da memoria de calculo com ajustes pontuais.',
    'Prosseguir com diligencia documental complementar e manifestacao tecnica.',
    'Parecer favoravel com ressalvas.',
    jsonb_build_object(
      'titularidade', true,
      'calculos', true,
      'prioridade', false,
      'penhoras', false,
      'documentos', true,
      'compliance', true
    )
  )
  RETURNING id INTO v_op_1;

  INSERT INTO public.legal_opinions (
    tenant_id,
    precatorio_id,
    requested_by,
    assigned_to,
    title,
    type,
    status,
    priority,
    due_date,
    executive_summary,
    analysis,
    recommendation,
    conclusion,
    checklist
  )
  VALUES (
    v_tenant_id,
    v_prec_2,
    v_user_2,
    v_user_1,
    'Validacao de titularidade e cadeia de cessao',
    'titularidade_cessao',
    'pendente',
    'media',
    CURRENT_DATE + 10,
    'Documentacao principal recebida, pendente validacao de poderes.',
    'Necessaria confirmacao de procurações e certidoes para concluir parecer.',
    'Solicitar documentos complementares antes de liberar proposta final.',
    'Aguardando documentos para conclusao.',
    jsonb_build_object(
      'titularidade', false,
      'calculos', false,
      'prioridade', false,
      'penhoras', false,
      'documentos', false,
      'compliance', false
    )
  )
  RETURNING id INTO v_op_2;

  INSERT INTO public.legal_opinion_comments (tenant_id, legal_opinion_id, author_id, content)
  VALUES
    (v_tenant_id, v_op_1, v_user_1, 'Iniciado checklist de risco processual.'),
    (v_tenant_id, v_op_1, v_user_2, 'Necessario anexar certidao atualizada.'),
    (v_tenant_id, v_op_2, v_user_2, 'Aguardando resposta do cartorio para cadeia dominial.');

  RAISE NOTICE 'Seed Parecer Juridico criado com sucesso.';
END;
$$;
