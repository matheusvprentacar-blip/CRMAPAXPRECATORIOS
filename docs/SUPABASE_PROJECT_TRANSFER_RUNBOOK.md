# Runbook - Transferencia Segura de Projeto no Supabase

Objetivo: transferir a posse de um projeto Supabase de uma organizacao para outra com o menor risco operacional possivel, sem recriar o banco e sem migracao manual de dados.

Escopo: este runbook vale para `Project Transfer`. Nao usar este fluxo se a meta for trocar de regiao ou recriar o projeto.

Referencia oficial:
- Supabase Project Transfer: https://supabase.com/docs/guides/platform/project-transfer
- Supabase Migration Guides: https://supabase.com/docs/guides/platform/migrating-within-supabase

---

## 1. Dados da Operacao

- Projeto:
- `project_ref`:
- Organizacao de origem:
- Organizacao de destino:
- Conta operadora:
- Plano atual:
- Plano destino:
- Janela planejada:
- Responsavel tecnico:
- Responsavel de negocio:
- Status da execucao: `Nao iniciado | Em andamento | Concluido | Rollback`

---

## 2. Criterio de Uso

Use este runbook apenas se todas as respostas abaixo forem `Sim`.

- [ ] Quero manter o mesmo projeto e a mesma regiao.
- [ ] Tenho acesso as duas organizacoes.
- [ ] A conta operadora e `Owner` na org de origem.
- [ ] A conta operadora e pelo menos `Member` na org de destino.
- [ ] A org de destino suporta o plano necessario para o projeto.

Se qualquer item acima for `Nao`, pare e trate isso antes da janela.

---

## 3. Janela Recomendada

Duracao sugerida: `15 a 30 minutos`

Distribuicao sugerida:
- `T-15 min`: preflight final e congelamento de mudancas
- `T-05 min`: backup de seguranca e registro de configuracoes
- `T`: transferencia no Dashboard
- `T+05 min`: validacao tecnica
- `T+15 min`: liberacao da janela ou rollback

---

## 4. Preflight Obrigatorio

Marque tudo antes de clicar em transferir.

### 4.1 Acesso e permissao

- [ ] A conta operadora abriu a org de origem com permissao de `Owner`.
- [ ] A conta operadora abriu a org de destino com permissao suficiente.
- [ ] A org de destino nao esta bloqueada por politica interna, faturamento ou limite de projeto.

### 4.2 Restricoes oficiais

- [ ] O projeto nao usa `GitHub integration` ativa.
- [ ] O projeto nao usa `log drains`.
- [ ] O projeto nao depende de `project-scoped roles` que bloqueiem a transferencia.
- [ ] A org de destino nao e gerenciada via `Vercel Marketplace`.

### 4.3 Congelamento operacional

- [ ] Aviso enviado para time tecnico.
- [ ] Aviso enviado para stakeholders impactados.
- [ ] `Deploys` congelados durante a janela.
- [ ] `Migrations` congeladas durante a janela.
- [ ] Alteracoes de secrets e integracoes congeladas durante a janela.
- [ ] Ninguem esta alterando Auth, Storage, Edge Functions ou Billing durante a janela.

### 4.4 Registro de configuracoes criticas

- [ ] URL do projeto registrada.
- [ ] `project_ref` registrado.
- [ ] Auth providers registrados.
- [ ] Redirect URLs registradas.
- [ ] Configuracao SMTP registrada.
- [ ] Buckets e regras de acesso registrados.
- [ ] Edge Functions ativas registradas.
- [ ] Secrets de integracoes externas inventariadas.
- [ ] Webhooks, cron jobs e servicos externos listados.

### 4.5 Backup de seguranca

- [ ] Backup do banco feito antes da transferencia.
- [ ] Local do backup anotado:
- [ ] Hora do backup:
- [ ] Responsavel pelo backup:

Go / No-Go:
- [ ] `GO` aprovado pelo responsavel tecnico
- [ ] `GO` aprovado pelo responsavel de negocio

Se algum item acima nao estiver concluido, nao prossiga.

---

## 5. Execucao Passo a Passo

### Passo 1 - Confirmar ultimo estado antes da troca

- [ ] Aplicacao em producao esta saudavel.
- [ ] Dashboard do Supabase esta acessivel.
- [ ] Nenhum deploy ou migration esta em andamento.
- [ ] Backup e registros foram concluidos.

Observacoes:

---

### Passo 2 - Abrir a tela de transferencia

Caminho esperado no Dashboard:
`Project > General Settings > Transfer project`

- [ ] Projeto correto aberto.
- [ ] Organizacao de destino correta selecionada.
- [ ] Mensagem de confirmacao revisada com calma.

Observacoes:

---

### Passo 3 - Executar a transferencia

- [ ] Clique em `Transfer project`.
- [ ] Confirmacao enviada.
- [ ] Nenhuma outra alteracao feita enquanto o processo roda.
- [ ] Hora exata da transferencia:

Observacoes:

---

### Passo 4 - Confirmar disponibilidade no destino

- [ ] Projeto apareceu na org de destino.
- [ ] Dashboard abriu na org nova.
- [ ] Projeto sumiu da visao antiga ou deixou de estar operacional na origem conforme esperado.

Observacoes:

---

## 6. Validacao Tecnica Imediata

Executar logo apos a transferencia.

### 6.1 Conectividade

- [ ] Aplicacao web abriu normalmente.
- [ ] Login funcionou.
- [ ] Logout funcionou.
- [ ] Sessao autenticada funcionou.

### 6.2 Banco

- [ ] Leitura simples no banco funcionou.
- [ ] Escrita simples no banco funcionou.
- [ ] Sem erro de permissao inesperado.
- [ ] Sem erro de RLS inesperado.

### 6.3 Storage

- [ ] Lista de buckets carregou.
- [ ] Upload simples funcionou.
- [ ] Download simples funcionou.
- [ ] Regras de acesso continuam corretas.

### 6.4 Edge Functions e automacoes

- [ ] Edge Functions principais responderam.
- [ ] Webhooks externos continuam entregando.
- [ ] Cron jobs e tarefas agendadas continuam executando.

### 6.5 Integracoes externas

- [ ] OAuth providers continuam operando.
- [ ] SMTP continua enviando.
- [ ] Sistemas terceiros dependentes continuam saudaveis.

### 6.6 Billing e administracao

- [ ] Projeto esta no plano esperado na org nova.
- [ ] Add-ons e recursos criticos continuam disponiveis.
- [ ] Equipe correta manteve acesso administrativo.

Resultado da validacao:
- [ ] Validacao aprovada
- [ ] Validacao aprovada com ressalvas
- [ ] Validacao reprovada

Observacoes:

---

## 7. Criterio de Sucesso

Considere a transferencia concluida somente se todos os itens abaixo forem `Sim`.

- [ ] Projeto acessivel na org de destino
- [ ] Aplicacao funcionando normalmente
- [ ] Auth funcionando
- [ ] Banco funcionando
- [ ] Storage funcionando
- [ ] Edge Functions funcionando
- [ ] Integracoes externas funcionando
- [ ] Time confirmou ausencia de impacto relevante

Hora de encerramento:
Responsavel pelo encerramento:

---

## 8. Plano de Rollback

Acione rollback se qualquer validacao critica falhar e nao houver correcao rapida dentro da janela.

### Gatilhos de rollback

- [ ] Dashboard inacessivel apos transferencia
- [ ] Login indisponivel
- [ ] Banco sem leitura ou escrita
- [ ] Storage indisponivel
- [ ] Edge Functions criticas indisponiveis
- [ ] Integracao critica parada sem contorno rapido

### Passos de rollback

1. [ ] Congelar qualquer nova alteracao.
2. [ ] Nao remover acessos da org antiga.
3. [ ] Registrar evidencias do problema.
4. [ ] Transferir o projeto de volta para a org de origem, se aplicavel.
5. [ ] Revalidar aplicacao, auth, banco, storage e functions.
6. [ ] Comunicar rollback para time e stakeholders.

Hora do rollback:
Responsavel pelo rollback:
Motivo:

---

## 9. Pos-Operacao

Executar apenas apos validacao aprovada.

- [ ] Remover acessos temporarios que nao sao mais necessarios.
- [ ] Atualizar documentacao interna com a nova org dona do projeto.
- [ ] Registrar data, operador e resultado final da operacao.
- [ ] Arquivar backup e evidencias da janela.
- [ ] Encerrar comunicacao com o time.

Resumo final:

---

## 10. Checklist Rapido de Mesa

Use esta versao curta durante a janela.

- [ ] Conta operadora valida nas duas orgs
- [ ] Plano de destino compativel
- [ ] Restricoes oficiais checadas
- [ ] Deploy e migration congelados
- [ ] Backup concluido
- [ ] Configuracoes criticas registradas
- [ ] Transferencia executada no Dashboard
- [ ] Banco validado
- [ ] Auth validado
- [ ] Storage validado
- [ ] Edge Functions validadas
- [ ] Integracoes externas validadas
- [ ] Sucesso confirmado ou rollback executado
