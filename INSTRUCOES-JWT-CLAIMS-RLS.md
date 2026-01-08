# ✅ RLS com JWT Claims - Solução Definitiva

## O que mudou?

Antes: Policies consultavam `is_admin()` → que consultava `usuarios` → **RECURSÃO INFINITA** ❌

Agora: Policies leem `auth.jwt() -> 'app_metadata' ->> 'role'` → **SEM RECURSÃO** ✅

## Passo a passo para implementar

### 1️⃣ Executar script SQL no Supabase

Execute `scripts/18-implementar-rls-com-jwt-claims.sql` no Supabase SQL Editor.

Isso vai:
- ✅ Remover todas as policies antigas
- ✅ Remover a função `is_admin()` problemática
- ✅ Criar novas policies baseadas em JWT claims
- ✅ Zero recursão

### 2️⃣ Setar app_metadata para usuários existentes

**Opção A - Via Supabase Dashboard (mais fácil):**

1. Supabase Dashboard → **Authentication** → **Users**
2. Para cada usuário:
   - Clique nos 3 pontos (⋮) → **Edit user**
   - Scroll até **User Metadata**
   - Adicione no campo **App metadata**:
   ```json
   {
     "role": "admin"
   }
   ```
   ou
   ```json
   {
     "role": "operador_comercial"
   }
   ```
3. **Save**

**Opção B - Via código (mais rápido para vários usuários):**

Veja o arquivo `scripts/19-setar-app-metadata-usuarios-existentes.sql` para código de exemplo.

### 3️⃣ Atualizar código de criação de usuários

O código em `app/(dashboard)/admin/usuarios/actions.ts` já foi atualizado para setar `app_metadata.role` automaticamente quando criar novos usuários.

### 4️⃣ Testar

1. **Logout e login novamente** (importante para recarregar JWT com app_metadata)
2. Como **admin**: você deve ver todos os usuários
3. Como **operador_comercial**: você deve ver apenas seu próprio perfil

## Como funciona?

### JWT Claims

Quando o usuário faz login, o Supabase cria um JWT com:

```json
{
  "sub": "uuid-do-usuario",
  "email": "user@example.com",
  "app_metadata": {
    "role": "admin"
  }
}
```

### Policies RLS

As policies agora leem diretamente do JWT:

```sql
-- Admin vê tudo:
(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'

-- Usuário vê só o próprio:
id = auth.uid()
```

**Sem consultas à tabela usuarios = Sem recursão!** 🎉

## Troubleshooting

### "Ainda não vejo outros usuários"
- ✅ Executou o script 18?
- ✅ Setou app_metadata no usuário?
- ✅ Fez logout e login de novo?

### "Erro de permissão"
- Verifique se o app_metadata está correto:
  ```sql
  SELECT raw_app_meta_data 
  FROM auth.users 
  WHERE email = 'seu-email@exemplo.com';
  ```

### "JWT não tem app_metadata"
- Faça logout e login novamente
- O JWT é gerado no momento do login
