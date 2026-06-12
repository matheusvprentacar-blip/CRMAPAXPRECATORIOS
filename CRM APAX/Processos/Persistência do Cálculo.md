---
title: Persistência do Cálculo
tags:
  - processo
  - calculo
  - persistencia
aliases:
  - Persistência do Cálculo
---

# Persistência do Cálculo

## Fluxo canônico de salvamento

Arquivos principais:

- `components/calculador-precatorios.tsx`
- `app/(dashboard)/calculo/page.tsx`
- `components/precatorios/modal-calculo-manual.tsx`
- `app/(dashboard)/kanban/page.tsx`

Ao finalizar um cálculo, o fluxo deve:

1. Atualizar a linha principal em `precatorios` com os valores financeiros consolidados.
2. Persistir o workflow com os três campos alinhados no mesmo identificador canônico do Kanban.
3. Criar a nova versão em `precatorio_calculos`.
4. Atualizar `calculo_ultima_versao`.
5. Registrar atividade operacional quando possível.

## Regra crítica de workflow

- Para estados do Kanban, não misturar alias legados em `status` com ids canônicos em `status_kanban` e `localizacao_kanban`.
- No fechamento do cálculo, usar `calculo_concluido` nos três campos.
- No início efetivo do cálculo, usar `calculo_andamento` nos três campos.
- O início efetivo ocorre somente após a conclusão da Etapa 1 (`Dados básicos`) da calculadora, não ao abrir a tela `/calcular`.

## Motivo

- Existe legado de trigger/sincronização entre `status` e `localizacao_kanban`.
- Se `status = calculado` e `localizacao_kanban = calculo_concluido`, a sincronização pode empurrar `calculado` para `localizacao_kanban`, violando a constraint `precatorios_localizacao_kanban_check`.
- O mesmo risco vale para `em_calculo` versus `calculo_andamento`.

## Colunas canônicas vs legadas (não regredir)

> [!danger] Erro `Could not find the 'X' column of 'precatorios' in the schema cache`
> Acontece quando um `.update()/.insert()` em `precatorios` envia uma chave de **coluna de topo** que não existe no schema. As colunas abaixo **não existem** e nunca devem ser gravadas como coluna (só podem aparecer dentro do JSONB `dados_calculo`):
>
> | Legada (NÃO gravar) | Canônica (usar) |
> |---|---|
> | `irpf_total` | `irpf_valor` |
> | `pss_total` | `pss_valor` |
> | `menor_proposta` | `proposta_menor_valor` |
> | `maior_proposta` | `proposta_maior_valor` |
> | `percentual_menor` | `proposta_menor_percentual` |
> | `percentual_maior` | `proposta_maior_percentual` |
> | `valor_liquido_credor` | (sem coluna — só em `dados_calculo`) |
> | `taxa_juros_moratorios` | (sem coluna — só em `dados_calculo`) |
> | `qtd_salarios_minimos` | (sem coluna — só em `dados_calculo`) |
>
> Esse bug é **recorrente** (já documentado em [[2026-05-04]]): a correção vive no `components/calculador-precatorios.tsx`, mas se um build **antigo** for deployado (ou a correção ficar só no working tree sem commit/deploy), o erro volta em produção mesmo com o código local correto. Sempre confirmar: `git show HEAD:components/calculador-precatorios.tsx` **não** pode conter `irpf_total`.

## Regras de robustez

- Só exibir sucesso depois que `precatorios` e `precatorio_calculos` estiverem gravados.
- Falha no registro de atividade não deve invalidar o cálculo principal, mas deve ser logada.
- Mensagens de erro devem diferenciar falha no update principal de falha no versionamento/histórico.

## Retorno para triagem pelo cálculo

- O operador de cálculo pode devolver um crédito para `triagem_interesse` a partir da tela da calculadora quando faltarem dados para calcular.
- O retorno exige motivo textual obrigatório, com exemplos operacionais como falta de documentos, falta de identificação de herdeiro, dados financeiros incompletos ou divergência no ofício.
- O retorno deve alinhar `status`, `status_kanban` e `localizacao_kanban` em `triagem_interesse`.
- O motivo deve ficar registrado em `interesse_observacao` e também em `atividades` quando possível.
