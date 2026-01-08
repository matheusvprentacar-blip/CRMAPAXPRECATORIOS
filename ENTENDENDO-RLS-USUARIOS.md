# Entendendo o RLS na Tabela Usuarios

## O Problema Original

```
Error 42501: new row violates row-level security policy for table "usuarios"
```

### Causa Raiz

1. **Tabela com RLS ativo**: `ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY`
2. **Sem policy de INSERT**: Só havia policies de SELECT e UPDATE
3. **Trigger bloqueado**: Quando o trigger tentava inserir, o RLS negava

## A Solução Implementada

### 1. Policy de INSERT para Self-Registration

```sql
CREATE POLICY "usuarios_insert_self"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
```

**O que faz:**
- Permite que usuários autenticados (`authenticated`) façam INSERT
- MAS só se `id` da linha nova = `auth.uid()` (id do usuário logado)
- Isso garante que cada usuário só pode criar seu próprio registro

### 2. Policy de INSERT para Admin

```sql
CREATE POLICY "usuarios_insert_admin"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
```

**O que faz:**
- Permite admin inserir qualquer usuário
- Verifica o role no JWT do usuário logado

### 3. Trigger com SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- <-- A MÁGICA ESTÁ AQUI
```

**O que faz:**
- `SECURITY DEFINER`: executa com permissões do **dono da função** (postgres)
- Bypassa RLS de forma **segura** apenas durante execução do trigger
- Permite que o sistema insira automaticamente sem violar policies

## Como Funciona na Prática

### Fluxo de Criação de Usuário

1. **Admin cria usuário via form** → chama API com service_role key
2. **Supabase Auth cria em `auth.users`** → gera UUID
3. **Trigger `on_auth_user_created` dispara**
4. **Função `handle_new_user()` executa com SECURITY DEFINER**
   - Tem permissões de postgres (owner)
   - Ignora RLS policies durante execução
   - Insere em `public.usuarios`
5. **Policy `usuarios_insert_self` valida**
   - Se for self-registration: verifica auth.uid() = id
   - Se for admin: verifica role = 'admin'
6. **Sucesso!** Usuário criado em ambas tabelas

## Diferença: COM vs SEM SECURITY DEFINER

### SEM SECURITY DEFINER (erro 42501)
```
auth.users INSERT → trigger executa COM permissões do usuário logado
                  → RLS bloqueia porque auth.uid() = NULL (não há sessão)
                  → ERRO: violates row-level security policy
```

### COM SECURITY DEFINER (funciona!)
```
auth.users INSERT → trigger executa COM permissões de postgres
                  → RLS é bypassado durante a função
                  → INSERT bem-sucedido
                  → policies validam acessos futuros normalmente
```

## Segurança

### Isso é seguro?

**SIM!** Porque:

1. **Escopo limitado**: SECURITY DEFINER só no trigger, não em toda tabela
2. **Validação posterior**: Policies ainda validam SELECTs, UPDATEs, DELETEs
3. **Contexto controlado**: Trigger só roda em INSERT de auth.users (ação administrativa)
4. **Exception handling**: Erro no trigger não bloqueia criação do auth.user

### O que NÃO fazer

❌ **Não use** `DISABLE ROW LEVEL SECURITY` globalmente
❌ **Não exponha** service_role key no frontend  
❌ **Não permita** INSERT sem validação de auth.uid() ou role

## Testando

1. Execute o script `11-fix-rls-insert-usuarios-FINAL.sql`
2. Vá em Supabase Dashboard > Authentication > Users
3. Add User manualmente
4. Verifique em Database > Table Editor > usuarios
5. O registro deve aparecer automaticamente

## Referências

- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Definer](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
