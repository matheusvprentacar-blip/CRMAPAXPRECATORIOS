# Reset Completo do RLS - Instruções

## Situação Atual
O sistema estava com erro de recursão infinita devido a policies que consultavam a própria tabela `usuarios`.

## Solução: Reset Completo

### Passo 1: Executar Script de Reset
Execute o arquivo `RESET-rls-limpar-tudo-e-voltar-ao-original.sql` no Supabase SQL Editor.

Este script:
- Remove TODAS as policies antigas problemáticas
- Remove funções como `is_admin()` que causavam recursão
- Recria as policies originais do schema, que são SIMPLES e SEM RECURSÃO

### Passo 2: Configurar Role no JWT (IMPORTANTE!)

As policies usam `(auth.jwt() ->> 'role')` para verificar se é admin. Você precisa configurar isso:

**Opção A: Via Supabase Dashboard (Recomendado)**
1. Vá em Authentication → Users
2. Encontre seu usuário
3. Clique no usuário para editar
4. Na seção "User Metadata", procure por "Raw User Meta Data"
5. Adicione ou edite para:
   ```json
   {
     "role": "admin"
   }
   ```
6. Salve

**Opção B: Via SQL**
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'SEU-EMAIL@AQUI.com';
```

### Passo 3: Fazer Logout e Login
O JWT só é atualizado quando você faz novo login. Portanto:
1. Faça logout do CRM
2. Faça login novamente
3. Agora o JWT terá `{"role": "admin"}` e as policies funcionarão

### Como Funciona Agora

**Tabela usuarios:**
- TODOS os usuários autenticados podem VER todos os outros usuários (necessário para listas, dropdowns de responsáveis, etc)
- Cada usuário pode EDITAR apenas o próprio perfil

**Tabela precatorios:**
- Admin vê e edita TUDO
- Operador comercial vê e edita apenas precatórios onde `dono_usuario_id = auth.uid()`
- Operador cálculo vê e edita apenas precatórios onde `responsavel_calculo_id = auth.uid()`

**Sem Recursão:**
- As policies NÃO consultam a tabela `usuarios`
- Elas apenas leem `auth.jwt() ->> 'role'` (que vem do JWT, não do banco)
- Sem consultas = sem recursão = sem erro 500

### Teste
Após fazer logout/login:
1. Como admin, você deve ver a lista completa de usuários
2. Não deve haver erro 500 de recursão infinita
3. Você deve conseguir editar qualquer usuário

### Criar Novos Usuários
Quando criar novos usuários pelo código, garanta que o `raw_user_meta_data` inclui o role:
```typescript
const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
  email,
  password,
  user_metadata: { nome },
  email_confirm: true,
  app_metadata: { role } // ← IMPORTANTE: isto seta o role no JWT
})
