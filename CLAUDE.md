# Claude Project Instructions

## Comando de Release

Interprete `faca o update` como comando de release.

Execute:
- `npm run release:update`

Comportamento esperado:
- Bump de versao (patch default).
- Sincroniza versao em `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`.
- Commit automatico com tag `vX.Y.Z`.
- Push da branch atual e da tag para `origin`.
- Informar a versao final ao usuario.

Comandos alternativos:
- Versao fixa: `npm run release:update -- -Version X.Y.Z`
- Minor: `npm run release:update:minor`
- Major: `npm run release:update:major`

---

## Base de Conhecimento — Obsidian Vault

O vault Obsidian do projeto está em `CRM APAX/`. Ele é a **fonte de verdade** sobre arquitetura, módulos, fluxos de negócio e banco de dados.

### Mapa de notas

| Nota | Quando consultar |
|------|-----------------|
| `CRM APAX/Sistema/Visão Geral.md` | Qualquer dúvida sobre stack, módulos ou APIs externas |
| `CRM APAX/Sistema/Arquitetura Técnica.md` | Providers, estrutura de pastas, cache, padrões de cliente Supabase |
| `CRM APAX/Sistema/Papéis e Permissões.md` | Roles, helpers `hasRole`, escopo de dashboard |
| `CRM APAX/Módulos/Calculadora de Precatórios.md` | Qualquer alteração nos steps de cálculo ou componentes `ui/calc/` |
| `CRM APAX/Módulos/Dashboard.md` | KPIs, queries do dashboard, cache de métricas |
| `CRM APAX/Módulos/Kanban.md` | Workflow kanban, gates jurídicos, escrituras |
| `CRM APAX/Módulos/Módulo Admin.md` | Redistribuição, reset de senha, telemetria |
| `CRM APAX/Banco de Dados/Tabelas Principais.md` | Schema de tabelas, campos, RPCs do Supabase |
| `CRM APAX/Processos/Ciclo de Vida do Precatório.md` | Etapas, status, SLA, distribuição |
| `CRM APAX/Processos/Fluxo de Cálculo.md` | Modelos A/B/C, deduções PSS/IRPF, propostas |

### Regras de consulta OBRIGATÓRIA

Antes de qualquer alteração no projeto, Claude DEVE:

1. **Ler a nota relevante** do vault listada acima que corresponde ao módulo sendo modificado.
2. **Verificar se há contradições** entre a nota e o estado atual do código.
3. **Usar as informações da nota** para embasar decisões de implementação (ex: nomes de campos, padrões de estilo, roles esperados).

### Regras de atualização OBRIGATÓRIA

Após concluir qualquer alteração significativa, Claude DEVE atualizar o vault:

**Atualizar nota existente** quando:
- Um campo da tabela `precatorios` for adicionado, removido ou renomeado → atualizar `Tabelas Principais.md`
- Um novo role for criado → atualizar `Papéis e Permissões.md`
- Um step da calculadora for modificado → atualizar `Calculadora de Precatórios.md`
- Um fluxo de negócio mudar → atualizar a nota de processo correspondente
- Um bug de RLS/Supabase for corrigido com uma solução não óbvia → documentar em `Módulo Admin.md` ou na nota do módulo afetado
- Uma nova estratégia de cache for implementada → atualizar `Arquitetura Técnica.md`

**Criar nota nova** em `CRM APAX/Módulos/` quando:
- Um novo módulo ou rota for criado no sistema
- Uma nova integração externa for adicionada

**Criar nota nova** em `CRM APAX/Processos/` quando:
- Um novo fluxo de negócio for implementado

### Formato das notas (Obsidian Flavored Markdown)

```yaml
---
title: Nome da Nota
tags:
  - categoria
aliases:
  - Nome Alternativo
---
```

- Usar `[[wikilinks]]` para referenciar outras notas do vault (não caminhos relativos).
- Usar callouts `> [!warning]`, `> [!info]`, `> [!tip]` para informações críticas.
- Incluir diagramas Mermaid em fluxos complexos.
- Sempre adicionar seção `## Veja também` com wikilinks relacionados.
- NÃO documentar código óbvio — só documenta o que seria surpreendente para um futuro colaborador.

### Exemplo de fluxo completo

Quando o usuário pedir: *"adicionar campo X na tabela precatorios"*:

1. Ler `CRM APAX/Banco de Dados/Tabelas Principais.md` para entender o schema atual.
2. Implementar a migration SQL e atualizar o código.
3. Após concluir, abrir `Tabelas Principais.md` e adicionar o novo campo na seção correspondente.

Quando o usuário pedir: *"criar novo módulo de gestão de contratos"*:

1. Ler `CRM APAX/Sistema/Visão Geral.md` e `Papéis e Permissões.md` para entender o padrão de módulos existentes.
2. Implementar o módulo seguindo os padrões do projeto.
3. Criar `CRM APAX/Módulos/Gestão de Contratos.md` documentando rota, roles, tabelas usadas e fluxo.

---

## Protocolo Claude e Codex via Obsidian

Quando o usuário distribuir a execução entre agentes, por exemplo:
- `use o claude e faça o frontend`
- `use o codex e faça o backend`
- `use o codex e corrija`

Claude DEVE usar o vault como canal de handoff com o Codex.

### Fluxo obrigatório

1. Ler `CRM APAX/Agentes/Painel Claude Codex.md`.
2. Criar ou atualizar uma nota em `CRM APAX/Agentes/Tarefas/` para a tarefa.
3. Registrar nessa nota:
   - agente atual
   - escopo (`frontend`, `backend`, `correcao`, `fullstack`, `docs`, etc.)
   - pedido do usuário
   - contexto consultado
   - arquivos alterados
   - testes executados ou pendentes
   - bloqueios
   - próximo passo
   - destino do handoff (`claude`, `codex` ou `usuario`)
4. Antes de encerrar a sessão, atualizar a nota de handoff e a nota diária do dia.

### Regras

- Claude tende a assumir `frontend` e Codex tende a assumir `backend`, mas a instrução explícita do usuário sempre prevalece.
- Se a tarefa já tiver uma nota aberta, Claude deve continuar na mesma nota.
- Se a tarefa mudar de dono, atualizar a nota existente em vez de criar outra.
