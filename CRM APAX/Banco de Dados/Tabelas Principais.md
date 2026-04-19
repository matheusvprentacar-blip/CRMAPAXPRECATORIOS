---
title: Tabelas Principais — Supabase
tags:
  - banco-de-dados
  - supabase
  - schema
aliases:
  - Tabelas Principais
---

# Tabelas Principais — Supabase

> [!info] Projeto Supabase
> **ID**: `ldtildnelijndhswcmss`  
> **Nome**: CRM APAX Investimentos  
> **Região**: `sa-east-1` (São Paulo)  
> **Status**: ACTIVE_HEALTHY

## Tabela: `precatorios` (tabela central)

65+ campos. Campos mais importantes:

### Identificação
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `numero_precatorio` | text | Número do precatório |
| `numero_processo` | text | Número CNJ do processo |
| `numero_oficio` | text | Número do ofício |
| `titulo` | text | Título/referência interna |

### Pessoas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `credor_nome` | text | Nome do credor |
| `credor_cpf_cnpj` | text | CPF ou CNPJ |
| `credor_telefone` | text | Telefone para triagem/comercial |
| `advogado_nome` | text | Advogado do credor |
| `conjuge` | text | Cônjuge (se aplicável) |
| `herdeiro` | text | Herdeiro (se aplicável) |
| `cessionario` | text | Cessionário |

### Financeiro
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `valor_principal` | numeric | Valor principal do precatório |
| `valor_juros` | numeric | Juros calculados |
| `valor_selic` | numeric | Correção SELIC |
| `valor_atualizado` | numeric | Valor total atualizado |
| `saldo_liquido` | numeric | Valor líquido após deduções |

### Deduções
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pss_valor` | numeric | Valor PSS deduzido |
| `irpf_valor` | numeric | IRPF deduzido |
| `honorarios_valor` | numeric | Honorários contratuais |
| `adiantamento_valor` | numeric | Adiantamentos recebidos |

### Propostas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `proposta_menor_percentual` | numeric | % proposta menor |
| `proposta_menor_valor` | numeric | Valor proposta menor |
| `proposta_maior_percentual` | numeric | % proposta maior |
| `proposta_maior_valor` | numeric | Valor proposta maior |

### Status e Workflow
| Campo | Tipo | Valores possíveis |
|-------|------|------------------|
| `status` | text | `novo`, `em_andamento`, `em_calculo`, `calculado`, `concluido` |
| `prioridade` | text | `baixa`, `normal`, `alta`, `urgente` |
| `status_kanban` | text | Status no kanban |
| `localizacao_kanban` | text | Coluna do kanban |
| `origem` | text | Ex.: `atendimento`, `kanban`, `manual` |
| `status_atendimento` | text | `na_fila`, `em_contato`, `interessado`, `sem_interesse` |
| `urgente` | boolean | Flag de urgência |

### Responsáveis
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `dono_usuario_id` | uuid | Responsável principal |
| `responsavel` | uuid | Campo legado (= dono_usuario_id) |
| `responsavel_calculo_id` | uuid | Operador de cálculo |
| `responsavel_juridico_id` | uuid | Responsável jurídico |
| `responsavel_escrituras_id` | uuid | Responsável de escrituras |

### Distribuição Admin
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `distribuido_por_admin` | boolean | Distribuído manualmente pelo admin |
| `distribuido_por_admin_id` | uuid | ID do admin que distribuiu |
| `distribuido_por_admin_em` | timestamptz | Data/hora da distribuição |

### SLA
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sla_horas` | numeric | SLA em horas |
| `sla_status` | text | `no_prazo`, `atencao`, `atrasado` |
| `tipo_atraso` | text | Causa do atraso |
| `impacto_atraso` | text | `baixo`, `medio`, `alto` |
| `motivo_atraso_calculo` | text | Descrição do motivo |

---

## Tabela: `precatorio_extracao`

Pipeline de extração OCR/AI por documento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `precatorio_id` | uuid | FK → precatorios |
| `status` | text | `processando`, `concluido`, `erro`, `aplicado` |
| `result_json` | jsonb | Resultado completo com confidências |
| `checklist_json` | jsonb | Checklist de documentos |
| `campos_aplicados` | text[] | Campos já aplicados ao precatório |

---

## Tabela: `precatorio_extracao_campo`

Campos individuais extraídos com nível de confiança.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `campo` | text | Nome do campo extraído |
| `valor` | text | Valor extraído |
| `confianca` | text | `alta`, `media`, `baixa` |
| `score` | integer | Score 0-100 |
| `fonte_documento` | text | Documento de origem |
| `pagina` | integer | Página do documento |
| `conflito` | boolean | Conflito entre fontes |

---

## Tabela: `usuarios`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK (= auth.users.id) |
| `email` | text | Email de login |
| `nome` | text | Nome completo |
| `role` | text[] | Array de roles (até 2) |
| `operator_tag` | text | Segmentação operacional: `operador`, `freelancer`, `externo` |
| `ativo` | boolean | Usuário ativo |
| `foto_url` | text | URL da foto de perfil |
| `telefone` | text | Telefone |

---

## Outras Tabelas

| Tabela | Uso |
|--------|-----|
| `atividade` | Log de atividades e eventos |
| `timeline_precatorios` | Timeline visual por precatório |
| `comentario` | Comentários nos precatórios |
| `chat_mensagens` | Mensagens do chat interno |
| `comunicados` | Comunicados/anúncios internos |
| `agenda_eventos` | Eventos do calendário |
| `parecer_juridico` | Pareceres jurídicos formais |
| `proposta` | Histórico de propostas negociadas |
| `escrituras` | Gestão de escrituras |
| `financial_transactions` | Movimentações financeiras |
| `market_snapshots` | Snapshots de CDI, SELIC, Tesouro |
| `precatorio_simulations` | Resultados de simulações comparativas |
| `telemetria_uso` | Métricas de uso por usuário/sessão (origem operacional atual: `web`) |
| `configuracoes_sistema` | Configurações globais (tema, etc.) |
| `notifications` | Notificações push dos usuários |

### Atendimento: `atendimento_tentativas`

Registro de tentativas de contato do setor de atendimento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `precatorio_id` | uuid | FK para `precatorios` |
| `agente_id` | uuid | Usuário que registrou o contato |
| `agente_nome` | text | Nome exibido do agente |
| `tipo` | text | `ligacao`, `whatsapp`, `email` |
| `resultado` | text | `atendeu`, `nao_atendeu`, `interessado`, `sem_interesse` |
| `observacoes` | text | Observações livres |
| `contato_nome` | text | Obrigatório quando `resultado = interessado` |
| `contato_telefone` | text | Obrigatório quando `resultado = interessado` |
| `interesse_receber_proposta` | boolean | Obrigatório quando `resultado = interessado` |

---

## RPCs (Funções PostgreSQL)

| RPC | Uso |
|-----|-----|
| `buscar_precatorios_com_summary` | Busca paginada com filtros complexos |
| `dashboard_kpis` | KPIs consolidados do dashboard |
| `get_critical_precatorios` | Precatórios críticos (admin only) |
| `notify_create` | Criação de notificação |
| `registrar_negociacao_proposta` | Registro de negociação |

## Veja também
- [[Arquitetura Técnica]]
- [[Ciclo de Vida do Precatório]]
- [[Fluxo de Cálculo]]
