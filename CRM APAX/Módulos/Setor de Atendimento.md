---
title: Setor de Atendimento
tags:
  - modulo
  - atendimento
  - distribuicao
aliases:
  - Atendimento
  - Setor de Atendimento
---

# Setor de Atendimento

## Visão Geral

Rota base: `/atendimento`  
Roles com acesso: `admin`, `agente_atendimento`, `operador_comercial`, `operador`

O setor de atendimento passou a ser a porta de entrada dos créditos que ainda estão em triagem comercial. O `admin` cadastra ou importa os créditos aqui e já distribui para os operadores antes de sair da área.

## Regras Operacionais

- O cadastro manual de crédito de atendimento acontece em `ModalNovoCreditoAtendimento`.
- A importação em lote acontece em `ModalImportacaoLote`.
- Todo crédito novo de atendimento nasce com:
  - `origem = atendimento`
  - `status_atendimento = na_fila`
  - `responsavel` e `dono_usuario_id` já preenchidos
  - trilha de distribuição admin (`distribuido_por_admin`, `distribuido_por_admin_id`, `distribuido_por_admin_em`)

## Visibilidade

- `admin`
  - vê todos os créditos do atendimento
  - vê `valor_principal` e `valor_atualizado`
- `agente_atendimento`
  - vê todos os créditos do atendimento
  - não vê valores
- `operador_comercial` e `operador`
  - veem apenas créditos distribuídos para si
  - esse filtro vale para todas as abas da tela (`Fila Ativa` e `Arquivados`)
  - quando houver combinação de roles com `agente_atendimento`, o escopo operacional prevalece (continua vendo apenas os créditos distribuídos para si)
  - não veem valores

## Distribuição em Massa

Para lotes grandes, a distribuição agora usa uma prévia balanceada:

- filtro por `operator_tag`
- seleção rápida dos operadores visíveis
- balanceamento automático pelo `valor_principal`
- resumo por operador com quantidade de créditos e soma estimada

As tags operacionais disponíveis são:

- `operador`
- `freelancer`
- `externo`

## Interesse do Credor

- Enquanto o credor não demonstra interesse, o crédito permanece no atendimento.
- Quando o status muda para `interessado`, o crédito sai da triagem e segue para o pipeline principal.
- Quando muda para `sem_interesse`, o item fica arquivado dentro do próprio módulo.
- A marcação de `interessado` deve ser feita via registro de contato do Atendimento (não por atalho direto).
- Para resultado `interessado`, agora é obrigatório informar:
  - nome de quem recebeu a chamada
  - telefone que atendeu
  - se o credor deseja receber proposta (`sim`/`não`)
- O fluxo normal na triagem só deve avançar após existir esse registro completo no Atendimento.

## Arquivos Principais

- `app/(dashboard)/atendimento/page.tsx`
- `components/atendimento/modal-novo-credito-atendimento.tsx`
- `components/atendimento/modal-importacao-lote.tsx`
- `lib/atendimento/distribuicao-creditos.ts`
- `lib/users/operator-tag.ts`

## Veja também

- [[Papéis e Permissões]]
- [[Módulo Admin]]
- [[Ciclo de Vida do Precatório]]
