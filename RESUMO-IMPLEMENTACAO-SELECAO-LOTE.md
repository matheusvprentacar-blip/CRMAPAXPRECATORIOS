# Resumo da Implementação - Seleção em Lote

## ✅ Concluído

### 1. Seleção na Importação JSON
**Arquivo**: `components/import/import-json-modal.tsx`

**Implementado**:
- ✅ Checkbox em cada linha da tabela de preview
- ✅ Checkbox "Selecionar Todos" no cabeçalho da tabela
- ✅ Botão "Selecionar Todos" / "Desmarcar Todos" no topo
- ✅ Contador de precatórios selecionados
- ✅ Botão "Criar" mostra quantidade selecionada
- ✅ Apenas precatórios selecionados são enviados para criação
- ✅ Seleção automática de todos os válidos ao carregar preview
- ✅ Checkboxes desabilitados para precatórios inválidos

**Como funciona**:
1. Usuário faz upload do JSON
2. Sistema valida e mostra preview
3. Todos os precatórios válidos são automaticamente selecionados
4. Usuário pode desmarcar/marcar individualmente
5. Botão "Criar X Precatórios" mostra quantidade selecionada
6. Apenas os selecionados são criados

## 🔄 Próximas Tarefas

### 2. Seleção em Lote na Lista de Precatórios
**Arquivo**: `app/(dashboard)/precatorios/page.tsx`

**A implementar**:
- [ ] Adicionar estado para controlar seleção (Set<string> com IDs)
- [ ] Adicionar checkbox em cada card de precatório
- [ ] Adicionar checkbox "Selecionar Todos" no topo da lista
- [ ] Adicionar botão "Excluir Selecionados" (visível quando há seleção)
- [ ] Implementar função de exclusão em lote
- [ ] Dialog de confirmação mostrando quantidade a excluir
- [ ] Chamar RPC `delete_precatorio` para cada ID selecionado
- [ ] Atualizar lista após exclusão

**Localização no código**:
- Linha ~20: Adicionar estado `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())`
- Linha ~60: Adicionar funções de toggle selection
- Linha ~280: Adicionar checkbox no header (antes de "Filtros Avançados")
- Linha ~350: Adicionar checkbox em cada card (dentro do CardContent)
- Linha ~400: Adicionar botão "Excluir Selecionados"

### 3. Habilitar Edição Completa de Valores
**Arquivo**: `app/(dashboard)/precatorios/[id]/page.tsx`

**A implementar**:
- [ ] Remover comentário "READ-ONLY" dos campos de valores
- [ ] Adicionar CurrencyInput para valor_principal
- [ ] Adicionar CurrencyInput para valor_atualizado  
- [ ] Adicionar CurrencyInput para saldo_liquido
- [ ] Adicionar campos editáveis para PSS, IRPF, honorários, adiantamento
- [ ] Adicionar campos editáveis para propostas (menor e maior)
- [ ] Atualizar função handleSaveEdit para incluir novos campos
- [ ] Adicionar validação (valores não podem ser negativos)

**Localização no código**:
- Linha ~450: Seção "Valores" - remover READ-ONLY
- Linha ~480: Seção "Descontos" - adicionar campos editáveis
- Linha ~510: Seção "Propostas" - adicionar campos editáveis
- Linha ~150: Função handleSaveEdit - adicionar novos campos no updateData

### 4. Corrigir Fluxo de Status

**Status correto**:
```
novo → distribuido → em_calculo → calculado → concluido
```

**Regras**:
- Operador cria/importa → `status: 'novo'` ✅ (já está correto)
- Admin distribui para operador → `status: 'distribuido'`
- Operador envia para cálculo → `status: 'em_calculo'`

**Arquivos a modificar**:
- `app/(dashboard)/admin/precatorios/page.tsx` - linha ~250 (handleDistribuir)
- `app/(dashboard)/precatorios/page.tsx` - linha ~180 (handleEnviarParaCalculo)

## Ordem de Implementação Sugerida

1. ✅ **Seleção JSON** (Concluído)
2. **Seleção em Lote na Lista** (Próximo - mais importante para o usuário)
3. **Edição Completa de Valores** (Importante para correções)
4. **Fluxo de Status** (Ajuste final)

## Testes Necessários

Após implementação:
1. Testar importação JSON com seleção parcial
2. Testar seleção e exclusão em lote na lista
3. Testar edição de todos os campos de valores
4. Testar fluxo completo: criar → distribuir → enviar para cálculo
5. Verificar permissões (operador vs admin)
