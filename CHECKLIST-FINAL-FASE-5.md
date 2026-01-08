# ✅ CHECKLIST FINAL - CONFIGURAR FASE 5

## 📝 PASSO A PASSO

### **1. Adicionar API Key do Gemini no .env.local** ✅ VOCÊ ESTÁ AQUI

Você já abriu o arquivo `.env.local`. Agora:

1. **Vá até o final do arquivo**
2. **Adicione estas linhas:**

```env

# ============================================
# GOOGLE GEMINI API - Extração de IA
# ============================================
GOOGLE_GEMINI_API_KEY=sua-chave-aqui
```

3. **Substitua `sua-chave-aqui`** pela API key que você criou
4. **Salve o arquivo** (Ctrl+S)

**Exemplo de como deve ficar:**
```env
# Supabase (já existe)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API - Extração de IA (ADICIONAR)
GOOGLE_GEMINI_API_KEY=AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### **2. Executar Scripts SQL no Supabase**

#### **Script 49 - Tabela de Documentos** (se ainda não executou)

1. Abra o Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em "SQL Editor" na sidebar
4. Clique em "New query"
5. Copie TODO o conteúdo de: `scripts/49-tabela-documentos.sql`
6. Cole no editor
7. Clique em "Run" (ou Ctrl+Enter)
8. Aguarde: "Success. No rows returned"

#### **Script 68 - Tabelas de Extração IA** (CORRIGIDO!)

1. No SQL Editor, clique em "New query"
2. Copie TODO o conteúdo de: `scripts/68-tabelas-extracao-ia.sql`
3. Cole no editor
4. Clique em "Run" (ou Ctrl+Enter)
5. Aguarde: "Success. No rows returned"

#### **Script 67 - Correção Filtro de Valores** (OPCIONAL)

1. No SQL Editor, clique em "New query"
2. Copie TODO o conteúdo de: `scripts/67-fix-filtro-valores-zero.sql`
3. Cole no editor
4. Clique em "Run" (ou Ctrl+Enter)
5. Aguarde: "Success. No rows returned"

---

### **3. Testar a API Key do Gemini** (OPCIONAL mas recomendado)

1. **Crie o arquivo `test-gemini.js` na raiz do projeto:**

```javascript
// test-gemini.js
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.GOOGLE_GEMINI_API_KEY

if (!apiKey) {
  console.error('❌ API Key não encontrada!')
  console.log('Verifique se adicionou GOOGLE_GEMINI_API_KEY no .env.local')
  process.exit(1)
}

console.log('✅ API Key encontrada!')
console.log('Primeiros caracteres:', apiKey.substring(0, 10) + '...')

async function testarGemini() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Responda apenas: OK' }]
          }]
        })
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Conexão com Gemini funcionando!')
      console.log('Resposta:', data.candidates[0].content.parts[0].text)
    } else {
      console.error('❌ Erro na API:', response.status)
      const error = await response.text()
      console.error('Detalhes:', error)
    }
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

testarGemini()
```

2. **Execute no terminal:**

```bash
node test-gemini.js
```

3. **Resultado esperado:**
```
✅ API Key encontrada!
Primeiros caracteres: AIzaSyD-xx...
✅ Conexão com Gemini funcionando!
Resposta: OK
```

---

### **4. Instalar SDK do Gemini** (OPCIONAL)

Se quiser usar o SDK oficial (recomendado):

```bash
npm install @google/generative-ai
```

Ou pode usar fetch direto (mais leve, já incluído no Next.js).

---

## ✅ VERIFICAÇÃO FINAL

Marque conforme for completando:

- [ ] API Key do Gemini adicionada no `.env.local`
- [ ] Arquivo `.env.local` salvo
- [ ] Script 49 executado no Supabase (tabela `documentos_precatorio` criada)
- [ ] Script 68 executado no Supabase (tabelas `precatorio_extracoes` e `precatorio_extracao_campos` criadas)
- [ ] Script 67 executado no Supabase (opcional - correção de filtros)
- [ ] Teste da API Key executado (opcional)

---

## 🚀 DEPOIS DE COMPLETAR

**Me avise quando terminar e vou criar:**

1. **API Routes** - Rotas para processar documentos
2. **Integração Gemini** - Código para chamar a IA
3. **Componentes React** - Interface visual
4. **Sistema de Revisão** - Painel para revisar campos extraídos
5. **Aplicação Automática** - Atualizar card do precatório

---

## 🆘 PROBLEMAS COMUNS

### **Erro: API key not valid**
- Verifique se copiou a key completa (começa com `AIza`)
- Confirme que a API está habilitada no Google Cloud Console
- Aguarde alguns minutos após criar a key

### **Erro: relation does not exist (no script 68)**
- Execute primeiro o script 49
- Aguarde alguns segundos
- Execute o script 68 novamente

### **Erro: 429 Too Many Requests**
- Você atingiu o limite (60 req/min)
- Aguarde 1 minuto e tente novamente

---

## 📚 DOCUMENTAÇÃO

- `GUIA-CONFIGURAR-GEMINI-API.md` - Guia completo
- `FASE-5-IA-EXTRACAO-DOCUMENTOS.md` - Especificação técnica
- `FASE-5-PROGRESSO-INICIAL.md` - Status e próximos passos

---

**Boa sorte! Me avise quando terminar! 🎉**
