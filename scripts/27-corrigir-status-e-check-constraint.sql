-- Corrigir status e localizacao_kanban para serem a mesma coisa
-- Adicionar 'em_contato' ao CHECK constraint se necessário

-- 1) Ver o constraint atual
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.precatorios'::regclass 
  AND conname LIKE '%status%';

-- 2) Dropar constraint antigo e criar novo com todos os status válidos
ALTER TABLE public.precatorios DROP CONSTRAINT IF EXISTS precatorios_status_check;

ALTER TABLE public.precatorios 
ADD CONSTRAINT precatorios_status_check 
CHECK (status IN ('novo', 'em_contato', 'em_calculo', 'calculado', 'aguardando_cliente', 'concluido', 'cancelado'));

-- 3) Sincronizar localizacao_kanban com status em todos os registros existentes
UPDATE public.precatorios 
SET localizacao_kanban = status,
    updated_at = now()
WHERE deleted_at IS NULL;

-- 4) Criar/atualizar trigger para manter sincronização automática
CREATE OR REPLACE FUNCTION sync_localizacao_kanban()
RETURNS TRIGGER AS $$
BEGIN
  -- Sempre que status mudar, atualizar localizacao_kanban
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.localizacao_kanban := NEW.status;
  END IF;
  
  -- Se localizacao_kanban mudar, atualizar status
  IF NEW.localizacao_kanban IS DISTINCT FROM OLD.localizacao_kanban THEN
    NEW.status := NEW.localizacao_kanban;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_localizacao_kanban ON public.precatorios;

CREATE TRIGGER trigger_sync_localizacao_kanban
BEFORE UPDATE ON public.precatorios
FOR EACH ROW
EXECUTE FUNCTION sync_localizacao_kanban();

-- 5) Verificar precatórios em cálculo
SELECT 
  id,
  titulo,
  status,
  localizacao_kanban,
  responsavel_calculo_id,
  operador_calculo,
  created_at
FROM public.precatorios
WHERE status = 'em_calculo' 
  AND deleted_at IS NULL
ORDER BY created_at ASC;

-- 6) Corrigir especificamente o precatório d28e9832-b02d-4145-8ec0-69cb5ac7fa97
UPDATE public.precatorios
SET 
  localizacao_kanban = 'em_calculo',
  updated_at = now()
WHERE id = 'd28e9832-b02d-4145-8ec0-69cb5ac7fa97'
  AND status = 'em_calculo';

-- 7) Verificar resultado
SELECT 
  id,
  titulo,
  status,
  localizacao_kanban,
  responsavel_calculo_id
FROM public.precatorios
WHERE id = 'd28e9832-b02d-4145-8ec0-69cb5ac7fa97';
