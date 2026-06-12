BEGIN;

-- O default legado "novo_precatorio" nao pertence mais ao conjunto permitido
-- por precatorios_localizacao_kanban_check. Mantemos defaults validos para
-- insercoes que nao informem explicitamente os campos do Kanban.
ALTER TABLE public.precatorios
  ALTER COLUMN status_kanban SET DEFAULT 'entrada',
  ALTER COLUMN localizacao_kanban SET DEFAULT 'entrada';

COMMIT;
