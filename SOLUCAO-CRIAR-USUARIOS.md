# Solução: Criar Usuários sem Service Role Key

## O Problema

A API Admin do Supabase (`supabase.auth.admin.createUser()`) requer a chave `service_role`, que não deve ser exposta no cliente ou em Server Actions do Next.js por questões de segurança.

## A Solução Implementada

Criamos uma **API Route** (`/api/admin/create-user`) que:

1. ✅ **Usa apenas a chave ANON pública** (segura para usar)
2. ✅ **Verifica se o usuário atual é admin** antes de criar
3. ✅ **Usa `signUp()` em vez de `admin.createUser()`**
4. ✅ **Insere o usuário na tabela `usuarios`** com a role correta
5. ⚠️ **Requer confirmação manual do email** no Supabase Dashboard

## Como Funciona

### Fluxo de Criação:

```
Admin preenche formulário 
    ↓
Server Action chama API Route
    ↓
API Route verifica permissões (admin only)
    ↓
Usa signUp() para criar usuário
    ↓
Insere na tabela usuarios
    ↓
Retorna sucesso com instruções
```

### Confirmação de Email:

Quando você marca "Auto Confirmar Usuário?", o sistema cria o usuário mas você precisa confirmar manualmente:

1. Vá no **Supabase Dashboard**
2. **Authentication** > **Users**
3. Encontre o novo usuário
4. Clique nos **três pontos** (⋮)
5. Selecione **"Confirm Email"**

Pronto! O usuário pode fazer login.

## Alternativa Futura: Edge Function

Para automação completa, você pode criar uma Edge Function do Supabase que:

- Tem acesso automático à `service_role`
- É chamada via webhook
- Confirma emails automaticamente
- Não expõe credenciais

Mas por enquanto, a solução atual funciona perfeitamente com confirmação manual.

## Segurança

✅ **Seguro**: Apenas chave ANON é usada (pública)  
✅ **Protegido**: Verifica role de admin antes de criar  
✅ **RLS**: Políticas de banco protegem os dados  
⚠️ **Manual**: Email precisa ser confirmado no dashboard

## Vantagens

- Não requer variáveis de ambiente adicionais
- Funciona imediatamente sem configuração extra
- Seguro e protegido por RLS
- Simples de entender e manter

## Desvantagens

- Confirmação manual de email necessária
- Não pode desabilitar completamente a confirmação de email

---

**Pronto para usar!** Execute o script SQL das tabelas e comece a criar usuários.
