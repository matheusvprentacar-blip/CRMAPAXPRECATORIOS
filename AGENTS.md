# Agent Release Rules

Quando o usuario disser `faca o update` (com ou sem cedilha), trate como comando de release.

Fluxo obrigatorio:
1. Escrever notas da release (obrigatorio) com o que foi feito.
2. Rodar `npm run release:update -- -ReleaseNotes "..."` ou `npm run release:update -- -ReleaseNotesFile caminho`.
3. Garantir bump de versao em:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
4. Fazer commit e criar tag `vX.Y.Z`.
5. Fazer push da branch atual e da tag para `origin`.
6. Confirmar para o usuario a versao publicada.

Regras:
- Bump padrao: `patch`.
- Se o usuario pedir versao exata, usar:
  - `npm run release:update -- -Version X.Y.Z -ReleaseNotes "..."`
- Se pedir `minor` ou `major`, usar:
  - `npm run release:update:minor -- -ReleaseNotes "..."`
  - `npm run release:update:major -- -ReleaseNotes "..."`
- Toda release deve ter notas; sem notas o script deve falhar.
- As notas da release devem ser publicadas no GitHub Release.
- Nao incluir artefatos de build em commit (`dist/`, `backups/`, `supabase/.temp/`).
- O updater do Tauri e gerado pelo workflow de release em `.github/workflows/release.yml` apos push da tag.

## Regra Obsidian / Memoria do Projeto

O vault Obsidian oficial do projeto fica em `CRM APAX/` e deve ser tratado como memoria operacional do projeto.

Fluxo obrigatorio para qualquer tarefa que altere o projeto:
1. Consultar `CRM APAX/🏠 Índice.md` antes de assumir contexto do negocio, arquitetura, modulos, processos ou banco.
2. Ler tambem as notas do assunto afetado em `CRM APAX/Sistema`, `CRM APAX/Módulos`, `CRM APAX/Processos` e `CRM APAX/Banco de Dados`, conforme a tarefa.
3. Depois de concluir mudancas relevantes em codigo, banco, configuracao, fluxo operacional ou documentacao tecnica, atualizar a nota tematica correspondente no vault.
4. Registrar a mudanca na nota diaria `CRM APAX/YYYY-MM-DD.md` do dia atual. Se a nota nao existir, criar.
5. O registro diario deve incluir, no minimo:
   - contexto da mudanca
   - modulos, arquivos ou areas impactadas
   - decisao tomada
   - pendencias ou proximos passos, se houver

Regras:
- O codigo-fonte continua sendo a fonte da verdade. Se houver divergencia entre codigo e Obsidian, corrigir o vault no mesmo trabalho.
- Nao registrar segredos, credenciais, tokens, dados pessoais ou dumps sensiveis no Obsidian.
- Evitar notas duplicadas. Se ja existir uma pagina adequada, atualizar a existente em vez de criar outra.
- Quando nao houver nota adequada, criar uma nova pagina no diretório mais proximo do assunto dentro de `CRM APAX/`.

## Protocolo Claude e Codex

Quando o usuario distribuir trabalho entre agentes, por exemplo:
- `use o codex e faca o backend`
- `use o claude e faca o frontend`
- `use o codex e corrija`

o Codex deve tratar isso como tarefa compartilhada via Obsidian.

Fluxo obrigatorio:
1. Consultar `CRM APAX/Agentes/Painel Claude Codex.md`.
2. Criar ou atualizar uma nota em `CRM APAX/Agentes/Tarefas/` para a tarefa.
3. Registrar na nota, no minimo:
   - agente atual
   - escopo (`frontend`, `backend`, `correcao`, `fullstack`, `docs`, etc.)
   - pedido do usuario
   - contexto consultado
   - arquivos alterados
   - testes executados ou pendentes
   - proximo passo
   - para quem vai o handoff (`claude`, `codex` ou `usuario`)
4. Antes de encerrar a tarefa, atualizar a nota de handoff e a nota diaria do dia.

Regras:
- Claude tende a `frontend` e Codex tende a `backend`, mas a instrucao explicita do usuario sempre prevalece.
- Se a tarefa mudar de dono no meio, atualizar a mesma nota em vez de abrir outra.
- Se houver nota compartilhada existente para o mesmo assunto, continuar nela.
