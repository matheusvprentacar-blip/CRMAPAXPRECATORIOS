# 🔧 Troubleshooting: Service Role Key não está sendo reconhecida

## 🐛 PROBLEMA

O sistema está dizendo que a `SUPABASE_SERVICE_ROLE_KEY` não está configurada, mesmo estando no `.env.local`.

---

## ✅ CHECKLIST DE VERIFICAÇÃO

### 1. **Verificar o Nome da Variável**

O nome deve ser **EXATAMENTE** assim (sem espaços, sem aspas extras):

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

❌ **ERRADO:**
```env
SUPABASE_SERVICE_ROLE_KEY = eyJ...  # Espaços ao redor do =
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Aspas ao redor do valor
SUPABASE_SERVICE_ROLE_KEY='eyJ...'  # Aspas simples
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Com espaço no final
```

✅ **CORRETO:**
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQwOTk1MjAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 2. **Verificar se é a Chave Correta**

A service_role key é **diferente** da anon key:

- **anon key**: Começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ii4uLiIsInJvbGUiOiJhbm9uIi4uLg==`
- **service_role key**: Começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ii4uLiIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLi4u`

**Como verificar:**
1. Vá no dashboard do Supabase
2. Settings → API
3. Na seção "Project API keys", procure por **"service_role"** (não "anon")
4. Copie a chave completa

---

### 3. **Verificar o Arquivo `.env.local`**

O arquivo deve estar na **raiz do projeto** (mesmo nível que `package.json`):

```
CRMAPAXPRECATORIOS/
├── .env.local          ← Aqui!
├── package.json
├── next.config.js
├── app/
├── components/
└── ...
```

❌ **ERRADO:**
- `app/.env.local`
- `src/.env.local`
- `.env` (sem o `.local`)

---

### 4. **Reiniciar o Servidor de Desenvolvimento**

Após adicionar/modificar o `.env.local`, você **DEVE** reiniciar o servidor:

```bash
# Parar o servidor (Ctrl+C)
# Depois iniciar novamente:
npm run dev
```

⚠️ **IMPORTANTE:** Next.js só lê variáveis de ambiente na inicialização!

---

### 5. **Verificar se o Arquivo Existe**

Execute este comando no terminal para verificar:

```bash
# Windows (PowerShell)
Get-Content .env.local

# Windows (CMD)
type .env.local

# Mac/Linux
cat .env.local
```

Se der erro "arquivo não encontrado", o arquivo não está na raiz do projeto.

---

### 6. **Formato Completo do `.env.local`**

Seu arquivo `.env.local` deve ter **3 variáveis**:

```env
# URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Chave pública (anon)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDk5NTIwMH0.xxxxxxxxxxxxxxxxxxxxxxxxx

# Chave de serviço (service_role) - SECRETA!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQwOTk1MjAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxx
```

**Observações:**
- Sem espaços antes ou depois do `=`
- Sem aspas ao redor dos valores
- Sem comentários na mesma linha
- Uma variável por linha

---

### 7. **Verificar Permissões do Arquivo**

No Windows, certifique-se de que o arquivo não está como "somente leitura":

1. Clique com botão direito em `.env.local`
2. Propriedades
3. Desmarque "Somente leitura" se estiver marcado

---

### 8. **Testar se a Variável Está Sendo Lida**

Adicione este código temporário em `app/(dashboard)/admin/usuarios/actions.ts` para debug:

```typescript
export async function updateUserRole(userId: string, newRole: string) {
  // 🔍 DEBUG: Verificar se a variável está sendo lida
  console.log("=== DEBUG ENV VARS ===")
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ OK" : "❌ FALTANDO")
  console.log("SERVICE_ROLE:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ OK" : "❌ FALTANDO")
  console.log("Primeiros 20 chars:", process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20))
  console.log("=====================")

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada")
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada")
    }
    // ... resto do código
```

Depois de adicionar isso:
1. Reinicie o servidor (`npm run dev`)
2. Tente alterar um role
3. Veja o console do terminal (não do browser!)
4. Deve mostrar "✅ OK" para ambas as variáveis

---

### 9. **Verificar o `.gitignore`**

Certifique-se de que `.env.local` está no `.gitignore`:

```gitignore
# local env files
.env*.local
.env
```

Isso garante que o arquivo não será commitado no Git.

---

### 10. **Criar o Arquivo do Zero**

Se nada funcionar, delete o `.env.local` e crie novamente:

```bash
# Windows (PowerShell)
Remove-Item .env.local -ErrorAction SilentlyContinue
New-Item .env.local -ItemType File

# Mac/Linux
rm -f .env.local
touch .env.local
```

Depois abra o arquivo e adicione as 3 variáveis manualmente.

---

## 🔍 DIAGNÓSTICO RÁPIDO

Execute este comando para verificar se o arquivo existe e tem conteúdo:

```bash
# Windows (PowerShell)
if (Test-Path .env.local) { 
  Write-Host "✅ Arquivo existe" 
  Get-Content .env.local | Measure-Object -Line | Select-Object -ExpandProperty Lines
  Write-Host "linhas encontradas"
} else { 
  Write-Host "❌ Arquivo não encontrado" 
}

# Mac/Linux
if [ -f .env.local ]; then 
  echo "✅ Arquivo existe"
  wc -l .env.local
else 
  echo "❌ Arquivo não encontrado"
fi
```

---

## 📋 TEMPLATE COMPLETO

Copie e cole este template no seu `.env.local`:

```env
# ============================================
# CONFIGURAÇÃO SUPABASE - CRM PRECATÓRIOS
# ============================================

# URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co

# Chave pública (anon) - Pode ser exposta no cliente
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sua-anon-key-aqui

# Chave de serviço (service_role) - NUNCA exponha no cliente!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sua-service-role-key-aqui
```

**Substitua:**
- `seu-projeto-id` pelo ID real do seu projeto
- `sua-anon-key-aqui` pela chave anon completa
- `sua-service-role-key-aqui` pela chave service_role completa

---

## ⚠️ ERRO COMUM: Espaços Invisíveis

Às vezes, ao copiar e colar, espaços invisíveis são adicionados. Para evitar:

1. Copie a chave do Supabase
2. Cole em um editor de texto simples (Notepad)
3. Copie novamente do Notepad
4. Cole no `.env.local`

---

## 🆘 AINDA NÃO FUNCIONA?

Se após seguir todos os passos ainda não funcionar:

1. **Verifique o console do terminal** (não do browser) quando tentar alterar um role
2. **Copie a mensagem de erro exata** que aparece
3. **Verifique se o servidor foi reiniciado** após modificar o `.env.local`
4. **Tente criar um arquivo `.env` (sem .local)** e veja se funciona

---

## ✅ CHECKLIST FINAL

- [ ] Arquivo `.env.local` está na raiz do projeto
- [ ] Nome da variável é exatamente `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Sem espaços ao redor do `=`
- [ ] Sem aspas ao redor do valor
- [ ] É a chave **service_role** (não anon)
- [ ] Servidor foi reiniciado após modificar o arquivo
- [ ] Arquivo não está como "somente leitura"
- [ ] Chave foi copiada completa (sem quebras de linha)

---

**Se tudo estiver correto e ainda não funcionar, me avise qual erro específico está aparecendo no console!**
