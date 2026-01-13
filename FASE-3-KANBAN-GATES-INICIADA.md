# 🚧 Fase 3 Iniciada: Kanban + Gates - Frontend

## Status: Em Progresso

A Fase 3 foi iniciada com a criação da nova página Kanban com suporte a Gates.

## ✅ O Que Foi Criado

### Página Kanban com Gates
**Arquivo**: `app/(dashboard)/kanban/page-new-gates.tsx`

**Funcionalidades Implementadas**:
- ✅ 11 colunas do Kanban
- ✅ Drag & drop com validação de gates
- ✅ Integração com API `/api/kanban/move`
- ✅ Botão "🔒 Área de cálculos" (habilitado/desabilitado)
- ✅ Badges de status (interesse, docs, certidões, cálculo desatualizado)
- ✅ Dialog de validação/bloqueio com detalhes
- ✅ Motivo obrigatório ao fechar precatório
- ✅ Resumo de itens (docs/certidões) em cada card
- ✅ Valores atualizados e saldo líquido
- ✅ Versão do cálculo

**11 Colunas**:
1. Entrada
2. Triagem
3. Documentos
4. Certidões
5. Pronto p/ Cálculo
6. Cálculo
7. Jurídico
8. Recálculo
9. Concluído
10. Proposta
11. Fechado

## 🎨 Features Visuais

### Cards com Badges
- **Interesse**: Badge verde (TEM_INTERESSE) ou cinza (outros)
- **Documentos**: "Docs: X/8" mostra progresso
- **Certidões**: "Cert: X/3" mostra progresso
- **Cálculo Desatualizado**: Badge vermelho de alerta
- **Versão**: Badge com número da versão (v1, v2, etc.)

### Botão Cadeado
- **Habilitado** (🔓): Verde, clicável, abre área de cálculos
- **Desabilitado** (🔒): Cinza, mostra tooltip com motivos do bloqueio

### Dialog de Validação
Quando movimentação é bloqueada, mostra:
- Mensagem principal do bloqueio
- Lista de documentos pendentes
- Lista de certidões pendentes
- Campos obrigatórios faltando

## 🔄 Fluxo Implementado

### 1. Drag & Drop
```typescript
// Usuário arrasta card para nova coluna
onDragEnd() → 
  POST /api/kanban/move → 
    Validação de gates →
      ✅ Sucesso: Move e recarrega
      ❌ Bloqueio: Mostra dialog com detalhes
```

### 2. Acesso à Área de Cálculos
```typescript
podeAcessarCalculos() verifica:
  - Coluna permitida? (pronto_calculo, calculo_andamento, etc.)
  - Role permitido? (operador_calculo ou admin)
  - É o responsável? (ou admin)
  
Se SIM: Botão verde habilitado
Se NÃO: Botão cinza desabilitado
```

### 3. Fechamento com Motivo
```typescript
// Ao mover para "fechado"
Dialog abre →
  Textarea para motivo (obrigatório) →
    Confirmar →
      POST /api/kanban/move com motivo_fechamento
```

## 📊 Integração com Backend

### APIs Utilizadas
- `GET /api/kanban/move` - Buscar precatórios com resumo de itens
- `POST /api/kanban/move` - Mover com validação de gates

### Dados Recebidos
```typescript
interface PrecatorioCard {
  id: string
  titulo: string
  status_kanban: string
  interesse_status: string
  calculo_desatualizado: boolean
  calculo_ultima_versao: number
  valor_atualizado: number
  saldo_liquido: number
  resumo_itens: {
    total_docs: number
    docs_recebidos: number
    total_certidoes: number
    certidoes_recebidas: number
    percentual_docs: number
    percentual_certidoes: number
  }
}
```

## 🚀 Próximos Passos (Fase 3 Continuação)

### Componentes Faltando
1. **Modal de Detalhes** - Visualizar/editar precatório
2. **Form de Interesse** - Atualizar interesse_status
3. **Checklist de Itens** - Gerenciar docs/certidões
4. **Form Jurídico** - Solicitar análise jurídica
5. **Form de Parecer** - Jurídico dar parecer
6. **Form Exportar Cálculo** - Concluir cálculo

### Melhorias Visuais
1. Tooltip no botão cadeado (motivos do bloqueio)
2. Animações de transição
3. Loading states
4. Empty states personalizados
5. Cores por tipo de badge

### Funcionalidades Adicionais
1. Filtros por coluna
2. Busca de precatórios
3. Ordenação (data, valor, etc.)
4. Visualização em lista (alternativa ao Kanban)
5. Estatísticas por coluna

## 📝 Como Testar

### 1. Substituir Página Atual
```bash
# Backup da página antiga
mv app/(dashboard)/kanban/page.tsx app/(dashboard)/kanban/page-old.tsx

# Ativar nova página
mv app/(dashboard)/kanban/page-new-gates.tsx app/(dashboard)/kanban/page.tsx
```

### 2. Executar Scripts SQL
Antes de testar, execute os scripts da Fase 1:
```
1. scripts/76-kanban-gates-schema.sql
2. scripts/77-kanban-gates-functions.sql
3. scripts/78-kanban-gates-triggers.sql
4. scripts/79-kanban-gates-seed.sql
```

### 3. Testar Fluxo
1. Criar precatório novo (vai para "entrada")
2. Tentar arrastar para "docs_credor" (deve bloquear - interesse não confirmado)
3. Atualizar interesse_status para "TEM_INTERESSE"
4. Arrastar para "docs_credor" (deve permitir)
5. Marcar docs como RECEBIDO
6. Arrastar para "certidoes" (deve permitir)
7. Continuar fluxo...

## 🎯 Critérios de Aceite (Parcial)

- [x] 11 colunas visíveis
- [x] Drag & drop funcional
- [x] Validação de gates antes de mover
- [x] Mensagens de bloqueio detalhadas
- [x] Botão cadeado (habilitado/desabilitado)
- [x] Badges de status nos cards
- [x] Integração com APIs
- [ ] Modal de detalhes completo
- [ ] Checklist de itens
- [ ] Forms de jurídico
- [ ] Form de exportar cálculo
- [ ] Tooltips informativos
- [ ] Animações

## 📚 Arquivos Relacionados

**Criados**:
- `app/(dashboard)/kanban/page-new-gates.tsx` - Nova página Kanban

**APIs Usadas**:
- `app/api/kanban/move/route.ts`
- `app/api/kanban/items/route.ts`
- `app/api/kanban/calculo/export/route.ts`
- `app/api/kanban/juridico/route.ts`

**Scripts SQL**:
- `scripts/76-kanban-gates-schema.sql`
- `scripts/77-kanban-gates-functions.sql`
- `scripts/78-kanban-gates-triggers.sql`
- `scripts/79-kanban-gates-seed.sql`

## ⚠️ Importante

Esta é apenas a **primeira parte da Fase 3**. A página Kanban básica está funcional, mas faltam:
- Modais de detalhes
- Forms de interação
- Checklists
- Tooltips
- Animações
- Melhorias visuais

**Recomendação**: Continuar implementação em nova sessão, focando nos componentes faltantes.

---

**Status**: 🚧 Fase 3 - 30% Concluída
**Próximo**: Criar componentes de modal e forms
