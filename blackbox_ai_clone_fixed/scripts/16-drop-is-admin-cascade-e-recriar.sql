-- Remove a função is_admin() e TODAS as policies que dependem dela
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;

-- TABELA: usuarios
-- Remover policies antigas se ainda existirem
DROP POLICY IF EXISTS "Usuarios podem ver todos" ON usuarios;
DROP POLICY IF EXISTS "Usuarios podem ver o proprio perfil" ON usuarios;
DROP POLICY IF EXISTS "Usuarios podem atualizar o proprio perfil" ON usuarios;
DROP POLICY IF EXISTS "Usuarios podem deletar o proprio perfil" ON usuarios;
DROP POLICY IF EXISTS "allow_insert_own_user" ON usuarios;
DROP POLICY IF EXISTS "allow_insert_authenticated" ON usuarios;

-- Criar policies simples sem recursão
CREATE POLICY "usuarios_select_all"
  ON usuarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "usuarios_update_own"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "usuarios_delete_own"
  ON usuarios FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "usuarios_insert_authenticated"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- TABELA: propostas
-- Remover policies antigas
DROP POLICY IF EXISTS "Admin full access propostas" ON propostas;
DROP POLICY IF EXISTS "Users can view own propostas" ON propostas;
DROP POLICY IF EXISTS "Users can create propostas" ON propostas;
DROP POLICY IF EXISTS "Users can update own propostas" ON propostas;

-- Criar policies para propostas (todos podem ver/criar/editar as suas)
CREATE POLICY "propostas_select_all"
  ON propostas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "propostas_insert_all"
  ON propostas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "propostas_update_all"
  ON propostas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "propostas_delete_all"
  ON propostas FOR DELETE
  TO authenticated
  USING (true);

-- TABELA: notificacoes
-- Remover policies antigas
DROP POLICY IF EXISTS "Admin full access notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Users can view own notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Users can update own notificacoes" ON notificacoes;

-- Criar policies para notificacoes (usuário vê as suas)
CREATE POLICY "notificacoes_select_own"
  ON notificacoes FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "notificacoes_insert_all"
  ON notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "notificacoes_update_own"
  ON notificacoes FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "notificacoes_delete_own"
  ON notificacoes FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);
