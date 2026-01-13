# 📋 Regras de Edição de Valores do Precatório

## 🎯 Regra de Negócio

### **Valores que QUALQUER USUÁRIO pode editar:**
- ✅ **valor_principal** - Valor base do precatório

### **Valores que APENAS operador_calculo ou admin podem editar:**
- 🔒 **valor_atualizado** - Valor após atualização monetária
- 🔒 **valor_juros** - Valor dos juros calculados
- 🔒 **valor_multa** (Valor Selic) - Valor da multa/Selic
- 🔒 **valor_honorarios** - Valor dos honorários
- 🔒 **valor_irpf** - Valor do IRPF
- 🔒 **valor_pss** - Valor do PSS
- 🔒 **valor_liquido** - Valor líquido final
- 🔒 Todos os campos de **propostas** (menor/maior valor e percentuais)

---

## 📊 Cenários de Uso

### **Cenário 1: Importação JSON sem Valores**
```json
{
  "titulo": "Precatório Importado",
  "credor_nome": "João Silva",
  "numero_processo": "123456",
  "valor_principal": null  // ← Pode ser null na importação
}
```

**Comportamento:**
- ✅ Importação aceita mesmo sem `valor_principal`
- ✅ Qualquer usuário pode editar e adicionar `valor_principal` depois
- 🔒 Valores calculados (atualizado, juros, etc.) só podem ser preenchidos por operador_calculo/admin

---

### **Cenário 2: Edição por Operador Comercial**
**Pode editar:**
- ✅ `valor_principal`
- ✅ Dados básicos (credor, processo, tribunal, etc.)
- ✅ Status e responsável

**NÃO pode editar:**
- ❌ `valor_atualizado`
- ❌ `valor_juros`
- ❌ `valor_multa` (Valor Selic)
- ❌ Valores de propostas

---

### **Cenário 3: Cálculo pelo Operador de Cálculo**
**Pode editar:**
- ✅ TODOS os campos de valores
- ✅ `valor_principal` (se necessário corrigir)
- ✅ `valor_atualizado`
- ✅ `valor_juros`
- ✅ `valor_multa` (Valor Selic)
- ✅ `valor_honorarios`
- ✅ `valor_irpf`
- ✅ `valor_pss`
- ✅ `valor_liquido`
- ✅ Propostas (menor/maior)

---

## 🔐 Implementação de Permissões

### **No Frontend:**

```typescript
// Verificar se usuário pode editar valores calculados
const canEditCalculatedValues = (userRole: string) => {
  return userRole === 'admin' || userRole === 'operador_calculo'
}

// Exemplo de uso:
{canEditCalculatedValues(userRole) ? (
  <Input 
    name="valor_atualizado" 
    value={valorAtualizado}
    onChange={handleChange}
  />
) : (
  <span>{formatCurrency(valorAtualizado)}</span>
)}
```

### **No Backend (RLS - Row Level Security):**

```sql
-- Policy para UPDATE de valores calculados
CREATE POLICY "Apenas operador_calculo e admin podem atualizar valores calculados"
ON precatorios
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM usuarios 
    WHERE role IN ('admin', 'operador_calculo')
  )
)
WITH CHECK (
  -- Permite atualizar apenas se for admin ou operador_calculo
  auth.uid() IN (
    SELECT id FROM usuarios 
    WHERE role IN ('admin', 'operador_calculo')
  )
);
```

---

## 📝 Campos por Categoria

### **Categoria 1: Editável por TODOS**
```typescript
const camposEditaveisPorTodos = [
  'valor_principal',
  'titulo',
  'credor_nome',
  'credor_cpf',
  'numero_processo',
  'numero_precatorio',
  'tribunal',
  'vara',
  'natureza',
  // ... outros campos básicos
]
```

### **Categoria 2: Editável APENAS por operador_calculo/admin**
```typescript
const camposRestritosCalculo = [
  'valor_atualizado',
  'valor_juros',
  'valor_multa',
  'valor_honorarios',
  'valor_irpf',
  'valor_pss',
  'valor_liquido',
  'proposta_menor_valor',
  'proposta_menor_percentual',
  'proposta_maior_valor',
  'proposta_maior_percentual',
  'data_calculo',
  'indice_atualizacao',
  // ... outros campos de cálculo
]
```

---

## 🎯 Fluxo Completo

### **1. Importação (Qualquer Usuário)**
```
Importar JSON → valor_principal pode ser null
```

### **2. Preenchimento Inicial (Operador Comercial)**
```
Editar precatório → Adicionar valor_principal
```

### **3. Envio para Cálculo (Operador Comercial)**
```
Enviar p/ Cálculo → Atribuir operador_calculo
```

### **4. Cálculo (Operador de Cálculo)**
```
Calcular → Preencher todos os valores calculados
         → valor_atualizado, juros, multa, etc.
```

### **5. Propostas (Operador de Cálculo/Admin)**
```
Adicionar Propostas → proposta_menor_valor
                    → proposta_maior_valor
```

---

## ⚠️ Validações Importantes

### **No Frontend:**
```typescript
// Validar antes de salvar
if (!canEditCalculatedValues(userRole)) {
  // Remover campos restritos do payload
  const { 
    valor_atualizado, 
    valor_juros, 
    valor_multa,
    ...dadosPermitidos 
  } = formData
  
  // Enviar apenas dados permitidos
  await updatePrecatorio(dadosPermitidos)
}
```

### **No Backend:**
```typescript
// API Route - Validar permissões
if (!['admin', 'operador_calculo'].includes(userRole)) {
  // Bloquear atualização de campos restritos
  const restrictedFields = [
    'valor_atualizado',
    'valor_juros',
    'valor_multa',
    // ...
  ]
  
  const hasRestrictedFields = Object.keys(updateData)
    .some(key => restrictedFields.includes(key))
  
  if (hasRestrictedFields) {
    return res.status(403).json({ 
      error: 'Sem permissão para editar valores calculados' 
    })
  }
}
```

---

## 📊 Matriz de Permissões

| Campo | Operador Comercial | Operador Cálculo | Admin |
|-------|-------------------|------------------|-------|
| valor_principal | ✅ | ✅ | ✅ |
| valor_atualizado | ❌ | ✅ | ✅ |
| valor_juros | ❌ | ✅ | ✅ |
| valor_multa (Selic) | ❌ | ✅ | ✅ |
| valor_honorarios | ❌ | ✅ | ✅ |
| valor_irpf | ❌ | ✅ | ✅ |
| valor_pss | ❌ | ✅ | ✅ |
| valor_liquido | ❌ | ✅ | ✅ |
| propostas | ❌ | ✅ | ✅ |
| dados_basicos | ✅ | ✅ | ✅ |

---

## ✅ Benefícios desta Regra

1. **Segurança:** Apenas quem sabe calcular pode alterar valores calculados
2. **Rastreabilidade:** Fica claro quem calculou os valores
3. **Flexibilidade:** Operador comercial pode corrigir valor_principal
4. **Integridade:** Valores calculados não são alterados acidentalmente
5. **Workflow:** Respeita o fluxo: comercial → cálculo → propostas

---

## 📝 Notas Importantes

- ⚠️ `valor_principal` pode ser `null` na importação
- ✅ Qualquer usuário pode preencher `valor_principal` depois
- 🔒 Valores calculados são protegidos por role
- 📊 Propostas só podem ser criadas por operador_calculo/admin
- 🎯 Esta regra garante a integridade dos cálculos

---

**Data:** 2024  
**Documentado por:** BLACKBOX AI  
**Status:** ✅ **REGRA DE NEGÓCIO DOCUMENTADA**
