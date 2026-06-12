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
  - `status_kanban = triagem_interesse`
  - `localizacao_kanban = triagem_interesse`
  - `responsavel` e `dono_usuario_id` já preenchidos
  - trilha de distribuição admin (`distribuido_por_admin`, `distribuido_por_admin_id`, `distribuido_por_admin_em`)
- O preenchimento explícito de `status_kanban` e `localizacao_kanban` evita que o banco use defaults legados incompatíveis com `precatorios_localizacao_kanban_check`.

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

## Troubleshooting

> [!warning] Importação em lote: `invalid input syntax for type date: "Apresentação"`
> A coluna `data_expedicao` é `DATE`. Na importação por planilha o valor da célula era enviado **cru** para o banco; qualquer texto não-data (ex.: cabeçalhos repetidos da planilha como "Apresentação") derrubava o lote inteiro de 50 registros.
> **Correção:** `ModalImportacaoLote` agora passa `data_expedicao` por `parseDataParaISO()`, que converte ISO/`DD-MM-AAAA`/serial Excel e devolve `null` para qualquer valor não reconhecível. Nunca mais quebra o insert por causa de data.

> [!danger] Registro de contato: "coluna faltando no schema cache" (`contato_nome does not exist`, code 42703)
> Ao registrar tentativa com resultado **interessado**, `ModalNovaTentativa` grava `contato_nome`, `contato_telefone` e `interesse_receber_proposta` em `atendimento_tentativas`. Essas colunas só existem na migration **245** (`20260419123000_245_atendimento_interesse_contato_obrigatorio`).
> **Causa raiz:** as migrations do remoto foram aplicadas **manualmente e fora de ordem** — a 244 e a 247 estão aplicadas, mas a 245 foi pulada. Confirmado por probe na API REST (`242` OK, `245` ausente).
> **Correção:** aplicar o SQL da 245 (idempotente, `ADD COLUMN IF NOT EXISTS`) + `NOTIFY pgrst, 'reload schema';` para recarregar o cache do PostgREST.

> [!warning] A constraint da 245 precisa ser `NOT VALID` em produção
> A tabela já tinha tentativas `resultado='interessado'` (8 linhas) gravadas **antes** das colunas de contato existirem. Adicionar a constraint validada falha com `23514 ... is violated by some row`, e como o SQL Editor roda tudo em uma transação, o `ADD COLUMN` também sofre rollback.
> A constraint foi alterada para `... NOT VALID`: vale para todo INSERT/UPDATE novo, sem rejeitar o histórico legado (cujos dados de contato nunca existiram e não podem ser backfilled).

> [!tip] Como auditar gap de schema sem acesso ao Postgres
> Com a `SUPABASE_SERVICE_ROLE_KEY` dá para checar se uma coluna existe no remoto via `GET /rest/v1/<tabela>?select=<coluna>&limit=1`. Retorno com `"code":"42703"` = coluna ausente; retorno com dados/`[]` = coluna existe.

## Arquivos Principais

- `app/(dashboard)/atendimento/page.tsx`
- `components/atendimento/modal-novo-credito-atendimento.tsx`
- `components/atendimento/modal-importacao-lote.tsx`
- `components/atendimento/modal-nova-tentativa.tsx`
- `lib/atendimento/distribuicao-creditos.ts`
- `lib/users/operator-tag.ts`

## Veja também

- [[Papéis e Permissões]]
- [[Módulo Admin]]
- [[Ciclo de Vida do Precatório]]
