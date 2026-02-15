# Mapeamento UI: Layouts, Paginas e Modais

Referencia consolidada do que o usuario visualiza hoje no app (paginas, layouts, loading states e overlays/modais).

Data de consolidacao: 2026-02-14

## 1) Layouts globais

- Root layout: `app/layout.tsx`
- Dashboard layout (sidebar, header, notificacoes, menu de usuario): `app/(dashboard)/layout.tsx`
- Estilos globais: `app/globals.css`

## 2) Rotas ativas (paginas)

- `/` -> `app/page.tsx`
- `/login` -> `app/(auth)/login/page.tsx`
- `/register` -> `app/(auth)/register/page.tsx`
- `/test-connection` -> `app/test-connection/page.tsx`
- `/dashboard` -> `app/(dashboard)/dashboard/page.tsx`
- `/clientes` -> `app/(dashboard)/clientes/page.tsx`
- `/precatorios` -> `app/(dashboard)/precatorios/page.tsx`
- `/precatorios/novo` -> `app/(dashboard)/precatorios/novo/page.tsx`
- `/precatorios/detalhes` -> `app/(dashboard)/precatorios/detalhes/page.tsx`
- `/precatorios/visualizar` -> `app/(dashboard)/precatorios/visualizar/page.tsx`
- `/kanban` -> `app/(dashboard)/kanban/page.tsx`
- `/chat` -> `app/(dashboard)/chat/page.tsx`
- `/propostas` -> `app/(dashboard)/propostas/page.tsx`
- `/juridico` -> `app/(dashboard)/juridico/page.tsx`
- `/juridico/analise` -> `app/(dashboard)/juridico/analise/page.tsx`
- Cliente dessa rota: `app/(dashboard)/juridico/analise/analise-juridica-client.tsx`
- `/calculo` -> `app/(dashboard)/calculo/page.tsx`
- `/calcular` -> `app/(dashboard)/calcular/page.tsx`
- `/calculo-operador` -> `app/(dashboard)/calculo-operador/page.tsx`
- `/analise-processual` -> `app/(dashboard)/analise-processual/page.tsx`
- `/gestao-certidoes` -> `app/(dashboard)/gestao-certidoes/page.tsx`
- `/gestao-oficios` -> `app/(dashboard)/gestao-oficios/page.tsx`
- `/acesso-controlado` -> `app/(dashboard)/acesso-controlado/page.tsx`
- `/auditoria-irpf` -> `app/(dashboard)/auditoria-irpf/page.tsx`
- `/meus-precatorios` -> `app/(dashboard)/meus-precatorios/page.tsx`
- `/notificacoes` -> `app/(dashboard)/notificacoes/page.tsx`
- `/perfil` -> `app/(dashboard)/perfil/page.tsx`
- `/configuracoes` -> `app/(dashboard)/configuracoes/page.tsx`
- `/diagnostico` -> `app/(dashboard)/diagnostico/page.tsx`
- `/admin/precatorios` -> `app/(dashboard)/admin/precatorios/page.tsx`
- `/admin/usuarios` -> `app/(dashboard)/admin/usuarios/page.tsx`
- `/admin/usuarios/detalhes` -> `app/(dashboard)/admin/usuarios/detalhes/page.tsx`
- `/admin/financeiro` -> `app/(dashboard)/admin/financeiro/page.tsx`

## 3) Loading states

- `app/(dashboard)/calculo/loading.tsx`
- `app/(dashboard)/calcular/loading.tsx`
- `app/(dashboard)/precatorios/loading.tsx`
- `app/(dashboard)/meus-precatorios/loading.tsx`
- `app/(dashboard)/admin/usuarios/loading.tsx`
- `app/(dashboard)/admin/precatorios/loading.tsx`

## 4) Overlays globais (fora de uma pagina especifica)

- Modal de notificacoes: `components/notifications/NotificationsModal.tsx`
- Trigger/sino de notificacao: `components/notifications/NotificationBell.tsx`
- Atualizacao global (Tauri updater): `components/settings/global-update-notifier.tsx`
- Viewer PDF flutuante global:
  - Provider: `components/providers/pdf-viewer-provider.tsx`
  - Janela: `components/ui/floating-window.tsx`

## 5) Modais/dialogs/sheets por area

### 5.1) `/admin/precatorios`

- Modais de componente:
  - `components/admin/modal-importar-precatorio.tsx`
  - `components/admin/modal-template-precatorio.tsx`
  - `components/admin/modal-criar-precatorio.tsx`
  - `components/admin/upload-oficios-modal.tsx`
- Dialogs inline na pagina:
  - Distribuicao automatica
  - Distribuicao individual
  - Enviar aviso
  - Confirmacao de exclusao (individual e lote)
  - Arquivo: `app/(dashboard)/admin/precatorios/page.tsx`

### 5.2) `/admin/usuarios`

- Dialogs inline na pagina:
  - Novo colaborador
  - Redistribuicao de carteira/itens
  - Confirmacao de acao de usuario (AlertDialog)
  - Arquivo: `app/(dashboard)/admin/usuarios/page.tsx`

### 5.3) `/admin/usuarios/detalhes`

- Dialogs dentro de tabs RH:
  - Upload de documento: `components/hr/documents-tab.tsx`
  - Novo lancamento financeiro: `components/hr/financial-tab.tsx`
  - Registrar ocorrencia (atestados/faltas/ferias): `components/hr/leaves-tab.tsx`

### 5.4) `/admin/financeiro`

- Nova movimentacao: `components/finance/new-transaction-modal.tsx`
- Edicao de movimentacao (renderizada na tabela global):
  - `components/finance/edit-transaction-modal.tsx`
  - Uso em `components/hr/global-transactions-table.tsx`
- Popover de calendario/filtro no dashboard financeiro:
  - `app/(dashboard)/admin/financeiro/page.tsx`

### 5.5) `/precatorios`

- Importacao JSON: `components/import/import-json-modal.tsx`
- Filtros avancados (Sheet lateral): `components/precatorios/advanced-filters.tsx`
- Dialogs inline:
  - Confirmar exclusao
  - Confirmar exclusao em lote
  - Arquivo: `app/(dashboard)/precatorios/page.tsx`

### 5.6) `/precatorios/novo`

- Importar PDF/OCR: `components/admin/modal-importar-precatorio.tsx`
- Viewer inline de PDF: `components/pdf-viewer.tsx`

### 5.7) `/precatorios/detalhes`

- Modal de PDF: `components/pdf-viewer-modal.tsx`
- Modal de "sem interesse": `components/kanban/modal-sem-interesse.tsx`
- Dialog inline de herdeiro/edicao (na propria pagina)
- Checklist/documentos com dialogs internos:
  - `components/kanban/checklist-documentos.tsx`
  - `components/kanban/checklist-certidoes.tsx`
  - `components/kanban/item-checklist-dialog.tsx`
- Aba proposta com dialogs internos:
  - `components/kanban/aba-proposta.tsx`
  - `components/kanban/proposal-config-modal.tsx`
- Viewer de oficio: `components/kanban/oficio-viewer.tsx` (abre no viewer global)

### 5.8) `/precatorios/visualizar`

- Reusa componentes com dialogs internos:
  - `components/kanban/checklist-documentos.tsx`
  - `components/kanban/checklist-certidoes.tsx`
  - `components/kanban/aba-proposta.tsx`
  - `components/kanban/oficio-viewer.tsx`

### 5.9) `/kanban`

- Modal de sem interesse: `components/kanban/modal-sem-interesse.tsx`
- Dialogs inline:
  - Definir status de encerramento
  - Confirmar movimentacao / bloqueio de movimentacao
  - Registrar triagem
  - Arquivo: `app/(dashboard)/kanban/page.tsx`
- Filtros avancados (Sheet): `components/precatorios/advanced-filters.tsx`

### 5.10) `/calculo`

- Modal de atraso: `components/calculo/modal-atraso.tsx`
- Modal enviar para juridico: `components/calculo/modal-enviar-juridico.tsx`
- Modal calculo manual: `components/precatorios/modal-calculo-manual.tsx`

### 5.11) `/clientes`

- Dialog inline: filtros avancados de clientes
- Dialog inline: detalhes do credor selecionado
- Arquivo: `app/(dashboard)/clientes/page.tsx`

### 5.12) `/analise-processual`

- Dialog inline com resultado da analise processual
- Arquivo: `app/(dashboard)/analise-processual/page.tsx`

### 5.13) `/configuracoes`

- Dialog de update checker: `components/settings/update-checker.tsx`

### 5.14) `/chat`

- Menu contextual por mensagem (DropdownMenu)
- Abertura de PDFs pelo viewer global (`usePDFViewer`)
- Arquivo: `app/(dashboard)/chat/page.tsx`

## 6) Arquivos com variacoes de pagina (nao roteados/nao ativos)

Estes arquivos existem, mas nao sao a rota ativa no App Router:

- `app/(dashboard)/dashboard/page-new.tsx`
- `app/(dashboard)/perfil/page-new.tsx`
- `app/(dashboard)/admin/precatorios/page-new.tsx`
- `app/(dashboard)/admin/precatorios/page-improved.tsx`
- `app/(dashboard)/admin/precatorios/page-final-com-upload.tsx`

## 7) Inconsistencias encontradas no mapeamento

- `app/(dashboard)/precatorios/detalhes/page.tsx` importa `TimelineViewer` de `@/components/precatorios/timeline-viewer`, mas esse arquivo nao foi encontrado no diretorio `components/precatorios`.

