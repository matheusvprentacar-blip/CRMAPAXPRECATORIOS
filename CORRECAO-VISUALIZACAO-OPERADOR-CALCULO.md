# Correção: Visualização do Operador de Cálculo

## 🎯 Problema Identificado

O operador de cálculo estava vendo precatórios que não deveria:

### **Situação Incorreta:**
- **Aba "Fila de Cálculo" (`/calculo`):** Mostrava TODOS os precatórios em cálculo
- **Aba "Precatórios" (`/precatorios`):** Mostrava precatórios com status `em_calculo`

### **Comportamento Esperado:**
- **Aba "Fila de Cálculo":** Mostrar APENAS precatórios atribuídos ao operador
- **Aba "Precatórios":** Mostrar apenas precatórios próprios (onde é responsável comercial) EXCLUINDO os que estão em cálculo

---

## ✅ Correções Aplicadas

### **1. Página `/calculo` (Fila de Cálculo)**

**Arquivo:** `app/(dashboard)/calculo/page.tsx`

**Antes:**
```typescript
// Buscar TODOS os precatórios em cálculo
const { data, error } = await supabase
  .from("precatorios_cards")
  .select(...)
  .eq("status", "em_calculo")
```

**Depois:**
```typescript
// Buscar perfil do usuário
const { data: profile } = await supabase
  .from("usuarios")
  .select("role")
  .eq("id", user.id)
  .single()

// Criar query base
let query = supabase
  .from("precatorios_cards")
  .select(...)
  .eq("status", "em_calculo")

// Se for operador de cálculo, filtrar apenas os atribuídos a ele
if (profile?.role === "operador_calculo") {
  query = query.eq("responsavel_calculo_id", user.id)
}

const { data, error } = await query
  .order("urgente", { ascending: false })
  .order("created_at", { ascending: true })
```

**Resultado:**
- ✅ Admin/Comercial: Vê todos os precatórios em cálculo
- ✅ Operador de Cálculo: Vê apenas os atribuídos a ele

---

### **2. Página `/precatorios` (Precatórios Próprios)**

**Arquivo:** `app/(dashboard)/precatorios/page.tsx`

**Antes:**
```typescript
const {
  filtros,
  ...
} = usePrecatoriosSearch()
```

**Depois:**
```typescript
const {
  filtros,
  ...
  resultados: precatoriosRaw,
  ...
} = usePrecatoriosSearch()

// Filtrar precatórios em cálculo para operador de cálculo
const precatorios = userRole === "operador_calculo" 
  ? precatoriosRaw.filter(p => p.status !== "em_calculo")
  : precatoriosRaw
```

**Resultado:**
- ✅ Admin/Comercial: Vê todos os precatórios
- ✅ Operador de Cálculo: Vê apenas precatórios próprios EXCLUINDO os em cálculo

---

## 📋 Regras de Visualização

### **Operador de Cálculo:**

#### **Aba "Fila de Cálculo" (`/calculo`):**
- ✅ Vê precatórios com `status = 'em_calculo'`
- ✅ Filtrados por `responsavel_calculo_id = user.id`
- ✅ Ordenados por urgência e FIFO

#### **Aba "Precatórios" (`/precatorios`):**
- ✅ Vê precatórios onde `responsavel = user.id` (responsável comercial)
- ✅ EXCLUI precatórios com `status = 'em_calculo'`
- ✅ Pode ver precatórios em outros status (novo, em_contato, etc.)

### **Fluxo Completo:**

1. **Precatório criado** → Status: `novo`
   - Operador de cálculo: NÃO vê (ainda não é responsável)

2. **Atribuído ao operador de cálculo como comercial** → Status: `em_contato`
   - Operador de cálculo: Vê na aba "Precatórios"

3. **Enviado para cálculo** → Status: `em_calculo`
   - Operador de cálculo: Vê na aba "Fila de Cálculo"
   - Operador de cálculo: NÃO vê mais na aba "Precatórios"

4. **Cálculo realizado** → Status: `calculado` ou outro
   - Operador de cálculo: NÃO vê mais (cálculo concluído)

5. **Refazer cálculo** → Status volta para `em_calculo`
   - Operador de cálculo: Volta a ver na "Fila de Cálculo"

---

## 🧪 Como Testar

### **Teste 1: Fila de Cálculo**
1. Login como operador de cálculo
2. Ir para `/calculo`
3. Verificar que mostra apenas precatórios atribuídos a ele
4. Verificar logs no console:
   ```
   [FILA CALCULO] Role do usuário: operador_calculo
   [FILA CALCULO] Filtrando apenas precatórios atribuídos ao operador
   ```

### **Teste 2: Precatórios Próprios**
1. Login como operador de cálculo
2. Ir para `/precatorios`
3. Verificar que NÃO mostra precatórios em cálculo
4. Verificar logs no console:
   ```
   👤 [DEBUG] Operador de cálculo: excluindo status 'em_calculo'
   ```

### **Teste 3: Fluxo Completo**
1. Criar precatório como admin
2. Atribuir ao operador de cálculo como comercial
3. Login como operador de cálculo
4. Verificar que vê na aba "Precatórios"
5. Enviar para cálculo
6. Verificar que sumiu da aba "Precatórios"
7. Verificar que apareceu na aba "Fila de Cálculo"

---

## 📊 Logs de Debug

### **Fila de Cálculo:**
```
[FILA CALCULO] Carregando fila para usuário: {user_id}
[FILA CALCULO] Role do usuário: operador_calculo
[FILA CALCULO] Filtrando apenas precatórios atribuídos ao operador
[FILA CALCULO] Carregados: X precatórios
```

### **Precatórios:**
```
👤 [DEBUG] loadUserInfo - Iniciando
👤 [DEBUG] Perfil carregado: {role: "operador_calculo"}
👤 [DEBUG] Operador de cálculo: excluindo status 'em_calculo'
```

---

## ✅ Resultado Final

**Operador de Cálculo agora tem acesso correto:**
- ✅ Vê apenas seus precatórios na fila de cálculo
- ✅ Vê apenas precatórios próprios (comercial) fora do cálculo
- ✅ Não vê precatórios de outros operadores
- ✅ Não vê precatórios em cálculo na aba "Precatórios"

**Admin/Comercial mantém acesso total:**
- ✅ Vê todos os precatórios em todas as abas
- ✅ Pode gerenciar qualquer precatório

---

**Data:** 2024  
**Implementado por:** BLACKBOX AI  
**Status:** ✅ CORRIGIDO E TESTADO
