---
title: Kanban
tags:
  - modulo
  - kanban
  - workflow
aliases:
  - Kanban
---

# Kanban

## Visão Geral

Rota: `/kanban`  
Roles principais: `gestor`, `juridico`, `admin`  
Arquivo: `app/(dashboard)/kanban/`

Quadro Kanban visual que representa o workflow dos precatórios, incluindo o fluxo jurídico (gates de parecer jurídico).

## Colunas do Kanban

Definidas em `app/(dashboard)/kanban/columns.ts`:

Cada coluna tem:
- `id` — identificador único
- `titulo` — nome exibido
- `statusIds` — array de status mapeados para a coluna

### Ajuste recente

- A coluna `docs_credor` ("Documentos do credor") foi removida do quadro. Todos os créditos que estavam nessa coluna foram migrados para `triagem_interesse`. O fluxo normal de triagem agora vai direto para `analise_processual_inicial`.
- A coluna `recebidos_admin` foi removida do quadro.
- Créditos que antes cairiam em `Recebidos do Admin` agora entram direto em `triagem_interesse` para operadores comerciais.
- Resultado esperado: menos uma etapa visual no quadro e fluxo mais direto de entrada para triagem.
- A opção de filtro avançado `Recebidos do Admin` também foi removida para manter consistência da UI.
- A coluna visual `juridico` também foi removida do Kanban.
- Status `juridico` continua existindo no fluxo e agora é exibido na coluna `analise_processual_inicial` (Pré-análise jurídica), sem perda de funcionalidade jurídica.
- A coluna `encerrados` passou a concentrar também os status `reprovado` e `nao_elegivel`, além de pausas e sem interesse.
- Para status de pausa (`pausado_credor` e `pausado_documentos`), o modal exige data de retorno obrigatória (`data_recontato`) e motivo da pausa.
- O status `sem_interesse` continua com tratamento separado: motivo obrigatório e recontato opcional.
- Na triagem de interesse da tela de detalhes do precatório, o encaminhamento foi simplificado para 5 fluxos: `normal`, `pausado`, `encerrado`, `não elegível` e `credor vendeu para outro`.
- Para créditos com `origem = atendimento`, o fluxo `normal` exige validação prévia de contato registrado no Atendimento como `interessado`.
- Retorno específico liberado no drag-and-drop: quando o cartão sai da coluna `analise_processual_inicial` (inclui cards com status `juridico`) e volta para `triagem_interesse`, a movimentação é direta, sem abrir modal de triagem. Os demais envios para triagem continuam exigindo o modal.
- Na tela de detalhes do precatório (`/precatorios/detalhes`), foi adicionado o botão `Voltar para triagem` na barra de status para o mesmo cenário específico (`analise_processual_inicial`/`juridico`/`analise_juridica` → `triagem_interesse`), sem abrir modal. Esse botão fica disponível para `admin`, `juridico`, `operador` e `operador_comercial`.

## Gate de Permissão por Fase

> [!warning] Bloqueio de operadores a partir de `analise_processual_inicial`
> Implementado em `app/(dashboard)/precatorios/detalhes/page.tsx`.

A partir da fase `analise_processual_inicial` (Pré-análise jurídica), **apenas `admin` e `juridico`** podem:
- Avançar o crédito para a próxima fase ("Enviar para próxima fase")
- Editar os dados gerais do crédito (botão "Editar" fica oculto para operadores)
- Modificar a seção "Gestão de Análise" (sempre restrita, independente da fase)

Para operadores bloqueados, o botão de avanço é substituído por um aviso âmbar:
`"Apenas Admin ou Jurídico pode avançar daqui"`.

Variáveis-chave no arquivo de detalhes:
- `isJuridicoOrAdmin` — `roles.includes("admin" | "juridico")`
- `STAGES_BLOQUEADOS_OPERADOR` — Set com todos os status a partir de `analise_processual_inicial`
- `creditoBloqueadoParaOperador` — `!isJuridicoOrAdmin && STAGES_BLOQUEADOS_OPERADOR.has(currentColumnId)`
- `canEditGestaoAnalise` — sempre igual a `isJuridicoOrAdmin`

## Fluxo Jurídico (Gates Kanban)

> [!info] Gates Jurídicos
> Implementado nas fases 1 a 3 do projeto. O precatório só avança após aprovação jurídica formal registrada em `parecer_juridico`.

- Solicitação de parecer feita via form no kanban
- Resultado: `viavel` / `inviavel` / `pendente`
- Gate impede avanço sem parecer aprovado

## Escrituras no Kanban

Status do fluxo de escrituras:
```
nao_iniciado → em_andamento → pendente_assinatura → concluido
```

Responsável: `gestor_escrituras` (`responsavel_escrituras_id`)

## Campos Relevantes (tabela `precatorios`)

| Campo | Descrição |
|-------|-----------|
| `status_kanban` | Status atual no kanban |
| `localizacao_kanban` | Coluna atual |
| `status_escrituras` | Status do fluxo de escrituras |
| `interesse_status` | Interesse/contato do credor exibido no card (chip + linha "Realizar primeiro contato"). **Não confundir com `status_atendimento`** — ver [[Setor de Atendimento]] |

> [!warning] O card usa `interesse_status`, não `status_atendimento`
> O chip de interesse e a linha "Realizar primeiro contato com o credor" derivam **só de `interesse_status`**. O registro de contato do Atendimento atualiza `status_atendimento`; a sincronização `SEM_CONTATO → CONTATO_EM_ANDAMENTO` é feita em `ModalNovaTentativa`. Detalhes em [[Setor de Atendimento]].

## Veja também
- [[Ciclo de Vida do Precatório]]
- [[Módulo Admin]]
- [[Papéis e Permissões]]
