# Fase 3 - Componentes Faltantes: Especificação Detalhada

## Componentes a Criar

### 1. Modal de Detalhes com Abas
**Arquivo**: `components/kanban/modal-detalhes-kanban.tsx`

**Abas**:
1. **Geral** - Informações básicas do precatório
2. **Triagem** - Form de interesse do credor
3. **Documentos** - Checklist de documentos do credor
4. **Certidões** - Checklist de certidões
5. **Jurídico** - Solicitação e parecer jurídico
6. **Cálculo** - Histórico de versões
7. **Auditoria** - Timeline de ações

**Props**:
```typescript
interface ModalDetalhesKanbanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  precatorioId: string
  onUpdate: () => void
}
```

**Funcionalidades**:
- Navegação entre abas
- Carregamento lazy de dados por aba
- Botões de ação contextuais por aba
- Indicadores visuais de progresso

---

### 2. Form de Interesse (Triagem)
**Arquivo**: `components/kanban/form-interesse.tsx`

**Campos**:
- Status do interesse (5 opções)
- Observação (textarea)
- Data do contato
- Próxima ação

**Estados**:
- SEM_CONTATO
- CONTATO_EM_ANDAMENTO
- PEDIR_RETORNO
- SEM_INTERESSE
- TEM_INTERESSE

**API**: Atualiza campos `interesse_status` e `interesse_observacao`

---

### 3. Checklist de Documentos
**Arquivo**: `components/kanban/checklist-documentos.tsx`

**Funcionalidades**:
- Lista dos 8 documentos padrão
- Status por item (6 estados)
- Upload de arquivo por item
- Observação por item
- Adicionar item customizado
- Remover item customizado
- Indicador de progresso (X/8)

**Estados dos Itens**:
- PENDENTE
- SOLICITADO
- RECEBIDO
- INCOMPLETO
- VENCIDO
- NAO_APLICAVEL

**API**: `/api/kanban/items`

---

### 4. Checklist de Certidões
**Arquivo**: `components/kanban/checklist-certidoes.tsx`

**Funcionalidades**:
- Lista das 3 certidões padrão
- Status por item
- Data de validade
- Upload de arquivo
- Observação
- Indicador de vencimento
- Adicionar certidão customizada
- Indicador de progresso (X/3)

**Campos Especiais**:
- Validade (date picker)
- Dias para vencer (calculado)
- Alerta de vencimento

**API**: `/api/kanban/items`

---

### 5. Form de Solicitação Jurídica
**Arquivo**: `components/kanban/form-solicitar-juridico.tsx`

**Campos**:
- Motivo (select - 6 opções)
- Descrição do bloqueio (textarea obrigatório)

**Motivos**:
- PENHORA
- CESSAO
- HONORARIOS
- HABILITACAO
- DUVIDA_BASE_INDICE
- OUTROS

**Validações**:
- Só pode solicitar se status_kanban = 'calculo_andamento'
- Só operador_calculo e admin podem solicitar
- Descrição obrigatória

**API**: `POST /api/kanban/juridico`

---

### 6. Form de Parecer Jurídico
**Arquivo**: `components/kanban/form-parecer-juridico.tsx`

**Campos**:
- Status do parecer (select - 4 opções)
- Texto do parecer (textarea obrigatório)

**Status do Parecer**:
- APROVADO
- AJUSTAR_DADOS
- IMPEDIMENTO
- RISCO_ALTO

**Validações**:
- Só pode dar parecer se status_kanban = 'analise_juridica'
- Só jurídico e admin podem dar parecer
- Texto obrigatório

**API**: `PUT /api/kanban/juridico`

---

### 7. Form de Exportar Cálculo
**Arquivo**: `components/kanban/form-exportar-calculo.tsx`

**Campos**:
- Data base (date picker obrigatório)
- Valor atualizado (currency obrigatório)
- Saldo líquido (currency obrigatório)
- Premissas resumo (textarea)
- Premissas JSON (textarea opcional)
- Arquivo PDF (upload opcional)

**Validações**:
- Só pode exportar se em colunas de cálculo
- Só operador_calculo e admin
- Campos obrigatórios preenchidos

**Ações**:
- Cria versão do cálculo
- Exporta para campos do card
- Move para 'calculo_concluido'

**API**: `POST /api/kanban/calculo/export`

---

### 8. Visualização de Histórico de Cálculos
**Arquivo**: `components/kanban/historico-calculos.tsx`

**Funcionalidades**:
- Lista de versões (mais recente primeiro)
- Detalhes de cada versão
- Comparação entre versões
- Download de PDF (se disponível)
- Indicador de versão atual

**Dados por Versão**:
- Número da versão
- Data base
- Valor atualizado
- Saldo líquido
- Premissas resumo
- Criado por
- Data de criação

**API**: `GET /api/kanban/calculo/export?precatorio_id=X`

---

### 9. Tooltip do Botão Cadeado
**Arquivo**: `components/kanban/tooltip-cadeado.tsx`

**Conteúdo quando BLOQUEADO**:
- Motivo principal
- Lista de requisitos não cumpridos
- Próximos passos

**Exemplo**:
```
🔒 Cálculo Bloqueado

Motivos:
• Coluna atual não permite acesso
• Documentos mínimos pendentes (3/8)
• Certidões pendentes (2/3)

Próximos passos:
1. Completar documentos
2. Validar certidões
3. Mover para "Pronto para Cálculo"
```

**API**: `GET /api/kanban/move` (usa função `pode_acessar_area_calculos`)

---

### 10. Indicadores de Progresso
**Arquivo**: `components/kanban/indicadores-progresso.tsx`

**Indicadores**:
- Barra de progresso de documentos
- Barra de progresso de certidões
- Badge de interesse
- Badge de cálculo desatualizado
- Badge de versão

**Cores**:
- Verde: Completo
- Amarelo: Em progresso
- Vermelho: Bloqueado/Vencido
- Cinza: Não iniciado

---

## Estrutura de Pastas Sugerida

```
components/
  kanban/
    modal-detalhes-kanban.tsx       # Modal principal
    form-interesse.tsx              # Aba Triagem
    checklist-documentos.tsx        # Aba Documentos
    checklist-certidoes.tsx         # Aba Certidões
    form-solicitar-juridico.tsx     # Aba Jurídico (solicitar)
    form-parecer-juridico.tsx       # Aba Jurídico (parecer)
    form-exportar-calculo.tsx       # Aba Cálculo (exportar)
    historico-calculos.tsx          # Aba Cálculo (histórico)
    tooltip-cadeado.tsx             # Tooltip do botão
    indicadores-progresso.tsx       # Badges e barras
    item-checklist.tsx              # Item individual de checklist
```

---

## Fluxo de Uso

### 1. Usuário clica em card no Kanban
```
Card onClick → 
  Abre Modal de Detalhes →
    Carrega dados do precatório →
      Mostra aba "Geral" por padrão
```

### 2. Navegação entre abas
```
Usuário clica em aba →
  Lazy load dos dados da aba →
    Renderiza conteúdo específico
```

### 3. Atualização de Interesse
```
Aba Triagem →
  Form de Interesse →
    Seleciona "TEM_INTERESSE" →
      Salva →
        Atualiza precatório →
          Permite mover para próxima coluna
```

### 4. Checklist de Documentos
```
Aba Documentos →
  Lista de 8 docs →
    Clica em item →
      Abre dialog de edição →
        Atualiza status →
          Upload arquivo (opcional) →
            Salva →
              Atualiza progresso (X/8)
```

### 5. Solicitação Jurídica
```
Aba Jurídico →
  Form de Solicitação →
    Seleciona motivo →
      Descreve bloqueio →
        Confirma →
          POST /api/kanban/juridico →
            Move para 'analise_juridica'
```

### 6. Parecer Jurídico
```
Aba Jurídico (usuário jurídico) →
  Form de Parecer →
    Seleciona status →
      Escreve parecer →
        Confirma →
          PUT /api/kanban/juridico →
            Move para 'recalculo_pos_juridico'
```

### 7. Exportar Cálculo
```
Aba Cálculo →
  Form de Exportar →
    Preenche campos →
      Upload PDF (opcional) →
        Confirma →
          POST /api/kanban/calculo/export →
            Cria versão →
              Exporta para card →
                Move para 'calculo_concluido'
```

---

## Animações Sugeridas

### Transições de Abas
```css
transition: opacity 0.2s ease-in-out
```

### Drag & Drop
```css
/* Card sendo arrastado */
opacity: 0.5
transform: rotate(2deg)

/* Drop zone válido */
border: 2px dashed green

/* Drop zone inválido */
border: 2px dashed red
```

### Badges
```css
/* Aparecer */
animation: fadeIn 0.3s ease-in

/* Pulsar (cálculo desatualizado) */
animation: pulse 2s infinite
```

### Progresso
```css
/* Barra de progresso */
transition: width 0.5s ease-out
```

---

## Prioridade de Implementação

### Alta Prioridade (Essencial)
1. ✅ Modal de Detalhes (estrutura básica)
2. ✅ Form de Interesse
3. ✅ Checklist de Documentos
4. ✅ Checklist de Certidões

### Média Prioridade (Importante)
5. ⏳ Form de Solicitação Jurídica
6. ⏳ Form de Parecer Jurídico
7. ⏳ Form de Exportar Cálculo

### Baixa Prioridade (Nice to Have)
8. ⏳ Histórico de Cálculos
9. ⏳ Tooltip do Cadeado
10. ⏳ Animações

---

## Estimativa de Tempo

- Modal de Detalhes: 2-3 horas
- Forms (3x): 3-4 horas
- Checklists (2x): 2-3 horas
- Histórico: 1-2 horas
- Tooltips e Animações: 1-2 horas

**Total**: 9-14 horas de desenvolvimento

---

## Próximos Passos Imediatos

1. Criar `modal-detalhes-kanban.tsx` (estrutura com abas)
2. Criar `form-interesse.tsx`
3. Criar `checklist-documentos.tsx`
4. Criar `checklist-certidoes.tsx`
5. Integrar modal na página Kanban
6. Testar fluxo completo

---

**Status**: 📋 Especificação Completa
**Próximo**: Implementar componentes prioritários
