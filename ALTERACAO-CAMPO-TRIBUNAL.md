# ✅ ALTERAÇÃO: Campo Tribunal - Select para Input

## 📋 RESUMO DA ALTERAÇÃO

O campo "Tribunal" foi alterado de **Select (menu suspenso)** para **Input (campo de texto livre)** em todas as páginas do sistema.

### **Motivo da Alteração:**
Existem muitos tribunais diferentes no Brasil (TJ-SP, TJ-RJ, TJ-MG, TRF-1, TRF-2, TRF-3, TRF-4, TRF-5, etc.), tornando impraticável manter uma lista fixa. Com o campo de texto livre, cada operador pode digitar o tribunal específico do seu precatório.

---

## 📁 ARQUIVOS ALTERADOS

### **1. app/(dashboard)/admin/precatorios/page.tsx** ✅
**Localização:** Modal de criar novo precatório  
**Linha:** ~547

**ANTES:**
```tsx
<Select
  value={newPrecatorio.tribunal}
  onValueChange={(value) => setNewPrecatorio({ ...newPrecatorio, tribunal: value })}
  disabled={saving}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecione" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="TJ-SP">TJ-SP</SelectItem>
    <SelectItem value="TJ-RJ">TJ-RJ</SelectItem>
    <SelectItem value="TJ-MG">TJ-MG</SelectItem>
    <SelectItem value="TRF-1">TRF-1</SelectItem>
    <SelectItem value="TRF-2">TRF-2</SelectItem>
    <SelectItem value="TRF-3">TRF-3</SelectItem>
  </SelectContent>
</Select>
```

**DEPOIS:**
```tsx
<Input
  id="tribunal"
  placeholder="Ex: TJ-SP, TRF-1, TRF-2, etc"
  value={newPrecatorio.tribunal}
  onChange={(e) => setNewPrecatorio({ ...newPrecatorio, tribunal: e.target.value })}
  disabled={saving}
/>
```

---

### **2. app/(dashboard)/precatorios/[id]/page.tsx** ✅
**Localização:** Modo de edição do precatório  
**Linha:** ~415

**ANTES:**
```tsx
{userRole === "admin" && (
  <div>
    <Label>Tribunal</Label>
    <Select
      value={editData.tribunal || ""}
      onValueChange={(value) => setEditData({ ...editData, tribunal: value })}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TJ-SP">TJ-SP</SelectItem>
        <SelectItem value="TJ-RJ">TJ-RJ</SelectItem>
        <SelectItem value="TJ-MG">TJ-MG</SelectItem>
        <SelectItem value="TRF-1">TRF-1</SelectItem>
        <SelectItem value="TRF-2">TRF-2</SelectItem>
        <SelectItem value="TRF-3">TRF-3</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

**DEPOIS:**
```tsx
{userRole === "admin" && (
  <div>
    <Label>Tribunal</Label>
    <Input
      placeholder="Ex: TJ-SP, TRF-1, TRF-2, etc"
      value={editData.tribunal || ""}
      onChange={(e) => setEditData({ ...editData, tribunal: e.target.value })}
    />
  </div>
)}
```

---

### **3. app/(dashboard)/precatorios/novo/page.tsx** ✅
**Localização:** Formulário de novo precatório  
**Linha:** ~152

**ANTES:**
```tsx
{userRole === "admin" && (
  <div className="space-y-2">
    <Label htmlFor="tribunal">Tribunal</Label>
    <Select
      value={formData.tribunal}
      onValueChange={(value) => setFormData({ ...formData, tribunal: value })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TJ-SP">TJ-SP</SelectItem>
        <SelectItem value="TJ-RJ">TJ-RJ</SelectItem>
        <SelectItem value="TJ-MG">TJ-MG</SelectItem>
        <SelectItem value="TRF-1">TRF-1</SelectItem>
        <SelectItem value="TRF-2">TRF-2</SelectItem>
        <SelectItem value="TRF-3">TRF-3</SelectItem>
        <SelectItem value="TRF-4">TRF-4</SelectItem>
        <SelectItem value="TRF-5">TRF-5</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

**DEPOIS:**
```tsx
{userRole === "admin" && (
  <div className="space-y-2">
    <Label htmlFor="tribunal">Tribunal</Label>
    <Input
      id="tribunal"
      placeholder="Ex: TJ-SP, TRF-1, TRF-2, etc"
      value={formData.tribunal || ""}
      onChange={(e) => setFormData({ ...formData, tribunal: e.target.value })}
    />
  </div>
)}
```

---

## 🎯 BENEFÍCIOS DA ALTERAÇÃO

### **1. Flexibilidade Total** ✅
- Operadores podem digitar **qualquer tribunal** do Brasil
- Não há limitação de opções pré-definidas
- Suporta tribunais estaduais, federais, trabalhistas, etc.

### **2. Facilidade de Uso** ✅
- Digitação direta é mais rápida que navegar em menu
- Placeholder com exemplos ajuda o usuário
- Autocomplete do navegador pode sugerir valores anteriores

### **3. Manutenibilidade** ✅
- Não precisa atualizar código para adicionar novos tribunais
- Menos código para manter
- Mais simples e direto

### **4. Exemplos de Tribunais Suportados:**
- **Tribunais de Justiça Estaduais:** TJ-SP, TJ-RJ, TJ-MG, TJ-RS, TJ-BA, etc.
- **Tribunais Regionais Federais:** TRF-1, TRF-2, TRF-3, TRF-4, TRF-5, TRF-6
- **Tribunais Superiores:** STF, STJ, TST, TSE, STM
- **Tribunais Trabalhistas:** TRT-1, TRT-2, TRT-3, etc.
- **Outros:** Qualquer tribunal brasileiro

---

## 📊 IMPACTO NO BANCO DE DADOS

### **Nenhuma alteração necessária!** ✅

O campo `tribunal` na tabela `precatorios` já é do tipo `TEXT`, portanto:
- ✅ Aceita qualquer string
- ✅ Não há limite de caracteres (além do razoável)
- ✅ Dados existentes continuam funcionando
- ✅ Compatibilidade total com dados antigos

---

## 🧪 COMO TESTAR

### **1. Criar Novo Precatório (Admin)**
1. Acesse `/admin/precatorios`
2. Clique em "Criar Precatório"
3. No campo "Tribunal", digite: `TJ-SP`
4. Preencha outros campos obrigatórios
5. Clique em "Criar Precatório"
6. ✅ Deve salvar com sucesso

### **2. Editar Precatório Existente**
1. Acesse um precatório: `/precatorios/[id]`
2. Clique em "Editar"
3. Altere o campo "Tribunal" para: `TRF-3`
4. Clique em "Salvar"
5. ✅ Deve atualizar com sucesso

### **3. Criar Precatório (Operador)**
1. Acesse `/precatorios/novo`
2. Preencha os campos
3. Digite no campo "Tribunal": `TRT-2`
4. Clique em "Salvar Precatório"
5. ✅ Deve salvar com sucesso

---

## ✅ STATUS FINAL

| Arquivo | Status | Testado |
|---------|--------|---------|
| `app/(dashboard)/admin/precatorios/page.tsx` | ✅ Alterado | Pendente |
| `app/(dashboard)/precatorios/[id]/page.tsx` | ✅ Alterado | Pendente |
| `app/(dashboard)/precatorios/novo/page.tsx` | ✅ Alterado | Pendente |

---

## 📝 NOTAS IMPORTANTES

1. **Validação:** Não há validação de formato. O operador pode digitar qualquer texto.
2. **Padronização:** Recomenda-se criar um guia interno de como escrever os tribunais (ex: sempre maiúsculo, com hífen)
3. **Busca:** O campo continua sendo pesquisável normalmente
4. **Histórico:** Dados antigos com tribunais do menu suspenso continuam válidos

---

## 🎉 CONCLUSÃO

A alteração foi implementada com sucesso em **3 arquivos**, tornando o campo "Tribunal" mais flexível e fácil de usar. Agora os operadores podem digitar livremente o tribunal específico de cada precatório, sem limitações de uma lista pré-definida.

**Data da Alteração:** 2024  
**Solicitado por:** Usuário  
**Implementado por:** BLACKBOX AI  
**Status:** ✅ **CONCLUÍDO**
