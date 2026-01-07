# Ordem de Execução dos Scripts SQL

## Para BANCO VAZIO (Recomendado)

Execute APENAS este script na ordem:

### 1. Script 04 - Schema Completo
```
scripts/04-schema-completo-crm.sql
```

Este script cria:
- Todas as tabelas (usuarios, precatorios, atividades, comentarios)
- Todos os índices otimizados
- Função get_user_role() com STABLE e SECURITY DEFINER
- Todas as policies RLS usando auth.jwt()
- Triggers de updated_at
- Usuário admin seed

### 2. Script 06 - Propostas e Notificações
```
scripts/06-rls-propostas-notificacoes.sql
```

Este script adiciona:
- Tabelas propostas e notificacoes (se não existirem)
- Policies RLS otimizadas para essas tabelas
- Índices compostos

---

## Para BANCO EXISTENTE (Migração)

Se você já tem dados e tabelas criadas:

### 1. Backup primeiro!
```sql
-- Faça backup no Supabase Dashboard antes de prosseguir
```

### 2. Script 00 - Limpar (OPCIONAL - APAGA TUDO)
```
scripts/00-limpar-banco.sql
```

### 3. Script 04 - Schema Completo
```
scripts/04-schema-completo-crm.sql
```

### 4. Script 06 - Propostas e Notificações  
```
scripts/06-rls-propostas-notificacoes.sql
```

---

## Criar Usuário Admin

Após executar os scripts, crie o usuário admin:

### Método 1: Supabase Dashboard (Recomendado)

1. Vá para: **Authentication > Users**
2. Clique em **"Add User"** ou **"Invite User"**
3. Preencha:
   - Email: `admin@test.com`
   - Password: `Admin@123`
   - **Auto Confirm User**: ✅ Marque esta opção
4. Clique em **"Create User"**
5. **Copie o UUID** gerado
6. Execute no SQL Editor:

```sql
UPDATE public.usuarios 
SET role = 'admin'
WHERE id = 'COLE-O-UUID-AQUI';
```

### Método 2: SQL Direto (Avançado)

Se você já criou o usuário no Auth e tem o UUID:

```sql
-- Inserir/atualizar na tabela usuarios
INSERT INTO public.usuarios (id, email, nome, role, created_at)
VALUES (
  'UUID-DO-AUTH-USERS',
  'admin@test.com',
  'Administrador',
  'admin',
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET role = 'admin';
```

---

## Configurar JWT Custom Claims (Importante para Performance)

Para as policies RLS funcionarem com `auth.jwt()`, configure um Database Webhook:

### 1. No Supabase Dashboard:

**Database > Functions > Create a new function**

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Buscar role do usuário
  SELECT role INTO user_role FROM public.usuarios WHERE id = (event->>'user_id')::uuid;
  
  -- Adicionar role ao JWT
  claims := event->'claims';
  
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  END IF;

  -- Retornar claims atualizados
  event := jsonb_set(event, '{claims}', claims);
  
  RETURN event;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

### 2. Depois vá em:

**Authentication > Hooks > Custom Access Token Hook**

Selecione: `public.custom_access_token_hook`

Isso garante que o role do usuário seja incluído no JWT, eliminando a necessidade de consultas ao banco nas policies RLS.

---

## Verificar Se Tudo Funcionou

Execute no SQL Editor:

```sql
-- Ver todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Ver policies RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Ver usuários
SELECT id, email, nome, role 
FROM public.usuarios;
```

---

## Troubleshooting

### Erro: "relation public.precatorios does not exist"

- Você está executando o script 06 antes do script 04
- **Solução**: Execute o script 04 primeiro

### Erro: "column criado_por does not exist"  

- Tentou dropar policies antes de criar tabelas
- **Solução**: Execute o script 00 para limpar, depois o 04

### Erro: Cannot drop function get_user_role() because other objects depend on it

- Policies antigas ainda dependem da função
- **Solução**: O script 00 já resolve isso com CASCADE

### JWT não contém o 'role'

- Custom Access Token Hook não está configurado
- **Solução**: Configure o hook conforme instruções acima
- **Alternativa**: As policies usam get_user_role() como fallback

---

## Scripts Obsoletos (NÃO USE)

Estes scripts são da versão antiga e foram consolidados no script 04:

- ~~01-schema-inicial.sql~~
- ~~02-adicionar-campos-calculo.sql~~
- ~~03-atualizar-rls-roles.sql~~
- ~~05-seed-admin-user.sql~~
