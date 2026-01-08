# 📋 PLANO DE UNIFICAÇÃO - FILA DE CÁLCULO

## 🎯 OBJETIVO
Unificar TODA a lógica de cálculo em UMA ÚNICA PÁGINA (Fila de Cálculo), eliminando fragmentação.

---

## 📊 ANÁLISE DA ESTRUTURA ATUAL

### Páginas Existentes:
1. **`/calculo`** (Fila de Cálculo) - 3 abas:
   - Fila Global: Todos os precatórios em cálculo (não atribuídos)
   - Meus Cálculos: Precatórios atribuídos ao operador
   - Meus Precatórios: Precatórios onde é responsável comercial

2. **`/painel-calculos`** (Painel de Cálculos) - SERÁ ELIMINADO:
   - Cards com métricas
   - Lista de precatórios para calcular
   - Botão "Abrir Calculadora"

---

## 🔄 MUDANÇAS A SEREM IMPLEMENTADAS

### 1. SIMPLIFICAÇÃO DE ABAS
**ANTES:** 3 abas (Fila Global, Meus Cálculos, Meus Precatórios)
**DEPOIS:** 1 aba única "Fila de Cálculo"

**Regra de Exibição:**
- Mostrar TODOS os precatórios com `status = 'em_calculo'`
- Ordenação: FIFO (created_at ASC)
- Precatórios urgentes aparecem primeiro

### 2. IDENTIFICAÇÃO DO RESPONSÁVEL
**Adicionar em CADA card:**
- Nome do criador (criado_por)
- Nome do responsável comercial (responsavel)
- Nome do responsável de cálculo (responsavel_calculo_id)

**Formato visual:**
```
👤 Criado por: João Silva
💼 Comercial: Maria Santos
🧮 Cálculo: Pedro Oliveira (você)
```

### 3. CAMPO "MOTIVO DO ATRASO"
**Novo campo obrigatório quando não conseguir calcular:**

**Estrutura:**
- Campo de texto livre (textarea)
- Obrigatório para "pular" o cálculo
- Salvo no banco de dados
- Visível no histórico

**Exemplos de motivos:**
- Titular falecido
- Penhora identificada
- Cessão parcial de crédito
- Documentação incompleta
- Dúvida jurídica pendente

### 4. AÇÕES NO CARD
**Botões disponíveis:**
1. **"Calcular"** - Abre modal/página de cálculo
2. **"Reportar Atraso"** - Abre modal para justificar
3. **"Ver Detalhes"** - Navega para página de detalhes

### 5. ELIMINAÇÃO DO PAINEL DE CÁLCULOS
- Remover página `/painel-calculos`
- Remover link do menu/sidebar
- Migrar funcionalidades para `/calculo`

---

## 🗄️ ALTERAÇÕES NO BANCO DE DADOS

### Nova Coluna na Tabela `precatorios`:
```sql
ALTER TABLE precatorios 
ADD COLUMN motivo_atraso_calculo TEXT;

ALTER TABLE precatorios 
ADD COLUMN data_atraso_calculo TIMESTAMP WITH TIME ZONE;
```

### Atualizar View `precatorios_cards`:
```sql
-- Adicionar campos de nomes dos usuários
-- criador_nome, responsavel_nome, responsavel_calculo_nome
-- (já existem na view atual)
```

---

## 📝 ARQUIVOS A SEREM MODIFICADOS

### 1. `/app/(dashboard)/calculo/page.tsx`
**Mudanças:**
- ✅ Remover aba "Fila Global"
- ✅ Remover aba "Meus Precatórios"
- ✅ Manter apenas "Fila de Cálculo" (renomear para apenas "Fila")
- ✅ Adicionar identificação de responsáveis em cada card
- ✅ Adicionar botão "Reportar Atraso"
- ✅ Criar modal para justificar atraso
- ✅ Melhorar visualização dos cards

### 2. `/app/(dashboard)/painel-calculos/page.tsx`
**Ação:** DELETAR (não será mais usado)

### 3. Componentes Novos a Criar:
- `components/calculo/modal-atraso.tsx` - Modal para reportar atraso
- `components/calculo/card-precatorio-calculo.tsx` - Card otimizado

### 4. Scripts SQL:
- `scripts/39-adicionar-campo-motivo-atraso.sql` - Adicionar coluna

---

## 🎨 LAYOUT PROPOSTO - CARD UNIFICADO

```
┌─────────────────────────────────────────────────────────────┐
│ #1 [URGENTE] Precatório 12345/2024                    R$ 500k│
│                                                               │
│ 👤 Criado por: João Silva                                    │
│ 💼 Comercial: Maria Santos                                   │
│ 🧮 Cálculo: Você                                             │
│                                                               │
│ Credor: José da Silva                                        │
│ Processo: 1234567-89.2024.8.26.0100                         │
│ Tribunal: TJSP                                               │
│                                                               │
│ Recebido: 15/01/2024 às 14:30                               │
│                                                               │
│ [Calcular] [Reportar Atraso] [Ver Detalhes]                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXO DE TRABALHO ATUALIZADO

### Cenário 1: Operador Consegue Calcular
1. Operador vê precatório na fila
2. Clica em "Calcular"
3. Abre modal/página de cálculo
4. Preenche valores
5. Salva cálculo
6. Precatório sai da fila (status muda)

### Cenário 2: Operador NÃO Consegue Calcular
1. Operador vê precatório na fila
2. Clica em "Reportar Atraso"
3. Modal abre com campo obrigatório
4. Preenche motivo (ex: "Titular falecido")
5. Salva justificativa
6. Precatório PERMANECE na fila (mantém posição)
7. Badge "Atraso Reportado" aparece no card

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Banco de Dados
- [ ] Criar script SQL para adicionar campo `motivo_atraso_calculo`
- [ ] Executar script no Supabase
- [ ] Verificar se view `precatorios_cards` tem nomes dos usuários

### Fase 2: Componentes
- [ ] Criar modal de atraso (`modal-atraso.tsx`)
- [ ] Criar card otimizado (`card-precatorio-calculo.tsx`)
- [ ] Adicionar ícones de identificação

### Fase 3: Página Principal
- [ ] Simplificar `/calculo/page.tsx` para 1 aba
- [ ] Adicionar identificação de responsáveis
- [ ] Integrar modal de atraso
- [ ] Melhorar ordenação FIFO

### Fase 4: Limpeza
- [ ] Deletar `/painel-calculos/page.tsx`
- [ ] Remover links do menu/sidebar
- [ ] Atualizar rotas

### Fase 5: Testes
- [ ] Testar ordenação FIFO
- [ ] Testar reportar atraso
- [ ] Testar identificação de responsáveis
- [ ] Testar fluxo completo

---

## 📌 REGRAS IMPORTANTES

1. **NÃO criar nova página** - Apenas modificar `/calculo`
2. **NÃO duplicar lógica** - Reutilizar componentes existentes
3. **Manter ordem FIFO** - Não permitir alteração manual
4. **Campo obrigatório** - Motivo do atraso é obrigatório
5. **Identificação clara** - Sempre mostrar responsáveis

---

## 🚀 PRÓXIMOS PASSOS

1. Confirmar plano com usuário
2. Criar script SQL
3. Implementar componentes
4. Modificar página principal
5. Testar e validar

---

**Status:** 📋 Aguardando aprovação para implementação
