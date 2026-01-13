-- CORREÇÃO DE ACESSO: Tabela Usuarios
-- Necessário para que o RLS de outras tabelas funcione

-- 1. Habilitar RLS na tabela usuarios (caso não esteja)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 2. Garantir que cada usuário possa ver SEU PRÓPRIO registro
-- Isso permite que: EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() ...) funcione
DROP POLICY IF EXISTS "Usuarios podem ver seus proprios dados" ON usuarios;
CREATE POLICY "Usuarios podem ver seus proprios dados"
ON usuarios FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Garantir que Admin possa ver TODOS os usuários (sem recursão infinita se possível)
-- Usamos uma subquery simples que depende da policy acima
DROP POLICY IF EXISTS "Admin pode ver todos usuarios" ON usuarios;
CREATE POLICY "Admin pode ver todos usuarios"
ON usuarios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid() -- O usuário lendo seu próprio registro (permitido pela policy acima)
    AND 'admin' = ANY(u.role) -- Verifica se é admin
  )
);

-- 4. Garantir que Gestores possam ver TODOS os usuários (para atribuir responsáveis)
-- Gestor de Certidões, Ofícios, Comercial e Cálculo precisam ver a lista de usuários para saber quem existe
DROP POLICY IF EXISTS "Gestores podem ver todos usuarios" ON usuarios;
CREATE POLICY "Gestores podem ver todos usuarios"
ON usuarios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND (
      'gestor_certidoes' = ANY(u.role) OR
      'gestor_oficio' = ANY(u.role) OR
      'operador_comercial' = ANY(u.role) OR
      'operador_calculo' = ANY(u.role) OR
      'gestor' = ANY(u.role)
    )
  )
);

-- 5. Atualizar permissões (GRANT)
GRANT SELECT ON usuarios TO authenticated;
