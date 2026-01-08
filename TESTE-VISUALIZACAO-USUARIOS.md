# Como testar se o admin consegue ver usuários

## 1. Execute o script SQL
Execute o arquivo `scripts/13-fix-rls-admin-visualizar-usuarios.sql` no Supabase SQL Editor.

## 2. Faça logout e login novamente
Isso garante que as novas policies sejam aplicadas à sua sessão.

## 3. Vá para Admin > Usuários
Você deve ver a lista completa de todos os usuários cadastrados.

## 4. O que as policies fazem:

### Policy de SELECT (visualização):
- **usuarios_select_own**: Qualquer usuário autenticado pode ver o próprio perfil
- **usuarios_select_admin**: Admins podem ver TODOS os usuários

### Policy de UPDATE (edição):
- **usuarios_update_own**: Qualquer usuário pode atualizar apenas o próprio perfil
- **usuarios_update_admin**: Admins podem atualizar qualquer usuário

## 5. Se ainda não aparecer:
Abra o console do navegador (F12) e procure por erros relacionados a "usuarios" ou "RLS".
