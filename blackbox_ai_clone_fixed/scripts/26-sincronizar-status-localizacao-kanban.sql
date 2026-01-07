-- Sincronizar status e localizacao_kanban para precatórios existentes
-- E garantir role no JWT

-- 1) Sincronizar status com localizacao_kanban (padronizar)
UPDATE public.precatorios
SET localizacao_kanban = status
WHERE localizacao_kanban IS NULL OR localizacao_kanban != status;

-- 2) Garantir que role está no app_metadata do Auth (raw_app_meta_data)
-- Isso precisa ser feito via Dashboard do Supabase ou via Admin API

-- Para testar se o role está no JWT, execute no console do browser logado como operador:
-- const { data: { session } } = await supabase.auth.getSession();
-- console.log("ROLE", session?.user?.app_metadata?.role, session?.user?.id);

-- 3) Criar trigger para manter status e localizacao_kanban sempre sincronizados
CREATE OR REPLACE FUNCTION sync_status_localizacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Sempre que status mudar, atualiza localizacao_kanban
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.localizacao_kanban := NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_status_localizacao ON public.precatorios;
CREATE TRIGGER trigger_sync_status_localizacao
  BEFORE UPDATE ON public.precatorios
  FOR EACH ROW
  EXECUTE FUNCTION sync_status_localizacao();

-- 4) Verificar precatórios em em_calculo sem responsavel_calculo_id
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

-- Se encontrar precatórios sem responsavel_calculo_id, eles ficam na fila global
-- e operadores podem clicar em "Assumir" para atribuir a si mesmos
