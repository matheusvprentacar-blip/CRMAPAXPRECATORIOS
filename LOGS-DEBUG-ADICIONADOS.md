# 🔍 Logs de Debug Adicionados

## 📋 Resumo

Foram adicionados logs detalhados de debug em pontos estratégicos do código para facilitar a identificação e correção de erros.

---

## 📁 Arquivos Modificados

### 1. `hooks/use-precatorios-search.ts`

**Função:** `buscar()`

**Logs Adicionados:**

```typescript
🔍 [DEBUG] usePrecatoriosSearch - Iniciando busca
🔍 [DEBUG] Supabase disponível: true/false
🔍 [DEBUG] Filtros originais: {...}
🔍 [DEBUG] Termo debounced: "..."
🔍 [DEBUG] Parâmetros RPC: {...}
🔍 [DEBUG] Resposta RPC:
  - Data: X resultados / null
  - Error: {...}
❌ [DEBUG] Erro RPC detalhado: {message, details, hint, code}
✅ [DEBUG] Busca concluída com sucesso: X resultados
🔍 [DEBUG] Busca finalizada (loading = false)
```

**O que captura:**
- ✅ Disponibilidade do Supabase
- ✅ Filtros aplicados
- ✅ Parâmetros enviados para RPC
- ✅ Resposta completa da RPC
- ✅ Erros detalhados (message, details, hint, code)
- ✅ Quantidade de resultados

---

### 2. `app/(dashboard)/precatorios/page.tsx`

#### **Função:** `loadUserInfo()`

**Logs Adicionados:**

```typescript
👤 [DEBUG] loadUserInfo - Iniciando
👤 [DEBUG] Supabase disponível: true/false
👤 [DEBUG] Usuário autenticado: uuid / null
👤 [DEBUG] Perfil carregado: {...}
❌ [DEBUG] Erro ao carregar usuário: {...}
```

**O que captura:**
- ✅ Disponibilidade do Supabase
- ✅ ID do usuário autenticado
- ✅ Dados do perfil carregado
- ✅ Erros ao carregar usuário

---

#### **Função:** `handleEnviarParaCalculo()`

**Logs Adicionados:**

```typescript
📤 [DEBUG] handleEnviarParaCalculo - Iniciando
📤 [DEBUG] Precatório selecionado: uuid
📤 [DEBUG] Operador de cálculo: uuid
⚠️ [DEBUG] Faltam dados obrigatórios
📤 [DEBUG] Supabase disponível: true/false
📤 [DEBUG] Atualizando precatório...
❌ [DEBUG] Erro ao atualizar precatório: {message, details, hint, code}
✅ [DEBUG] Precatório atualizado com sucesso
📤 [DEBUG] Operador encontrado: "Nome"
📤 [DEBUG] Inserindo atividade...
✅ [DEBUG] Atividade registrada
❌ [DEBUG] Erro ao enviar para cálculo: {...}
📤 [DEBUG] handleEnviarParaCalculo - Finalizado
```

**O que captura:**
- ✅ IDs do precatório e operador
- ✅ Validação de dados obrigatórios
- ✅ Disponibilidade do Supabase
- ✅ Sucesso/erro ao atualizar precatório
- ✅ Erros detalhados do Supabase
- ✅ Registro de atividade

---

#### **Função:** `handleDeletePrecatorio()`

**Logs Adicionados:**

```typescript
🗑️ [DEBUG] handleDeletePrecatorio - Iniciando
🗑️ [DEBUG] Precatório a deletar: uuid
🗑️ [DEBUG] Supabase disponível: true/false
🗑️ [DEBUG] Chamando RPC delete_precatorio com ID: uuid
🗑️ [DEBUG] Resposta RPC delete_precatorio:
  - Data: {...}
  - Error: {...}
❌ [DEBUG] Erro RPC delete_precatorio: {message, details, hint, code}
✅ [DEBUG] Precatório deletado com sucesso
❌ [DEBUG] Erro ao excluir precatório: {...}
🗑️ [DEBUG] handleDeletePrecatorio - Finalizado
```

**O que captura:**
- ✅ ID do precatório a deletar
- ✅ Disponibilidade do Supabase
- ✅ Chamada da RPC
- ✅ Resposta completa (data + error)
- ✅ Erros detalhados do Supabase
- ✅ Sucesso/falha da operação

---

## 🎯 Como Usar os Logs

### **1. Abrir o Console do Navegador**

Pressione `F12` ou:
- Chrome/Edge: `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Firefox: `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)

### **2. Ir para a aba "Console"**

### **3. Reproduzir o Erro**

Execute a ação que está causando o erro (buscar, deletar, enviar para cálculo, etc.)

### **4. Copiar os Logs**

Copie **TODOS** os logs que aparecem no console, especialmente:
- ❌ Logs com erro (em vermelho)
- 🔍 Logs de DEBUG
- ⚠️ Logs de warning

### **5. Enviar para Análise**

Cole os logs aqui para eu analisar e identificar o problema exato.

---

## 📊 Tipos de Logs

| Emoji | Tipo | Descrição |
|-------|------|-----------|
| 🔍 | INFO | Informação geral sobre o fluxo |
| ✅ | SUCCESS | Operação concluída com sucesso |
| ❌ | ERROR | Erro ocorrido |
| ⚠️ | WARNING | Aviso sobre algo inesperado |
| 👤 | USER | Relacionado a autenticação/usuário |
| 📤 | SEND | Envio de dados |
| 🗑️ | DELETE | Exclusão de dados |

---

## 🔧 Informações Capturadas

### **Erros do Supabase:**
```javascript
{
  message: "Mensagem do erro",
  details: "Detalhes técnicos",
  hint: "Dica para resolver",
  code: "Código do erro"
}
```

### **Parâmetros RPC:**
```javascript
{
  p_termo: "texto de busca",
  p_status: ["novo", "em_contato"],
  p_valor_min: 10000,
  p_valor_max: 50000,
  // ... outros filtros
}
```

### **Dados do Usuário:**
```javascript
{
  id: "uuid-do-usuario",
  role: "admin" | "operador_comercial" | "operador_calculo",
  nome: "Nome do Usuário"
}
```

---

## ✅ Próximos Passos

1. **Recarregue a página** (Ctrl+F5)
2. **Abra o Console** (F12)
3. **Reproduza o erro**
4. **Copie TODOS os logs** do console
5. **Envie aqui** para análise

---

## 📝 Exemplo de Logs Esperados

### **Busca de Precatórios (Sucesso):**
```
🔍 [DEBUG] usePrecatoriosSearch - Iniciando busca
🔍 [DEBUG] Supabase disponível: true
🔍 [DEBUG] Filtros originais: {}
🔍 [DEBUG] Termo debounced: undefined
🔍 [DEBUG] Parâmetros RPC: {"p_termo":null,"p_status":null,...}
🔍 [DEBUG] Resposta RPC:
  - Data: 5 resultados
  - Error: null
✅ [DEBUG] Busca concluída com sucesso: 5 resultados
🔍 [DEBUG] Busca finalizada (loading = false)
```

### **Deletar Precatório (Erro):**
```
🗑️ [DEBUG] handleDeletePrecatorio - Iniciando
🗑️ [DEBUG] Precatório a deletar: abc-123-def
🗑️ [DEBUG] Supabase disponível: true
🗑️ [DEBUG] Chamando RPC delete_precatorio com ID: abc-123-def
🗑️ [DEBUG] Resposta RPC delete_precatorio:
  - Data: null
  - Error: {message: "function delete_precatorio does not exist"}
❌ [DEBUG] Erro RPC delete_precatorio: {
  message: "function delete_precatorio does not exist",
  details: null,
  hint: "No function matches the given name...",
  code: "42883"
}
❌ [DEBUG] Erro ao excluir precatório: Error: function delete_precatorio does not exist
🗑️ [DEBUG] handleDeletePrecatorio - Finalizado
```

---

## 🎯 Benefícios

✅ **Identificação Rápida:** Logs detalhados em cada etapa  
✅ **Erros Completos:** Captura message, details, hint e code  
✅ **Rastreamento:** Início e fim de cada operação  
✅ **Debugging Fácil:** Emojis facilitam identificação visual  
✅ **Dados Completos:** Parâmetros, respostas e estados capturados  

---

**Data:** 2024  
**Implementado por:** BLACKBOX AI  
**Status:** ✅ **LOGS ATIVOS - PRONTO PARA DEBUG**
