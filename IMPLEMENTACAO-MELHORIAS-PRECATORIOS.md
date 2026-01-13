# Implementação de Melhorias - Gestão de Precatórios

## Objetivo
Corrigir fluxo de status, adicionar seleção em lote e permitir edição completa dos precatórios.

## Tarefas

### 1. ✅ Análise Completa
- [x] Analisar estrutura atual
- [x] Identificar arquivos a modificar
- [x] Criar plano de implementação

### 2. ✅ Adicionar Seleção em Lote na Lista de Precatórios
- [x] Adicionar checkbox em cada card de precatório
- [x] Adicionar "Selecionar Todos" no topo
- [x] Adicionar botão "Excluir Selecionados"
- [x] Implementar lógica de seleção múltipla
- [x] Adicionar confirmação de exclusão em lote

**Arquivo**: `app/(dashboard)/precatorios/page.tsx`

### 3. ✅ Adicionar Seleção na Importação JSON
- [x] Adicionar checkbox em cada linha da preview
- [x] Adicionar "Selecionar Todos" / "Desmarcar Todos"
- [x] Modificar botão para mostrar quantidade selecionada
- [x] Enviar apenas precatórios selecionados para criação

**Arquivo**: `components/import/import-json-modal.tsx`

### 4. 🔄 Modificar API de Importação JSON
- [ ] Aceitar array de índices selecionados
- [ ] Criar apenas precatórios selecionados
- [ ] Retornar resultado detalhado

**Arquivo**: `app/api/import/json/route.ts`

### 5. 🔄 Habilitar Edição Completa de Valores
- [ ] Remover restrição READ-ONLY de valor_principal
- [ ] Remover restrição READ-ONLY de valor_atualizado
- [ ] Remover restrição READ-ONLY de saldo_liquido
- [ ] Adicionar campos editáveis para PSS, IRPF, honorários, adiantamento
- [ ] Adicionar campos editáveis para propostas
- [ ] Implementar validação e salvamento

**Arquivo**: `app/(dashboard)/precatorios/[id]/page.tsx`

### 6. 🔄 Corrigir Fluxo de Status
- [ ] Garantir que upload/import cria com status='novo'
- [ ] Admin distribui → status='distribuido'
- [ ] Operador envia para cálculo → status='em_calculo'

**Arquivos**: 
- `app/(dashboard)/admin/precatorios/page.tsx`
- `app/(dashboard)/precatorios/page.tsx`

## Status Atual
🔄 Em Progresso - Iniciando implementação

## Próximos Passos
1. Implementar seleção em lote na lista de precatórios
2. Implementar seleção na importação JSON
3. Habilitar edição completa de valores
4. Testar todas as funcionalidades
