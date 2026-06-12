---
title: Papéis e Permissões
tags:
  - sistema
  - auth
  - roles
aliases:
  - Papéis e Permissões
  - Roles
---

# Papéis e Permissões

## Lista de Roles (13 perfis)

| Role | Nome exibido | Acesso principal |
|------|-------------|-----------------|
| `admin` | Administrador | Acesso total ao sistema |
| `tecnico_ti` | Técnico TI | Tratado como admin no frontend |
| `gestor` | Gestor | Dashboard global, kanban, propostas |
| `operador_comercial` | Operador Comercial | Proposta, negociação e operação no atendimento |
| `operador_calculo` | Operador de Cálculo | Fila de cálculo, calculadora |
| `operador` | Operador Geral | Operações gerais e operação no atendimento |
| `analista` | Analista | Análise processual |
| `gestor_certidoes` | Gestor de Certidões | `/gestao-certidoes` |
| `gestor_oficio` | Gestor de Ofícios | `/gestao-oficios` |
| `gestor_escrituras` | Gestor de Escrituras | `/gestao-escrituras` |
| `juridico` | Jurídico | Parecer jurídico, kanban jurídico |
| `financeiro` | Financeiro | Dashboard financeiro |
| `agente_atendimento` | Agente de Atendimento | `/atendimento`, visão global da fila sem valores |

> [!info] Múltiplos roles
> Um usuário pode ter **até 2 roles simultaneamente** (array no campo `role`).

## Helpers de Verificação

```typescript
// Verifica um role específico
hasRole(roles, "admin")

// Verifica se tem QUALQUER um dos roles
hasAnyRole(roles, ["admin", "gestor"])

// Verifica se tem TODOS os roles
hasAllRoles(roles, ["operador", "juridico"])
```

## Escopo do Dashboard

Usuários com as roles abaixo veem **todos os precatórios** (escopo global):

```
admin | gestor | financeiro | gestor_* (qualquer prefixo gestor_)
```

Os demais veem apenas os precatórios onde aparecem como:
- `dono_usuario_id`
- `criado_por`
- `responsavel`
- `responsavel_juridico_id`
- `responsavel_calculo_id`

## Escopo da Fila de Cálculo

O perfil `operador_calculo` possui escopo ampliado dentro do módulo de cálculo:

- vê todos os créditos em `fila_calculo`, `pronto_calculo`, `calculo_andamento` e `calculo_concluido`;
- pode abrir os detalhes desses créditos enquanto estiverem no escopo de cálculo;
- pode iniciar o andamento somente ao concluir a Etapa 1 da calculadora;
- pode retornar o crédito para `triagem_interesse` com motivo obrigatório quando faltarem dados ou documentos.

Esse escopo não torna o operador de cálculo um perfil global do CRM; ele fica restrito às filas e ações necessárias ao cálculo.

## Escopo da Análise Processual

A tela `/analise-processual` (menu **Análise Processual**) é liberada para `admin`, `gestor`, `operador_calculo` e `analista`.

O perfil `analista` possui escopo dedicado para fazer a triagem jurídica **sem ser admin**:

- vê e edita os créditos parados na coluna **Pré-análise jurídica** do kanban, ou seja, com `status_kanban` / `localizacao_kanban` / `status` igual a `analise_processual_inicial`, `juridico` ou `analise_juridica` (os três `statusIds` que a coluna agrupa em `kanban/columns.ts`);
- registra o parecer preenchendo os campos `analise_*` (penhora, cessão, herdeiros, viabilidade, ITCMD, valores/percentuais e observações);
- **não** altera o status do crédito por essa tela — a movimentação para o cálculo continua sendo feita pelo Kanban.

> [!info] Por que precisa de duas camadas
> O menu (`app/(dashboard)/layout.tsx`) apenas mostra/esconde o link; quem realmente autoriza ler e salvar é a **RLS**. As policies `precatorios_analista_scope_select` e `precatorios_analista_scope_update` (migration `251`, espelhando a `248` do `operador_calculo`) é que dão o escopo ao `analista`. Sem a policy, a tela abriria mas o "Salvar resultado" falharia.

> [!warning] Escopo restrito
> Fora dos status da coluna Pré-análise jurídica (`analise_processual_inicial`, `juridico`, `analise_juridica`), o `analista` continua sem acesso de edição global — ele só enxerga créditos onde também seja dono (`dono_usuario_id`, `criado_por`, `responsavel`, etc.).

> [!danger] A policy precisa estar aplicada no banco
> A tela usa o client autenticado (RLS ligada). Se a migration `251` **não tiver sido aplicada** no Supabase, a query não retorna erro — ela simplesmente devolve **lista vazia**, porque a RLS filtra todos os créditos onde o analista não é dono. Sintoma idêntico a "não vê nada". Após criar/alterar a `251`, rode `supabase db push` (ou cole o SQL no SQL Editor). A migration é idempotente (`CREATE OR REPLACE` + `DROP POLICY IF EXISTS`), então pode ser reaplicada sem risco.

## Setor de Atendimento

### Quem acessa

- `admin`
- `agente_atendimento`
- `operador_comercial`
- `operador`

### Regras de visibilidade

- `admin` vê todos os créditos originados no atendimento e também os campos de valor dentro da aba.
- `agente_atendimento` vê todos os créditos do atendimento, mas sem `valor_principal` e `valor_atualizado`.
- `operador_comercial` e `operador` veem apenas os créditos distribuídos para si (`responsavel` / `dono_usuario_id`) e também sem valores.

### Tags operacionais

Usuários operacionais de atendimento passam a ter o campo `operator_tag` em `usuarios`, com os valores:

- `operador`
- `freelancer`
- `externo`

Essas tags servem para:

- filtrar operadores na distribuição manual
- montar lotes grandes com seleção rápida por perfil operacional
- manter a mesma role com segmentação mais simples no admin

## Fluxo de Distribuição Admin

> [!warning] Redistribuição de precatórios
> Somente `admin` pode redistribuir precatórios já atribuídos.
> O processo exige **dois passos** no Supabase por restrição de RLS:
> 1. Limpar campos (`dono_usuario_id = null`, `responsavel = null`, `responsavel_calculo_id = null`)
> 2. Atribuir os novos responsáveis

Veja [[Módulo Admin]] para detalhes da implementação.

## Veja também
- [[Arquitetura Técnica]]
- [[Módulo Admin]]
- [[Ciclo de Vida do Precatório]]
