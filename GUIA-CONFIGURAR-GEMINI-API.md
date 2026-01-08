# 🔑 Guia: Configurar Google Gemini API Key

## ✅ Você já tem a API Key! Agora vamos configurá-la:

---

## 📝 PASSO 1: Adicionar no .env.local

1. **Abra o arquivo `.env.local`** na raiz do projeto
2. **Adicione esta linha no final do arquivo:**

```env
# Google Gemini API para Extração de IA
GOOGLE_GEMINI_API_KEY=sua-chave-aqui
```

3. **Substitua `sua-chave-aqui`** pela API key que você criou
4. **Salve o arquivo**

### **Exemplo completo do .env.local:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API para Extração de IA
GOOGLE_GEMINI_API_KEY=AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔒 SEGURANÇA IMPORTANTE

### ⚠️ **NUNCA faça commit da API key!**

O arquivo `.env.local` já está no `.gitignore`, mas verifique:

1. **Abra `.gitignore`**
2. **Confirme que tem estas linhas:**
   ```
   .env*.local
   .env
   ```

3. **Se não tiver, adicione!**

### ✅ **Boas práticas:**
- ✅ Use `.env.local` para desenvolvimento
- ✅ Use variáveis de ambiente no servidor de produção
- ✅ Nunca compartilhe a API key publicamente
- ✅ Rotacione a key se suspeitar de vazamento

---

## 🧪 PASSO 2: Testar a Configuração

Depois de adicionar a API key, vamos testar se está funcionando.

### **Criar arquivo de teste:**

Crie o arquivo `test-gemini.js` na raiz do projeto:

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
console.log('Tamanho:', apiKey.length, 'caracteres')

// Teste simples de conexão
async function testarGemini() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Olá! Responda apenas: OK' }]
          }]
        })
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Conexão com Gemini funcionando!')
      console.log('Resposta:', data.candidates[0].content.parts[0].text)
    } else {
      console.error('❌ Erro na API:', response.status, response.statusText)
      const error = await response.text()
      console.error('Detalhes:', error)
    }
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message)
  }
}

testarGemini()
```

### **Executar o teste:**

```bash
node test-gemini.js
```

### **Resultado esperado:**
```
✅ API Key encontrada!
Primeiros caracteres: AIzaSyD-xx...
Tamanho: 39 caracteres
✅ Conexão com Gemini funcionando!
Resposta: OK
```

---

## 📦 PASSO 3: Instalar Dependências

Para usar o Gemini no projeto, instale o SDK oficial:

```bash
npm install @google/generative-ai
```

Ou se preferir usar fetch direto (mais leve):

```bash
# Não precisa instalar nada, Next.js já tem fetch
```

---

## 🚀 PRÓXIMOS PASSOS

Depois de configurar a API key:

1. ✅ **Executar scripts SQL** (49 e 68)
2. ✅ **Testar a API key** (test-gemini.js)
3. 🔄 **Criar API routes** (próxima etapa)
4. 🔄 **Criar componentes React** (próxima etapa)
5. 🔄 **Testar com documentos reais** (próxima etapa)

---

## 💰 MONITORAR USO

Para acompanhar o uso da API:

1. **Acesse:** https://console.cloud.google.com/apis/dashboard
2. **Selecione seu projeto**
3. **Veja:** Generative Language API
4. **Monitore:** Requisições e custos

### **Limites do tier gratuito:**
- **60 requisições por minuto**
- **1.500 requisições por dia**
- **1 milhão de tokens por mês**

Para precatórios, isso é mais que suficiente! 🎉

---

## 🆘 PROBLEMAS COMUNS

### **Erro: API key not valid**
- Verifique se copiou a key completa
- Confirme que a API está habilitada no Google Cloud Console
- Aguarde alguns minutos após criar a key

### **Erro: 429 Too Many Requests**
- Você atingiu o limite de requisições
- Aguarde 1 minuto e tente novamente
- Considere implementar rate limiting

### **Erro: 403 Forbidden**
- A API Generative Language não está habilitada
- Acesse: https://console.cloud.google.com/apis/library
- Busque: "Generative Language API"
- Clique em "Enable"

---

## 📚 RECURSOS ÚTEIS

- **Documentação:** https://ai.google.dev/docs
- **Pricing:** https://ai.google.dev/pricing
- **Playground:** https://makersuite.google.com/
- **Exemplos:** https://github.com/google/generative-ai-js

---

**Pronto! Agora você está configurado para usar IA! 🎉**

**Me avise quando terminar e vamos para a próxima etapa!**
