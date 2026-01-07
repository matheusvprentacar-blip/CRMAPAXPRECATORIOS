# Solução Final - Erro de RLS ao Criar Usuário

## Problema Identificado

Erro: `new row violates row-level security policy for table "usuarios"`

O trigger que insere automaticamente usuários na tabela `usuarios` estava sendo bloqueado pelas políticas de Row Level Security (RLS).

## Solução Implementada

O script `10-fix-rls-criar-usuario.sql` implementa a solução definitiva:

### 1. Função com SECURITY DEFINER
- A função `handle_new_user()` agora usa `SECURITY DEFINER`
- Isso faz ela executar com permissões de superusuário (postgres)
- Bypassa as restrições de RLS durante a inserção automática

### 2. Policy para Self-Insert
- Criada policy que permite usuários inserirem seu próprio registro
- `WITH CHECK (auth.uid() = id)` garante que só pode inserir o próprio ID

### 3. Policy para Admins
- Admins podem inserir qualquer usuário
- Permite criação de usuários pela interface administrativa

## Como Usar

1. **Execute o script no Supabase SQL Editor:**
   ```sql
   -- Cole o conteúdo de scripts/10-fix-rls-criar-usuario.sql
   ```

2. **Teste a criação de usuário:**
   - Abra seu app CRM
   - Vá em Admin > Usuários
   - Clique em "Criar Novo Usuário"
   - Preencha os dados e crie

3. **Verifique o resultado:**
   - O usuário deve ser criado sem erros
   - Deve aparecer tanto em `auth.users` quanto em `usuarios`

## Arquitetura Final

```
Usuário preenche formulário
         ↓
Server Action chama supabase.auth.admin.createUser()
         ↓
Supabase Auth cria usuário em auth.users
         ↓
Trigger on_auth_user_created dispara
         ↓
Função handle_new_user() executa com SECURITY DEFINER
         ↓
Insere registro em public.usuarios (bypassa RLS)
         ↓
✅ Usuário criado completamente!
```

## Segurança

- ✅ RLS permanece ativo
- ✅ Usuários normais só podem ver/editar seus próprios dados
- ✅ Admins têm controle total
- ✅ Trigger executa com permissões elevadas de forma segura
- ✅ Self-insert permitido apenas para o próprio usuário

## Troubleshooting

Se ainda houver erro:

1. **Verifique se a SUPABASE_SERVICE_ROLE_KEY está configurada:**
   ```bash
   # No .env.local
   SUPABASE_SERVICE_ROLE_KEY=eyJ...sua_key_aqui
   ```

2. **Confirme que reiniciou o servidor após adicionar a key**

3. **Verifique os logs no console:**
   - Abra DevTools (F12) > Console
   - Procure por logs com `[v0]`

4. **Teste com SQL direto no Supabase:**
   ```sql
   SELECT * FROM usuarios;
   -- Deve retornar os usuários existentes
