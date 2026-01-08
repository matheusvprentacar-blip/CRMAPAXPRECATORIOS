# 🔄 Funcionalidade: Gerenciar Atraso de Cálculo

## 📋 Descrição

Permite que o operador de cálculo **renove** ou **remova** a situação de atraso de um precatório diretamente da fila de cálculo.

---

## ✨ Funcionalidades Implementadas

### 1. **Renovar Atraso**
- Operador pode atualizar o motivo do atraso
- Mantém o histórico de atrasos
- Útil quando a situação mudou mas ainda há impedimento

### 2. **Remover Atraso**
- Remove completamente a marcação de atraso
- Limpa todos os campos relacionados:
  - `motivo_atraso_calculo`
  - `data_atraso_calculo`
  - `tipo_atraso`
  - `impacto_atraso`
- Registra atividade de "atraso_removido"
- Precatório volta ao estado normal na fila

---

## 🎨 Interface do Usuário

### Quando NÃO há atraso reportado:
```
┌─────────────────────────────────────┐
│ [Calcular] [Reportar Atraso] [👁️]  │
└─────────────────────────────────────┘
```

### Quando HÁ atraso reportado:
```
┌──────────────────────────────────────────────┐
│ 🕐 Atraso Reportado                          │
│ [Doc Incompleta] [Impacto Alto]              │
│                                              │
│ Aguardando documentos do cliente...          │
│ Reportado em: 15/01/2025 14:30              │
│                                              │
│ [🔄 Renovar Atraso] [✓ Remover Atraso]      │
└──────────────────────────────────────────────┘
│                                              │
│ [Calcular] [Reportar Atraso] [👁️]          │
└──────────────────────────────────────────────┘
```

---

## 🔧 Implementação Técnica

### Arquivos Modificados

#### 1. `components/calculo/card-precatorio-calculo.tsx`
**Adicionado:**
- Prop `onRemoverAtraso?: () => void`
- Seção de "Ações do Atraso" dentro do card de atraso
- Botões "Renovar Atraso" e "Remover Atraso"
- Cores diferenciadas (laranja para renovar, verde para remover)

#### 2. `app/(dashboard)/calculo/page.tsx`
**Adicionado:**
- Função `handleRemoverAtraso(precatorioId: string)`
- Lógica para limpar campos de atraso
- Registro de atividade no histórico
- Recarga automática da lista após remoção

---

## 📊 Fluxo de Dados

### Remover Atraso:
```
1. Operador clica em "Remover Atraso"
   ↓
2. UPDATE precatorios SET
   - motivo_atraso_calculo = NULL
   - data_atraso_calculo = NULL
   - tipo_atraso = NULL
   - impacto_atraso = NULL
   ↓
3. INSERT INTO atividades
   - tipo: "atraso_removido"
   - descricao: "Atraso removido - precatório retomado"
   ↓
4. Recarrega lista da fila
   ↓
5. Card volta ao estado normal (sem destaque laranja)
```

### Renovar Atraso:
```
1. Operador clica em "Renovar Atraso"
   ↓
2. Abre modal de atraso (mesmo do "Reportar Atraso")
   ↓
3. Operador atualiza informações
   ↓
4. UPDATE precatorios com novos dados
   ↓
5. INSERT INTO atividades (novo registro)
   ↓
6. Recarrega lista da fila
```

---

## 🎯 Casos de Uso

### Caso 1: Problema Resolvido
**Situação:** Documentos faltantes foram recebidos
**Ação:** Operador clica em "Remover Atraso"
**Resultado:** Precatório volta ao estado normal, pronto para cálculo

### Caso 2: Situação Mudou
**Situação:** Atraso era "Doc Incompleta", agora é "Dúvida Jurídica"
**Ação:** Operador clica em "Renovar Atraso" e atualiza
**Resultado:** Novo registro de atraso com informações atualizadas

### Caso 3: Falso Positivo
**Situação:** Atraso foi reportado por engano
**Ação:** Operador clica em "Remover Atraso"
**Resultado:** Precatório limpo, sem histórico de atraso ativo

---

## 🔐 Permissões

- ✅ **Operador de Cálculo:** Pode renovar e remover atrasos
- ✅ **Admin:** Pode renovar e remover atrasos
- ❌ **Operador Comercial:** Não tem acesso à fila de cálculo

---

## 📈 Impacto no Dashboard

### Antes da Remoção:
```
Gargalos por Atraso:
- Doc Incompleta: 5 casos (2 SLA estourado)
```

### Depois da Remoção:
```
Gargalos por Atraso:
- Doc Incompleta: 4 casos (2 SLA estourado)
```

O dashboard é atualizado automaticamente quando atrasos são removidos.

---

## 🧪 Como Testar

### Teste 1: Remover Atraso
1. Acesse `/calculo`
2. Encontre um precatório com atraso reportado (fundo laranja)
3. Clique em "Remover Atraso"
4. Verifique que:
   - Card volta ao estado normal
   - Badge "Atraso Reportado" desaparece
   - Seção laranja é removida

### Teste 2: Renovar Atraso
1. Acesse `/calculo`
2. Encontre um precatório com atraso reportado
3. Clique em "Renovar Atraso"
4. Modal abre com campos preenchidos
5. Altere o tipo ou motivo
6. Salve
7. Verifique que informações foram atualizadas

### Teste 3: Histórico
1. Remova um atraso
2. Acesse detalhes do precatório
3. Verifique timeline
4. Deve haver registro "Atraso removido - precatório retomado"

---

## 🎨 Estilo Visual

### Botão "Renovar Atraso"
- Cor: Laranja (`text-orange-700`)
- Borda: Laranja (`border-orange-300`)
- Hover: Fundo laranja claro
- Ícone: AlertCircle

### Botão "Remover Atraso"
- Cor: Verde (`text-green-700`)
- Borda: Verde (`border-green-300`)
- Hover: Fundo verde claro
- Ícone: Clock

---

## 📝 Registro de Atividades

### Tipo de Atividade: `atraso_removido`
```json
{
  "precatorio_id": "uuid",
  "tipo": "atraso_removido",
  "descricao": "Atraso removido - precatório retomado",
  "created_at": "2025-01-15T14:30:00Z"
}
```

---

## ✅ Checklist de Implementação

- [x] Adicionar prop `onRemoverAtraso` no card
- [x] Criar função `handleRemoverAtraso` na página
- [x] Adicionar botões na seção de atraso
- [x] Implementar lógica de UPDATE no banco
- [x] Registrar atividade no histórico
- [x] Recarregar lista após ação
- [x] Testar fluxo completo
- [x] Documentar funcionalidade

---

## 🚀 Próximas Melhorias (Opcional)

1. **Confirmação antes de remover**
   - Dialog: "Tem certeza que deseja remover o atraso?"
   
2. **Notificação de sucesso**
   - Toast: "Atraso removido com sucesso!"
   
3. **Histórico de atrasos**
   - Mostrar todos os atrasos anteriores na timeline
   
4. **Estatísticas de atrasos**
   - Quantos atrasos foram resolvidos este mês
   - Tempo médio de resolução

---

**Status:** ✅ Implementado e Funcional  
**Data:** Janeiro 2025  
**Versão:** 1.0
