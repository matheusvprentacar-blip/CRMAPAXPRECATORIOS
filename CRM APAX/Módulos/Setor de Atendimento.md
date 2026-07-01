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

> [!warning] Importação em lote: `violates check constraint "precatorios_natureza_check"`
> A coluna `natureza` tem `CHECK (natureza IN ('Alimentar','Comum'))`. O OCR/Excel devolve a natureza como **texto livre** (`"ALIMENTAR"`, `"alimentício"`, `"Não Alimentar"`, ou até cabeçalhos repetidos como `"PRECATÓRIOS MUNICIPIO"`) e o código só aplicava `.trim()` — qualquer valor fora dos dois aceitos derrubava o lote inteiro.
> **Correção:** helper compartilhado `normalizarNatureza()` em `lib/precatorios/natureza.ts` (NFD + lowercase): `aliment*` → `Alimentar`, `nao aliment*`/`comum` → `Comum`, qualquer outro valor → `null`. Aplicado tanto na importação em lote (`ModalImportacaoLote`) quanto no cadastro manual de atendimento (`ModalNovoCreditoAtendimento`) e no `modal-criar-precatorio` do admin — todos tinham o mesmo campo de natureza como texto livre. Nunca mais quebra o insert por natureza.

> [!warning] Importação em lote: valor saía dividido por 1000 (milhar virava centavos) — duas causas
> Na importação por planilha, valores grandes chegavam à fila divididos por ~1000: `R$ 366.910,00 → R$ 366,91` e também `R$ 391.876,29 → R$ 391,87629`, `R$ 1.902.525,12 → R$ 1,902`.
> **Causa raiz (parte 1 — milhar BR):** a API `importar-excel` lê a planilha com `sheet_to_json(..., { raw: false })`, então o Excel devolve o número **formatado**. Uma célula `366910` sem decimais vira `"366.910"`; o `parseBRL` antigo só removia pontos de milhar quando havia vírgula → `parseFloat("366.910")` lia o ponto como decimal → `366.91`.
> **Causa raiz (parte 2 — locale US, o erro que "persistia"):** planilhas exportadas em **en-US** chegam como `"R$ 391,876.29"` (**vírgula = milhar, ponto = decimal**). O `parseBRL` assumia sempre padrão BR: ao ver a vírgula, fazia `replace(/\./g,"").replace(",", ".")`, removendo o ponto decimal real e promovendo a vírgula de milhar a decimal → `"391.87629"`. A correção anterior (só milhar BR) **não cobria** esse caso.
> **Correção:** `parseBRL` (em `ModalImportacaoLote`) agora é **locale-aware**: quando há **vírgula e ponto**, o separador decimal é o que aparece **por último** (resolve BR `1.234,56` vs US `1,234.56`); só vírgula → decimal BR; só ponto → milhar BR bem-formado (1–3 dígitos + grupos de 3) vira inteiro, senão é decimal. Também aceita número puro. Validado contra a planilha real (188/188 valores corretos; total R$ 179.282.559,27) + regressão BR/US/milhar/decimal/inteiro.

> [!warning] Importação em lote: cabeçalho fora da linha 1 vira colunas `__EMPTY` e registro-lixo
> Planilhas com título/linhas vazias no topo (ex.: cabeçalhos reais na linha 6) faziam o `sheet_to_json` padrão usar a 1ª linha (vazia) como cabeçalho → colunas `__EMPTY`, `__EMPTY_1`… enviadas ao GPT-4o (mapeamento frágil, dependente da amostra) **e** a linha de rótulos (`"Valor"`, `"Credor"`…) virava um **registro falso** importável.
> **Correção:** a API `importar-excel` agora lê como matriz (`header: 1`, `blankrows: false`) e **detecta a linha de cabeçalho real** (primeira linha com ≥ 3 células de texto). Constrói os objetos a partir dela com nomes de coluna únicos (dedup) e pula linhas vazias. Cabeçalho na linha 1 continua funcionando igual (sem regressão).

> [!danger] Importação em lote: `numero_processo ... ja pertence a outro usuario` derrubava o lote inteiro
> O trigger `validar_dono_numero_precatorio_processo` ([[Módulo Admin]]) lança `unique_violation` quando um `numero_processo`/`numero_precatorio` já pertence a **outro dono**. Como o insert era feito em blocos atômicos de 50 (`insert(lote)`), um único conflito abortava os 50 — inclusive os créditos válidos.
> **Causa típica:** duplicata **intra-lote** (mesmo número repetido na planilha, distribuído a operadores diferentes pelo balanceamento) ou registro pré-existente de outro operador.
> **Correção (client-side, sem RPC):** o modal só é aberto por `admin` (visibilidade global), então a importação ficou **resiliente**: tenta o bloco inteiro (caminho rápido) e, ao falhar, reinsere **registro a registro** para que os válidos entrem e os conflitantes sejam isolados. Os recusados são reportados num painel "não importados" com **o nome do operador a quem o crédito pertence** (`montarDuplicataInfo()` reusa o `SELECT` que traz `usuarios.nome` via FK `precatorios_dono_usuario_id_fkey`), reaproveitando o `ModalDuplicata` para ver detalhes / redistribuir.

> [!danger] Card do Kanban não refletia o "primeiro contato" após registro de tentativa
> O card do Kanban lê **apenas `interesse_status`** (chip de interesse e a linha "Realizar primeiro contato com o credor" em `app/(dashboard)/kanban/page.tsx`). O registro de contato (`ModalNovaTentativa`) só atualizava **`status_atendimento`** (`em_contato`/`interessado`/`sem_interesse`) — são **dois campos distintos** e não existe trigger/RPC sincronizando os dois. Resultado: mesmo após registrar contato, o card continuava em `SEM_CONTATO` ("Sem contato" / "Realizar primeiro contato com o credor"). O valor `CONTATO_EM_ANDAMENTO` já existia no enum/chip, mas **nada no código o escrevia**.
> **Correção:** `ModalNovaTentativa` agora, além de gravar `status_atendimento`, promove `interesse_status` de `SEM_CONTATO`/nulo → `CONTATO_EM_ANDAMENTO` (update filtrado por `.or("interesse_status.eq.SEM_CONTATO,interesse_status.is.null")`). Nunca rebaixa status já definido pela triagem (`TEM_INTERESSE`/`SEM_INTERESSE`) e **não** passa o gate jurídico (que só libera em `TEM_INTERESSE`). A decisão formal de interesse continua a cargo da triagem (Kanban/detalhes).

## Arquivos Principais

- `app/(dashboard)/atendimento/page.tsx`
- `components/atendimento/modal-novo-credito-atendimento.tsx`
- `components/atendimento/modal-importacao-lote.tsx`
- `components/atendimento/modal-nova-tentativa.tsx`
- `lib/atendimento/distribuicao-creditos.ts`
- `lib/users/operator-tag.ts`
- `lib/precatorios/natureza.ts` (normalização de natureza compartilhada)

## Veja também

- [[Papéis e Permissões]]
- [[Módulo Admin]]
- [[Ciclo de Vida do Precatório]]
