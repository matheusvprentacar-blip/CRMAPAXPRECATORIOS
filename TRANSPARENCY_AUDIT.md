# Log de Auditoria de Transparências (Gerado Automaticamente)

Este log identifica todos os elementos que utilizam transparência no projeto, conforme solicitado.

## ⚠️ Componentes da UI (Radix/Shadcn)
A transparência nesses componentes afeta modais, dropdowns e overlays.

- **components/ui/table.tsx**
  - Line 23: `bg-background/95`
  - Line 23: `backdrop-blur-sm`
  - Line 46: `bg-muted/50`
  - Line 61: `hover:bg-muted/30`

- **components/ui/sheet.tsx**
  - Line 23: `bg-black/80` (Overlay de Fundo)

- **components/ui/dialog.tsx**
  - Line 24: `bg-black/80` (Overlay de Fundo)

- **components/ui/dropdown-menu.tsx**
  - *Nota: O componente usa `bg-popover`. Se a variável `--popover` não tiver transparência, o problema pode estar em classes globais ou conflitos.*

- **components/ui/calendar.tsx**
  - Line 39: `bg-accent/50`
  - Line 49: `opacity-50`, `opacity-30`

## 🎨 Componentes de Layout e Funcionalidades

- **components/calculador-precatorios.tsx**
  - Line 546: `bg-card/50` (Cartões com efeito vidro)
  - Line 546: `backdrop-blur-sm`
  - Line 557: `bg-card/95`

- **app/(dashboard)/layout.tsx**
  - *Sidebar e Header podem estar usando classes com `/xx` ou cores com alpha.*

## 🔢 Etapas do Wizard (Steps)

- **components/steps/step-honorarios.tsx**
  - `bg-secondary/50`
  - `bg-muted/50`

- **components/steps/step-irpf.tsx**
  - `bg-secondary/50`

- **components/steps/step-pss.tsx**
  - `bg-secondary/50`
  - `bg-muted/20`

- **components/steps/step-propostas.tsx**
  - `bg-secondary/50`

- **components/steps/step-indices.tsx** (Vários cards de índices)
  - `bg-white/50`
  - `bg-black/20`
  - `bg-muted/20`

- **components/steps/step-atualizacao-monetaria.tsx**
  - `bg-muted/20`
  - `bg-muted/10`

## 📄 Precatórios e Documentos

- **components/precatorios/documento-card.tsx**: `bg-primary/10`
- **components/precatorios/modal-calculo-manual.tsx**: `bg-muted/20`, `hover:bg-muted/50`
- **components/precatorios/template-proposta.tsx**: `bg-muted/30`
- **components/precatorios/resumo-calculo-detalhado.tsx**: `bg-muted/30`, `bg-primary/5`
- **components/precatorios/checklist-documentos.tsx**: `bg-muted/30`
- **components/perfil/upload-foto.tsx**: `bg-primary/10`

## ⚙️ Configurações
- **components/settings/update-checker.tsx**: Múltiplos usos de transparência (`/30`, `/50`, `/5`)

***

**Ação Planejada:** Remover todas as terminações `/number` (ex: `/50` -> ``) e remover classes `backdrop-blur`.
