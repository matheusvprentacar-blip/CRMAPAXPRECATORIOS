-- LIMPEZA TOTAL DA TABELA PRECATORIOS
-- Use este script se a exclusão pelo sistema estiver travada.
-- CUIDADO: Isso apaga TODOS os precatórios.

TRUNCATE TABLE public.precatorios CASCADE;

-- Se o TRUNCATE falhar por permissão, tente o DELETE (mas o TRUNCATE é melhor para resetar IDs se fosse identity, mas aqui usamos UUID):
-- DELETE FROM public.precatorios;
