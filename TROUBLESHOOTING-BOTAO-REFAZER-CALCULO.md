# 🔍 Troubleshooting: Botão "Realizar Cálculo Novamente"

## ❌ Problema: Botão Não Aparece

O botão "Realizar Cálculo Novamente" não está aparecendo na página de cálculo.

---

## 🔎 Diagnóstico

### **Passo 1: Verificar Logs no Console**

1. Abra a página de cálculo: `/calcular?id={precatorio_id}`
2. Abra o Console do navegador (F12 → Console)
3. Procure pelos logs:

```
[CALCULAR] 🔍 Verificando se há cálculo:
[CALCULAR] - valor_atualizado: ...
[CALCULAR] - valor_liquido: ...
[CALCULAR] - pdf_url: ...
[CALCULAR] - hasCalculation: ...
```

### **Passo 2: Verificar Debug Visual**

Na página, você deve ver um texto pequeno:
```
Debug: precatorioId=✓ | hasCalculation=✓ ou ✗
```

---

## 🎯 Cenários Possíveis

### **Cenário 1: hasCalculation = ✗ (Não tem cálculo)**

**Causa:** O precatório não tem valores calculados salvos

**Valores esperados:**
- `valor_atualizado`: null
- `valor_liquido`: null  
- `pdf_url`: null

**Solução:** 
- Isso é normal! O botão só aparece quando há cálculo salvo
- Faça um cálculo primeiro e salve
- Depois o botão aparecerá

---

### **Cenário 2: hasCalculation = ✓ mas botão não aparece**

**Causa:** Problema de renderização ou CSS

**Verificações:**

1. **Verificar se o botão está no DOM:**
   - Abra DevTools (F12)
   - Vá em Elements/Elementos
   - Procure por "Realizar Cálculo Novamente"
   - Se encontrar, é problema de CSS

2. **Verificar console por erros:**
   - Procure por erros em vermelho
   - Especialmente relacionados a componentes

---

### **Cenário 3: precatorioId = ✗**

**Causa:** Você não está acessando com ID na URL

**URL correta:**
```
/calcular?id=b6e79344-638a-4a18-9c51-78e28f52ac9d
```

**URL incorreta:**
```
/calcular
```

**Solução:**
- Acesse a página com o ID do precatório na URL
- Ou clique em "Calcular" de um precatório existente

---

## 🧪 Teste Rápido

### **Para Forçar o Botão Aparecer (Teste):**

1. Acesse o SQL Editor do Supabase
2. Execute este comando (substitua o ID):

```sql
UPDATE precatorios 
SET valor_atualizado = 100000
WHERE id = 'SEU-PRECATORIO-ID-AQUI';
```

3. Recarregue a página
4. O botão deve aparecer

---

## 📋 Checklist de Verificação

- [ ] Página acessada com `?id=` na URL
- [ ] Console mostra logs `[CALCULAR]`
- [ ] Debug visual mostra `precatorioId=✓`
- [ ] Debug visual mostra `hasCalculation=✓` ou `✗`
- [ ] Se `✗`, precatório não tem cálculo salvo (normal)
- [ ] Se `✓`, botão deve aparecer
- [ ] Sem erros no console

---

## 🔧 Soluções por Cenário

### **Se hasCalculation = ✗ (Esperado)**

✅ **Isso é normal!** O botão só aparece quando há cálculo.

**Para testar:**
1. Faça um cálculo completo
2. Clique em "Finalizar Cálculo" ou "Salvar"
3. Recarregue a página
4. Botão deve aparecer

---

### **Se hasCalculation = ✓ mas botão não aparece**

**Opção 1: Limpar cache**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**Opção 2: Verificar se há erro de importação**
```javascript
// No console, digite:
console.log(document.querySelector('button'))
```

Se retornar `null`, há problema de renderização.

---

### **Se precatorioId = ✗**

**Solução:** Acesse com ID na URL

**Como obter o ID:**
1. Vá em `/precatorios`
2. Clique em um precatório
3. Copie o ID da URL
4. Acesse `/calcular?id={ID_COPIADO}`

---

## 📊 Valores de Teste

Para testar rapidamente, você pode inserir valores manualmente no banco:

```sql
-- Ver precatórios sem cálculo
SELECT id, titulo, valor_atualizado, valor_liquido, pdf_url
FROM precatorios
WHERE valor_atualizado IS NULL
  AND valor_liquido IS NULL
  AND pdf_url IS NULL;

-- Adicionar valor de teste
UPDATE precatorios 
SET valor_atualizado = 100000,
    valor_liquido = 85000
WHERE id = 'SEU-ID-AQUI';
```

---

## 🎯 Resultado Esperado

Quando tudo estiver correto, você deve ver:

```
┌─────────────────────────────────────────────────┐
│ Calculadora de Precatórios                      │
│ Calculando valores para o precatório...         │
│                                                  │
│                    [🔄 Realizar Cálculo Novamente]│
│                                                  │
│ Debug: precatorioId=✓ | hasCalculation=✓        │
└─────────────────────────────────────────────────┘
```

---

## 📝 Informações para Suporte

Se o problema persistir, forneça:

1. **Logs do console:**
   ```
   [CALCULAR] 🔍 Verificando se há cálculo:
   [CALCULAR] - valor_atualizado: ...
   [CALCULAR] - valor_liquido: ...
   [CALCULAR] - pdf_url: ...
   [CALCULAR] - hasCalculation: ...
   ```

2. **Debug visual:**
   ```
   Debug: precatorioId=? | hasCalculation=?
   ```

3. **URL acessada:**
   ```
   /calcular?id=...
   ```

4. **Erros no console** (se houver)

---

## ✅ Conclusão

O botão "Realizar Cálculo Novamente" só aparece quando:
1. ✅ Há um `precatorioId` na URL
2. ✅ O precatório tem valores calculados OU PDF anexado

Se ambas condições forem verdadeiras e o botão não aparecer, há um problema técnico que precisa ser investigado com os logs acima.

---

**Data:** 2024  
**Documentado por:** BLACKBOX AI  
**Status:** 🔍 **GUIA DE TROUBLESHOOTING**
