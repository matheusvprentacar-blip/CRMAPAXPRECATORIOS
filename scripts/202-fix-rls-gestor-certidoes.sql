-- Nome: Fix RLS para Gestor de Certidões
-- Descrição: Permite que usuarios com role 'gestor_certidoes' vejam todos os itens da fila 'certidoes', não apenas os atribuídos.

-- 1. Dropar policy antiga (restritiva)
DROP POLICY IF EXISTS "Gestor certidoes pode ver seus precatorios" ON precatorios;

-- 2. Criar nova policy (permissiva para a fila)
CREATE POLICY "Gestor certidoes pode ver fila e seus precatorios"
ON precatorios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND 'gestor_certidoes' = ANY(usuarios.role)
    AND (
        -- Pode ver se for o responsável
        precatorios.responsavel_certidoes_id = auth.uid()
        OR 
        -- OU se o precatório estiver na fase de certidões (fila)
        precatorios.status_kanban = 'certidoes'
        OR
        precatorios.localizacao_kanban = 'certidoes'
    )
  )
);

-- Comentário: A permissão de UPDATE continua restrita ao responsável (ou precisa "pegar" o item via RPC/Função que ignora RLS ou ter permissão de update na fila também). 
-- Por segurança, mantemos UPDATE restrito por enquanto, focando na visualização (SELECT).
