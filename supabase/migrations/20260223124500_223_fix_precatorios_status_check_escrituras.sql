BEGIN;

-- O campo `status` ainda e usado por fluxos legados e pode ser sincronizado com `status_kanban`
-- via trigger. Portanto ele precisa aceitar a nova etapa `escrituras`.
ALTER TABLE public.precatorios
  DROP CONSTRAINT IF EXISTS precatorios_status_check;

ALTER TABLE public.precatorios
  ADD CONSTRAINT precatorios_status_check
  CHECK (
    status IS NULL
    OR status IN (
      -- Legado historico
      'novo',
      'em_andamento',
      'em_contato',
      'em_calculo',
      'calculado',
      'aguardando_cliente',
      'concluido',
      'cancelado',
      'fila_calculo',
      -- Fluxo kanban
      'entrada',
      'triagem_interesse',
      'aguardando_oficio',
      'docs_credor',
      'analise_processual_inicial',
      'analise_juridica',
      'recalculo_pos_juridico',
      'pronto_calculo',
      'calculo_andamento',
      'juridico',
      'calculo_concluido',
      'proposta_negociacao',
      'proposta_aceita',
      'certidoes',
      'escrituras',
      'fechado',
      'encerrados',
      'reprovado',
      'nao_elegivel',
      'credito_vendido',
      -- Encerramentos paralelos
      'pos_fechamento',
      'pausado_credor',
      'pausado_documentos',
      'sem_interesse'
    )
  );

COMMIT;
