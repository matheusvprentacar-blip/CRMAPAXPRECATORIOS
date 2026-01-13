# 🔍 Instruções para Testar Envio para Cálculo

## 🎯 Objetivo

Testar a funcionalidade de enviar precatório para cálculo no Kanban e capturar logs detalhados para identificar o erro.

---

## 📋 Pré-requisitos

### **1. Scripts SQL Executados**
⚠️ **IMPORTANTE:** Antes de testar, execute estes scripts no Supabase:

#### **Script 73:** `scripts/73-fix-delete-precatorio-rpc.sql`
- Corrige função RPC para deletar precatórios

#### **Script 74:** `scripts/74-fix-atividades-tipo-check.sql` ⭐ **CRÍTICO**
- Corrige constraint `atividades_tipo_check`
- **Este script é essencial para o teste funcionar**

---

## 🚀 Como Testar

### **Passo 1: Abrir o Console do Navegador**
1. Pressione `F12` no navegador
2. Vá na aba "Console"
3. Limpe o console (botão 🚫 ou Ctrl+L)

### **Passo 2: Acessar o Kanban**
1. Acesse `http://localhost:3000/kanban`
2. Aguarde carregar os precatórios

### **Passo 3: Arrastar Precatório**
1. Arraste um precatório para a coluna "Em Cálculo"
2. Um modal aparecerá pedindo para selecionar o operador

### **Passo 4: Selecionar Operador**
1. Selecione um operador de cálculo no dropdown
2. Clique em "Confirmar"

### **Passo 5: Observar os Logs**
Você verá logs detalhados no console:

```
📤 [DEBUG] confirmarEnvioParaCalculo - Iniciando
📤 [DEBUG] Precatório ID: abc-123-def
📤 [DEBUG] Operador de cálculo ID: xyz-789-ghi
📤 [DEBUG] Supabase disponível: true
📤 [DEBUG] Dados para atualizar: {...}
📤 [DEBUG] Resposta Supabase:
  - Data: [...]
  - Error: null
✅ [DEBUG] Precatório enviado para cálculo com sucesso: [...]
📤 [DEBUG] confirmarEnvioParaCalculo - Finalizado
```

---

## ✅ Cenário de Sucesso

### **Logs Esperados:**
```
📤 [DEBUG] confirmarEnvioParaCalculo - Iniciando
📤 [DEBUG] Precatório ID: b6e79344-638a-4a18-9c51-78e28f52ac9d
📤 [DEBUG] Operador de cálculo ID: 375848c6-a419-4ea8-af6f-1df5b36e8855
📤 [DEBUG] Supabase disponível: true
📤 [DEBUG] Dados para atualizar: {
  status: "em_calculo",
  responsavel_calculo_id: "375848c6-a419-4ea8-af6f-1df5b36e8855",
  operador_calculo: "375848c6-a419-4ea8-af6f-1df5b36e8855",
  updated_at: "2024-01-09T14:30:00.000Z"
}
📤 [DEBUG] Resposta Supabase:
  - Data: [{id: "...", status: "em_calculo", responsavel_calculo_id: "..."}]
  - Error: null
✅ [DEBUG] Precatório enviado para cálculo com sucesso: [...]
📤 [DEBUG] confirmarEnvioParaCalculo - Finalizado
```

### **Resultado Visual:**
- ✅ Toast verde: "Enviado para cálculo"
- ✅ Precatório move para coluna "Em Cálculo"
- ✅ Modal fecha automaticamente

---

## ❌ Cenário de Erro

### **Logs de Erro (Antes do Script 74):**
```
📤 [DEBUG] confirmarEnvioParaCalculo - Iniciando
📤 [DEBUG] Precatório ID: b6e79344-638a-4a18-9c51-78e28f52ac9d
📤 [DEBUG] Operador de cálculo ID: 375848c6-a419-4ea8-af6f-1df5b36e8855
📤 [DEBUG] Supabase disponível: true
📤 [DEBUG] Dados para atualizar: {...}
📤 [DEBUG] Resposta Supabase:
  - Data: null
  - Error: {
      message: "new row for relation \"atividades\" violates check constraint \"atividades_tipo_check\"",
      details: "Failing row contains (...)",
      hint: null,
      code: "23514"
    }
❌ [DEBUG] Erro detalhado ao enviar para cálculo: {
  message: "new row for relation \"atividades\" violates check constraint \"atividades_tipo_check\"",
  details: "Failing row contains (...)",
  hint: null,
  code: "23514"
}
```

### **Resultado Visual:**
- ❌ Toast vermelho: "new row for relation \"atividades\" violates check constraint..."
- ❌ Precatório NÃO move de coluna
- ❌ Modal permanece aberto

---

## 🔧 Solução para o Erro

### **Se você ver o erro acima:**

1. **Execute o Script 74 no Supabase:**
   ```sql
   -- Copie e cole o conteúdo de:
   scripts/74-fix-atividades-tipo-check.sql
   ```

2. **Aguarde confirmação de sucesso**

3. **Recarregue a página** (Ctrl+F5)

4. **Teste novamente** seguindo os passos acima

---

## 📊 Informações a Enviar

### **Se o erro persistir, copie e envie:**

1. **Todos os logs do console** (Ctrl+A, Ctrl+C)
2. **Screenshot do erro** (se houver)
3. **Confirmação de que executou o script 74**

### **Exemplo de logs completos:**
```
📤 [DEBUG] confirmarEnvioParaCalculo - Iniciando
📤 [DEBUG] Precatório ID: ...
📤 [DEBUG] Operador de cálculo ID: ...
📤 [DEBUG] Supabase disponível: true
📤 [DEBUG] Dados para atualizar: {...}
📤 [DEBUG] Resposta Supabase:
  - Data: ...
  - Error: ...
❌ [DEBUG] Erro detalhado ao enviar para cálculo: {...}
```

---

## 🎯 Checklist de Teste

- [ ] Console do navegador aberto (F12)
- [ ] Script 74 executado no Supabase
- [ ] Página recarregada (Ctrl+F5)
- [ ] Kanban carregado com precatórios
- [ ] Precatório arrastado para "Em Cálculo"
- [ ] Operador selecionado no modal
- [ ] Botão "Confirmar" clicado
- [ ] Logs capturados no console
- [ ] Resultado observado (sucesso ou erro)

---

## 📚 Documentação Relacionada

- **LOGS-DEBUG-ADICIONADOS.md** - Guia completo dos logs
- **scripts/74-fix-atividades-tipo-check.sql** - Script de correção
- **TROUBLESHOOTING-SERVICE-ROLE-KEY.md** - Troubleshooting geral

---

## ✅ Resultado Esperado Final

Após executar o script 74 e testar:

```
✅ Precatório enviado para cálculo com sucesso
✅ Precatório aparece na coluna "Em Cálculo"
✅ Operador de cálculo atribuído corretamente
✅ Sem erros no console
```

---

**Data:** 2024  
**Criado por:** BLACKBOX AI  
**Status:** ✅ **PRONTO PARA TESTE**
