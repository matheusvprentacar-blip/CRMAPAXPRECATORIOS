# Como Configurar a SUPABASE_SERVICE_ROLE_KEY

## ⚠️ Problema Comum

Se você está recebendo o erro:
```
Falha ao criar usuário: Erro de banco de dados criando novo usuário
```

E vê nos logs do Supabase:
```json
"apikey": {
  "error": "invalid",
  "prefix": "sb_temp_hd"
}
```

Isso significa que a **SUPABASE_SERVICE_ROLE_KEY não está configurada corretamente**.

---

## 🔧 Solução: Adicionar a Service Role Key

### Passo 1: Obter a Service Role Key do Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Encontre a seção **Project API keys**
5. Copie a chave **`service_role`** (⚠️ NÃO a `anon` key)
   - A chave começa com algo como: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Passo 2: Adicionar no v0 (Vercel)

#### Se estiver no v0.dev:
1. Clique no menu **Vars** (Variáveis) no chat sidebar
2. Clique em **+ Add Variable**
3. Adicione:
   - **Nome**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Valor**: Cole a service_role key que você copiou
   - **Tipo**: Secret (mantenha marcado)
4. Clique em **Save**

#### Se estiver rodando localmente:
1. Crie ou edite o arquivo `.env.local` na raiz do projeto
2. Adicione a linha:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
   ```
3. Reinicie o servidor de desenvolvimento

### Passo 3: Verificar se Funcionou

1. Recarregue a página do admin
2. Tente criar um novo usuário novamente
3. Se tudo estiver correto, você verá a mensagem de sucesso!

---

## 🔒 Segurança - IMPORTANTE

⚠️ **NUNCA** exponha a `service_role` key publicamente:
- ✅ Use apenas no servidor (Server Actions, API Routes)
- ❌ NUNCA coloque no código client-side
- ❌ NUNCA faça commit no Git (use `.env.local`)
- ❌ NUNCA compartilhe em screenshots ou logs públicos

A `service_role` key tem **acesso total** ao seu banco de dados, ignorando todas as RLS policies.

---

## 🐛 Troubleshooting

### "A chave service_role está inválida ou temporária"
- Você está usando uma chave temporária do Supabase
- Siga os passos acima para configurar a chave correta

### "Configuração do servidor incompleta"
- A variável `SUPABASE_SERVICE_ROLE_KEY` não existe
- Adicione a variável conforme instruções acima

### "Sem permissão para criar usuários"
- Você não está logado como admin
- Certifique-se de que seu usuário tem `role = 'admin'` na tabela `usuarios`

### Ainda não funciona?
1. Verifique se a chave está correta (sem espaços extras)
2. Reinicie o servidor de desenvolvimento
3. Limpe o cache do navegador (Ctrl + Shift + R)
4. Verifique os logs do console do navegador para mais detalhes

---

## 📝 Variáveis de Ambiente Necessárias

Seu projeto precisa de 3 variáveis do Supabase:

```env
# Pública - usada no client-side
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key

# Privada - APENAS server-side (NUNCA exponha)
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

As duas primeiras são públicas e já devem estar configuradas. A terceira (service_role) é a que você precisa adicionar agora.
