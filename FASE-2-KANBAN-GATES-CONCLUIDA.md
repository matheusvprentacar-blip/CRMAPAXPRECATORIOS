# ✅ Fase 2 Concluída: Kanban + Gates - Backend/API

## Resumo da Implementação

A Fase 2 do sistema de Kanban com Gates foi concluída com sucesso! Foram criadas 4 APIs REST completas que fornecem toda a funcionalidade backend necessária.

## 📝 APIs Criadas

### 1. API de Movimentação no Kanban
**Arquivo**: `app/api/kanban/move/route.ts`

**Endpoints**:
- `POST /api/kanban/move` - Mover precatório entre colunas
- `GET /api/kanban/move?coluna=X` - Listar precatórios por coluna

**Funcionalidades**:
- ✅ Validação automática de gates antes de mover
- ✅ Usa função `validar_movimentacao_kanban()` do banco
- ✅ Retorna mensagens de erro detalhadas se bloqueado
- ✅ Motivo obrigatório ao fechar precatório
- ✅ Auditoria automática via trigger
- ✅ Retorna resumo de itens (docs/certidões) para cada precatório

**Exemplo de uso**:
```typescript
// Mover precatório
POST /api/kanban/move
{
  "precatorio_id": "uuid",
  "coluna_destino": "docs_credor",
  "motivo_fechamento": "opcional, obrigatório se coluna_destino=fechado"
}

// Listar precatórios de uma coluna
GET /api/kanban/move?coluna=pronto_calculo
```

### 2. API de CRUD de Itens (Documentos/Certidões)
**Arquivo**: `app/api/kanban/items/route.ts`

**Endpoints**:
- `GET /api/kanban/items?precatorio_id=X` - Listar itens de um precatório
- `POST /api/kanban/items` - Adicionar item customizado
- `PUT /api/kanban/items` - Atualizar status de item
- `DELETE /api/kanban/items?item_id=X` - Remover item

**Funcionalidades**:
- ✅ Usa função `obter_itens_precatorio()` para listar
- ✅ Usa função `adicionar_item_customizado()` para criar
- ✅ Usa função `atualizar_status_item()` para atualizar
- ✅ Validação de tipo_grupo (DOC_CREDOR ou CERTIDAO)
- ✅ Validação de status_item (6 estados possíveis)
- ✅ Suporte para validade, observação e arquivo_url
- ✅ Auditoria automática

**Exemplo de uso**:
```typescript
// Listar itens
GET /api/kanban/items?precatorio_id=uuid

// Adicionar item customizado
POST /api/kanban/items
{
  "precatorio_id": "uuid",
  "tipo_grupo": "DOC_CREDOR",
  "nome_item": "Procuração",
  "observacao": "Opcional"
}

// Atualizar status
PUT /api/kanban/items
{
  "item_id": "uuid",
  "novo_status": "RECEBIDO",
  "validade": "2024-12-31",
  "observacao": "Opcional",
  "arquivo_url": "https://..."
}

// Remover item
DELETE /api/kanban/items?item_id=uuid
```

### 3. API de Exportar Cálculo
**Arquivo**: `app/api/kanban/calculo/export/route.ts`

**Endpoints**:
- `POST /api/kanban/calculo/export` - Exportar cálculo para o card
- `GET /api/kanban/calculo/export?precatorio_id=X` - Histórico de cálculos

**Funcionalidades**:
- ✅ Apenas operador_calculo e admin podem exportar
- ✅ Cria versão do cálculo na tabela `precatorio_calculos`
- ✅ Exporta dados para campos do precatório (card)
- ✅ Move automaticamente para `calculo_concluido`
- ✅ Incrementa `calculo_ultima_versao`
- ✅ Marca `calculo_desatualizado = false`
- ✅ Cria auditoria
- ✅ Retorna histórico completo de versões

**Exemplo de uso**:
```typescript
// Exportar cálculo
POST /api/kanban/calculo/export
{
  "precatorio_id": "uuid",
  "data_base": "2024-01-01",
  "valor_atualizado": 100000.00,
  "saldo_liquido": 95000.00,
  "premissas_json": { ... },
  "premissas_resumo": "Texto resumido",
  "arquivo_pdf_url": "https://..."
}

// Histórico de cálculos
GET /api/kanban/calculo/export?precatorio_id=uuid
```

### 4. API de Análise Jurídica
**Arquivo**: `app/api/kanban/juridico/route.ts`

**Endpoints**:
- `POST /api/kanban/juridico` - Enviar para análise jurídica
- `PUT /api/kanban/juridico` - Salvar parecer jurídico
- `GET /api/kanban/juridico` - Listar precatórios em análise

**Funcionalidades**:
- ✅ POST: Apenas operador_calculo e admin podem solicitar
- ✅ PUT: Apenas jurídico e admin podem dar parecer
- ✅ Validação de motivos (6 opções)
- ✅ Validação de parecer_status (4 opções)
- ✅ Move automaticamente entre colunas
- ✅ Auditoria automática
- ✅ Suporte para impedimento jurídico

**Exemplo de uso**:
```typescript
// Enviar para jurídico
POST /api/kanban/juridico
{
  "precatorio_id": "uuid",
  "motivo": "PENHORA",
  "descricao_bloqueio": "Descrição detalhada do problema"
}

// Salvar parecer
PUT /api/kanban/juridico
{
  "precatorio_id": "uuid",
  "parecer_status": "APROVADO",
  "parecer_texto": "Parecer detalhado do jurídico"
}

// Listar em análise
GET /api/kanban/juridico
```

## 🎯 Validações Implementadas

### Validação de Gates
Todas as movimentações passam pela função `validar_movimentacao_kanban()` que verifica:
- ✅ Interesse do credor confirmado
- ✅ Documentos mínimos recebidos (5/8)
- ✅ Certidões OK ou não aplicáveis
- ✅ Responsável de cálculo atribuído
- ✅ Parecer jurídico preenchido
- ✅ Cálculo salvo (versão criada)
- ✅ Campos obrigatórios preenchidos

### Validação de Permissões
- ✅ Operador comercial: Não acessa área de cálculos
- ✅ Operador cálculo: Acessa cálculos, solicita jurídico, exporta
- ✅ Jurídico: Apenas dá parecer
- ✅ Admin: Acesso total

### Validação de Status
- ✅ Status de itens: 6 estados válidos
- ✅ Status de interesse: 5 estados válidos
- ✅ Motivos jurídicos: 6 opções válidas
- ✅ Parecer jurídico: 4 opções válidas

## 📊 Fluxo Completo Implementado

### 1. Entrada → Triagem
```
POST /api/kanban/move
{ coluna_destino: "triagem_interesse" }
```

### 2. Triagem → Documentos
```
PUT /api/kanban/items (atualizar interesse_status)
POST /api/kanban/move
{ coluna_destino: "docs_credor" }
```

### 3. Documentos → Certidões
```
PUT /api/kanban/items (marcar docs como RECEBIDO)
POST /api/kanban/move
{ coluna_destino: "certidoes" }
```

### 4. Certidões → Pronto para Cálculo
```
PUT /api/kanban/items (marcar certidões como RECEBIDO/NAO_APLICAVEL)
POST /api/kanban/move
{ coluna_destino: "pronto_calculo" }
```

### 5. Pronto → Cálculo em Andamento
```
(Atribuir responsavel_calculo_id)
POST /api/kanban/move
{ coluna_destino: "calculo_andamento" }
```

### 6A. Cálculo → Análise Jurídica (se necessário)
```
POST /api/kanban/juridico
{ motivo, descricao_bloqueio }
```

### 6B. Análise Jurídica → Recálculo
```
PUT /api/kanban/juridico
{ parecer_status, parecer_texto }
```

### 7. Cálculo/Recálculo → Concluído
```
POST /api/kanban/calculo/export
{ data_base, valor_atualizado, saldo_liquido, ... }
(Move automaticamente para calculo_concluido)
```

### 8. Concluído → Proposta
```
POST /api/kanban/move
{ coluna_destino: "proposta_negociacao" }
```

### 9. Proposta → Fechado
```
POST /api/kanban/move
{ 
  coluna_destino: "fechado",
  motivo_fechamento: "Obrigatório"
}
```

## 🔒 Segurança

### Autenticação
- ✅ Todas as APIs verificam `auth.getUser()`
- ✅ Retorna 401 se não autenticado

### Autorização
- ✅ Verificação de role via `app_metadata`
- ✅ Retorna 403 se sem permissão
- ✅ RLS no banco garante acesso apenas aos próprios precatórios

### Validação
- ✅ Validação de parâmetros obrigatórios
- ✅ Validação de enums (status, motivos, etc.)
- ✅ Validação de gates antes de mover
- ✅ Mensagens de erro detalhadas

## 📈 Performance

### Otimizações
- ✅ Uso de funções do banco (menos round-trips)
- ✅ Índices nas tabelas principais
- ✅ Views para resumos (evita múltiplas queries)
- ✅ Triggers para auditoria (não bloqueia request)

### Caching
- ✅ Dados de validação calculados no banco
- ✅ Resumos pré-calculados em views

## ✅ Testes Sugeridos

### Teste 1: Movimentação com Gate
```bash
# Tentar mover sem interesse confirmado (deve bloquear)
curl -X POST /api/kanban/move \
  -H "Content-Type: application/json" \
  -d '{"precatorio_id":"uuid","coluna_destino":"docs_credor"}'

# Resposta esperada: 400 com mensagem de bloqueio
```

### Teste 2: CRUD de Itens
```bash
# Listar itens
curl /api/kanban/items?precatorio_id=uuid

# Atualizar status
curl -X PUT /api/kanban/items \
  -H "Content-Type: application/json" \
  -d '{"item_id":"uuid","novo_status":"RECEBIDO"}'
```

### Teste 3: Exportar Cálculo
```bash
# Exportar
curl -X POST /api/kanban/calculo/export \
  -H "Content-Type: application/json" \
  -d '{"precatorio_id":"uuid","data_base":"2024-01-01",...}'

# Ver histórico
curl /api/kanban/calculo/export?precatorio_id=uuid
```

### Teste 4: Análise Jurídica
```bash
# Solicitar análise
curl -X POST /api/kanban/juridico \
  -H "Content-Type: application/json" \
  -d '{"precatorio_id":"uuid","motivo":"PENHORA",...}'

# Dar parecer
curl -X PUT /api/kanban/juridico \
  -H "Content-Type: application/json" \
  -d '{"precatorio_id":"uuid","parecer_status":"APROVADO",...}'
```

## 🚀 Próximos Passos

Com a Fase 2 concluída, podemos avançar para:

### Fase 3: Frontend Kanban
- Página Kanban com 11 colunas
- Cards com badges (docs, certidões, cálculo desatualizado)
- Botão cadeado (🔒 Área de cálculos)
- Drag & drop com validação
- Modais de confirmação

### Fase 4: Modal e Checklists
- Modal de detalhes com abas
- Checklist de documentos
- Checklist de certidões
- Upload de arquivos
- Validação visual de gates

### Fase 5: Jurídico e Cálculo
- Form de solicitação jurídica
- Form de parecer jurídico
- Form de exportar cálculo
- Visualização de versões
- Comparação de versões

### Fase 6: Testes e Auditoria
- Testes de integração
- Testes de gates
- Visualização de auditoria
- Relatórios

## 📚 Documentação Relacionada

- `FASE-1-KANBAN-GATES-CONCLUIDA.md` - Scripts SQL (Fase 1)
- `ESPECIFICACAO-KANBAN-GATES-JURIDICO.md` - Especificação completa
- `app/api/kanban/move/route.ts` - API de movimentação
- `app/api/kanban/items/route.ts` - API de itens
- `app/api/kanban/calculo/export/route.ts` - API de cálculo
- `app/api/kanban/juridico/route.ts` - API jurídica

## 📊 Estatísticas

- **APIs criadas**: 4 arquivos
- **Endpoints**: 11 endpoints
- **Linhas de código**: ~1.200
- **Validações**: 20+ validações
- **Permissões**: 4 níveis (admin, comercial, cálculo, jurídico)

---

**Status**: ✅ Fase 2 Concluída
**Data**: 2024
**Próxima Fase**: Fase 3 - Frontend Kanban
