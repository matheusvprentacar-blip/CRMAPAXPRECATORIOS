# Fluxo Completo de Distribuição de Precatórios

## Resumo da Implementação

O sistema agora implementa o fluxo completo de distribuição de precatórios seguindo as regras definidas:

## 1. Criação pelo Admin

**Rota:** `/admin/precatorios`

- Admin cria precatórios com status `novo` ou `pendente_distribuicao`
- Campos `responsavel` e `responsavel_calculo_id` iniciam como `NULL`
- Coluna `urgente` (boolean) adicionada para priorização na fila

## 2. Distribuição para Operador Comercial (Primeira Etapa)

**Ação:** Admin clica em "Distribuir" e seleciona o operador comercial

**Update executado:**
```sql
UPDATE precatorios SET
  responsavel = '<uuid_operador_comercial>',
  status = 'em_contato',
  responsavel_calculo_id = NULL
WHERE id = '<precatorio_id>';
```

**Regras:**
- NUNCA pula esta etapa
- Admin DEVE distribuir para comercial antes de cálculo
- Status muda para `em_contato`

## 3. Envio para Cálculo (Segunda Etapa)

**Rota:** `/precatorios` (Operador Comercial)

- Operador comercial vê seus precatórios (onde `responsavel = user.id` e `status != 'em_calculo'`)
- Botão "Enviar p/ Cálculo" visível apenas para operador comercial
- Seleciona operador de cálculo no modal

**Update executado:**
```sql
UPDATE precatorios SET
  responsavel_calculo_id = '<uuid_operador_calculo>',
  status = 'em_calculo'
WHERE id = '<precatorio_id>';
```

## 4. Fila de Cálculo (Operador de Cálculo)

**Rota:** `/calculo`

### Aba 1: Fila de Cálculo

**Query:**
```sql
SELECT * FROM precatorios_cards
WHERE responsavel_calculo_id = '<user_id>'
  AND status = 'em_calculo'
ORDER BY urgente DESC, created_at ASC;
```

**Características:**
- Ordem FIFO (primeiro a entrar, primeiro a sair)
- Precatórios urgentes aparecem primeiro
- Mostra posição na fila (#1, #2, #3...)

### Aba 2: Meus Precatórios

**Query:**
```sql
SELECT * FROM precatorios_cards
WHERE responsavel = '<user_id>'
  AND status != 'em_calculo'
ORDER BY created_at DESC;
```

**Características:**
- Operador de cálculo também pode negociar precatórios
- Visualiza precatórios onde é responsável comercial
- Exclui os que estão em cálculo (aparecem na fila)

## 5. Funcionalidades Adicionais

### Marcar como Urgente
- Admin pode marcar precatórios como urgentes
- Precatórios urgentes vão para o topo da fila automaticamente
- Badge visual vermelho indica urgência

### Excluir Precatórios
- Admin: pode excluir qualquer precatório
- Operador Comercial: pode excluir se for criador ou responsável
- Usa soft delete via RPC `delete_precatorio`

### Visualização por Role

**Admin:**
- Vê todos os precatórios
- Pode criar e distribuir
- Pode marcar como urgente

**Operador Comercial:**
- Vê apenas precatórios atribuídos a ele (`responsavel = user.id`)
- Não vê precatórios que já foram enviados para cálculo
- Pode enviar para cálculo

**Operador de Cálculo:**
- Aba "Fila de Cálculo": vê precatórios em cálculo atribuídos a ele
- Aba "Meus Precatórios": vê precatórios onde é responsável comercial

## 6. Estrutura de Dados

### Tabela precatorios

```sql
-- Campos principais do fluxo
responsavel UUID -- Operador comercial (dono)
responsavel_calculo_id UUID -- Operador de cálculo
status TEXT -- novo, em_contato, em_calculo, etc
urgente BOOLEAN DEFAULT false -- Priorização na fila
prioridade TEXT -- baixa, media, alta, urgente
```

### View precatorios_cards

- Usada para listagem (read-only)
- Contém placeholders para campos display
- Filtra automaticamente deleted_at IS NULL

## 7. Páginas Implementadas

1. **`/admin/precatorios`** - Admin cria e distribui
2. **`/precatorios`** - Lista filtrada por role
3. **`/calculo`** - Fila de cálculo com duas abas
4. **`/precatorios/[id]`** - Detalhes do precatório

## 8. Scripts SQL Necessários

Execute o script `23-adicionar-coluna-urgente.sql` para adicionar a coluna de urgência:

```sql
ALTER TABLE public.precatorios 
ADD COLUMN IF NOT EXISTS urgente BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_precatorios_urgente 
ON public.precatorios(urgente, created_at);
```

## 9. Testando o Fluxo

1. Login como Admin → Criar precatório → Status "novo"
2. Admin → Distribuir para operador comercial → Status "em_contato"
3. Login como Operador Comercial → Ver precatório → Enviar para cálculo
4. Login como Operador de Cálculo → Ver na "Fila de Cálculo" ordenado
5. Marcar como urgente → Precatório sobe para o topo da fila

## Conclusão

O fluxo completo está implementado seguindo as especificações, com separação clara de responsabilidades e ordenação adequada da fila de cálculo (urgente primeiro, depois FIFO por data de criação).
