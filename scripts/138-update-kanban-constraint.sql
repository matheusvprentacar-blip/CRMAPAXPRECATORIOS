-- Remove a constraint antiga que limita os status do Kanban
ALTER TABLE precatorios
DROP CONSTRAINT IF EXISTS precatorios_status_kanban_check;

-- Adiciona a nova constraint com os status atualizados ('sem_interesse', 'aguardando_oficio')
ALTER TABLE precatorios
ADD CONSTRAINT precatorios_status_kanban_check
CHECK (status_kanban IN (
  'entrada',
  'triagem_interesse',
  'aguardando_oficio',   -- NOVO
  'analise_processual_inicial',
  'docs_credor',         -- Mantido por compatibilidade
  'certidoes',
  'pronto_calculo',
  'calculo_andamento',
  'juridico',
  'calculo_concluido',
  'proposta_negociacao',
  'sem_interesse',       -- NOVO
  'fechado'
));
