# Detalhes Precatório — Plano de Refatoração Clay

**Arquivo alvo:** `app/(dashboard)/precatorios/detalhes/page.tsx` (3851 linhas)
**Referência visual:** `templates html/clay-detalhes-precatorio.html`
**Regra:** Nunca alterar lógica de negócio — apenas camada visual.

---

## Diagnóstico de Gaps (atual → template)

| Zona | Estado Atual | Estado Alvo |
|------|-------------|-------------|
| Header | `h1 text-[2.25rem]` inline com badges | Badge-row acima + título dois andares (cinza/preto) |
| Nav ativo | `bg-[#e8f4f8]` + borda esquerda 3px | `bg-[#0e4d6a]` texto branco (como template) |
| Nav ícones | Sem caixa de ícone | `nav-icon` 26×26px, muted-lt bg |
| Nav-dot | Ausente | Bolinha branca/muted no item ativo |
| Botões header | `Button variant="outline"` shadcn | `btn-ghost` / `btn-ac` Clay |
| Status card | `Chip` HeroUI + `DetailSection` | `chip-current` + `chip-next` + progress bar |
| Pipeline chips | `Chip` HeroUI genérico | `pipe-done/current/next/future` com cores corretas |
| Cards conteúdo | `Card/CardHeader/CardContent` shadcn | `clay-card` + `card-header` com ícone 38×38 |
| Info fields | `InfoRow` (`11px font-semibold`) | `.field-label` (`9.5px font-700 tracking-1.4px`) + `.field-value` (`13.5px font-600`) |
| Value blobs | Grid plana | Blobs hero/positive/muted com sombras |
| Observações | `Textarea` com label | `.obs-area` inset (muted-lt + inset shadow) |
| Footer | Ausente ou genérico | `footer-bar` com meta (criação/atualização) + botões clay |

---

## Constantes locais a definir (no topo do componente)

```tsx
// Clay tokens locais — não poluem globals.css
const sh = {
  card: "16px 16px 36px rgba(0,0,0,.08), -8px -8px 20px rgba(255,255,255,.94), inset 1px 1px 4px rgba(255,255,255,.9), inset -1px -1px 2px rgba(0,0,0,.04)",
  inset: "inset 5px 5px 12px rgba(0,0,0,.07), inset -4px -4px 10px rgba(255,255,255,.87)",
  btnAc: "8px 8px 20px rgba(14,77,106,.42), -3px -3px 8px rgba(255,255,255,.3), inset 1px 1px 3px rgba(255,255,255,.14), inset -1px -1px 2px rgba(8,40,60,.3)",
  btnGhost: "5px 5px 12px rgba(0,0,0,.07), -3px -3px 8px rgba(255,255,255,.92), inset 1px 1px 2px rgba(255,255,255,.87), inset -1px -1px 2px rgba(0,0,0,.04)",
  sm: "7px 7px 16px rgba(0,0,0,.07), -4px -4px 10px rgba(255,255,255,.92), inset 1px 1px 2px rgba(255,255,255,.88), inset -1px -1px 2px rgba(0,0,0,.03)",
  navAc: "6px 6px 14px rgba(14,77,106,.36), -2px -2px 6px rgba(255,255,255,.28), inset 1px 1px 3px rgba(255,255,255,.14), inset -1px -1px 2px rgba(8,40,60,.22)",
  heroBlobAc: "12px 12px 28px rgba(14,77,106,.36), -5px -5px 14px rgba(255,255,255,.5), inset 1px 1px 4px rgba(255,255,255,.12), inset -1px -1px 2px rgba(8,40,60,.25)",
} as const
```

---

## Novos helpers / sub-componentes locais

### ClayBtnAc
```tsx
function ClayBtnAc({ children, onClick, disabled, className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-[7px] rounded-[13px] bg-[#0e4d6a] px-4 text-[12.5px] font-bold text-white transition hover:-translate-y-[2px] active:scale-[0.96] active:translate-y-[2px] disabled:pointer-events-none disabled:opacity-50 h-[38px] ${className ?? ""}`}
      style={{ boxShadow: sh.btnAc }}
    >
      {children}
    </button>
  )
}
```

### ClayBtnGhost
```tsx
function ClayBtnGhost({ children, onClick, disabled, className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-[7px] rounded-[13px] border border-black/[0.08] bg-gradient-to-br from-white to-[#f4f5f8] px-4 text-[12.5px] font-bold text-[#374151] transition hover:-translate-y-[2px] hover:text-[#0b0c10] active:scale-[0.96] active:translate-y-[2px] disabled:pointer-events-none disabled:opacity-50 h-[38px] ${className ?? ""}`}
      style={{ boxShadow: sh.btnGhost }}
    >
      {children}
    </button>
  )
}
```

### ClayCard
```tsx
function ClayCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-black/[0.07] bg-white transition-transform duration-200 hover:-translate-y-[2px] ${className ?? ""}`}
      style={{ boxShadow: sh.card }}
    >
      {children}
    </div>
  )
}
```

### ClayCardHeader
```tsx
function ClayCardHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-[13px] border-b border-[#e8eaef] px-[22px] py-[18px] pb-[14px]">
      <div
        className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[13px] border border-black/[0.07] bg-[#f2f3f7]"
        style={{ boxShadow: sh.sm }}
      >
        <Icon className="h-[18px] w-[18px] stroke-[1.75] text-[#374151]" />
      </div>
      <span className="text-[15px] font-extrabold tracking-[-0.2px] text-[#0b0c10]">{title}</span>
    </div>
  )
}
```

### FieldLabel / FieldValue
```tsx
function Field({ label, value, empty, className }: { label: string; value: ReactNode; empty?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">{label}</span>
      <span className={`text-[13.5px] font-semibold leading-snug ${empty ? "italic text-[#9ca3af] font-normal" : "text-[#0b0c10]"}`}>
        {value || (empty ? "Não informado" : value)}
      </span>
    </div>
  )
}
```

### ValueBlob
```tsx
function ValueBlob({ label, value, variant = "default" }: { label: string; value: string; variant?: "default" | "hero" | "positive" }) {
  const style = variant === "hero"
    ? { background: "#0e4d6a", boxShadow: sh.heroBlobAc }
    : variant === "positive"
    ? { background: "#f0fdf4", border: "1.5px solid #bbf7d0" }
    : { boxShadow: sh.sm }
  const labelCls = variant === "hero" ? "text-white/55" : variant === "positive" ? "text-[#166534]/70" : "text-[#6b7280]"
  const valueCls = variant === "hero" ? "text-white" : variant === "positive" ? "text-[#15803d]" : "text-[#0b0c10]"
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-black/[0.07] p-[18px] transition hover:-translate-y-[3px]" style={style}>
      <span className={`mb-2 block text-[9.5px] font-bold uppercase tracking-[1.4px] ${labelCls}`}>{label}</span>
      <span className={`block text-[22px] font-black leading-[1.15] tracking-[-0.8px] ${valueCls}`}>{value}</span>
    </div>
  )
}
```

---

## Task 1 — Constantes e helpers locais

**Arquivo:** `app/(dashboard)/precatorios/detalhes/page.tsx`

- [ ] **Step 1:** Adicionar bloco `const sh = {...}` logo após as declarações de tipos (antes do componente `SectionTitle`)
- [ ] **Step 2:** Adicionar os 5 sub-componentes locais: `ClayBtnAc`, `ClayBtnGhost`, `ClayCard`, `ClayCardHeader`, `Field`, `ValueBlob`
- [ ] **Step 3:** Rodar lint
  ```bash
  npm run lint -- --file "app/(dashboard)/precatorios/detalhes/page.tsx"
  ```

---

## Task 2 — Header Clay

**Linhas alvo:** `1826–1910` (header sticky)

- [ ] **Step 1:** Atualizar `verticalTabClass` e `navSectionLabel` para o estilo Clay full:

```tsx
const verticalTabClass =
  "relative flex w-full items-center gap-[9px] rounded-[12px] px-3 py-2 text-[12.5px] font-semibold text-[#6b7280] transition-all duration-200 hover:translate-x-[2px] hover:bg-[#f2f3f7] hover:text-[#0b0c10] data-[state=active]:translate-x-[1px] data-[state=active]:bg-[#0e4d6a] data-[state=active]:text-white data-[state=active]:font-bold"

const navSectionLabel =
  "block select-none px-3 pb-1 pt-[9px] text-[9px] font-bold uppercase tracking-[2px] text-[#9ca3af]"
```

- [ ] **Step 2:** Substituir o header `motion.div` por versão Clay:

```tsx
<header
  className="relative z-20 overflow-hidden rounded-[28px] border border-black/[0.07] bg-[rgba(255,255,255,0.93)] px-5 py-5 backdrop-blur-[24px] lg:sticky lg:top-3"
  style={{ boxShadow: sh.card }}
>
  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
    <div className="flex items-start gap-4">
      {/* Botão voltar */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mt-[5px] flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[15px] border border-black/[0.07] bg-gradient-to-br from-white to-[#f5f6f9] text-[#6b7280] transition hover:-translate-y-[3px] hover:-translate-x-[1px] hover:text-[#0b0c10] active:scale-[0.94] active:translate-y-[1px]"
        style={{ boxShadow: sh.sm }}
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>

      <div className="min-w-0 flex-1">
        {/* Badge row */}
        <div className="mb-[10px] flex flex-wrap items-center gap-1.5">
          {precatorio.prioridade && (
            <span className={`inline-flex h-6 items-center rounded-full border px-[10px] text-[10.5px] font-bold tracking-[0.3px] ${getPrioridadeColor(precatorio.prioridade)}`}>
              {precatorio.prioridade.toUpperCase()}
            </span>
          )}
          {precatorio.status && (
            <span className={`inline-flex h-6 items-center rounded-full border px-[10px] text-[10.5px] font-bold tracking-[0.3px] ${getStatusColor(precatorio.status)}`}>
              {precatorio.status.replace(/_/g, " ").toUpperCase()}
            </span>
          )}
          {precatorio.natureza && (
            <span className="inline-flex h-6 items-center rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-[10px] text-[10.5px] font-bold tracking-[0.3px] text-[#15803d]">
              {precatorio.natureza}
            </span>
          )}
        </div>

        {/* Título dois andares */}
        <h1 className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.6px] text-[#6b7280] md:text-[28px]">
          Precatório
          <strong className="block text-[32px] font-black text-[#0b0c10] tracking-[-1px] md:text-[38px]">
            {precatorio.credor_nome || precatorio.titulo || "—"}
          </strong>
        </h1>
        <p className="mt-[5px] text-[12px] font-medium text-[#9ca3af]">
          Dados essenciais com visão completa do fluxo de trabalho.
        </p>
      </div>
    </div>

    {/* Ações */}
    <div className="flex flex-wrap items-center gap-2 pt-[6px]">
      {isAdmin && !isEditing && (
        <ClayBtnGhost onClick={() => setAdminInterestModalOpen(true)}>
          <AlertCircle className="h-[14px] w-[14px]" />
          Sinalizar interesse
        </ClayBtnGhost>
      )}
      {!isEditing && (
        <ClayBtnGhost onClick={() => { setActiveTab("timeline"); syncTabToUrl("timeline") }}>
          <Clock className="h-[14px] w-[14px]" />
          Timeline
        </ClayBtnGhost>
      )}
      {isEditing ? (
        <>
          <ClayBtnGhost onClick={handleCancelEdit} disabled={saving}>
            <X className="h-[14px] w-[14px]" />
            Cancelar
          </ClayBtnGhost>
          <ClayBtnAc onClick={handleSave} disabled={saving}>
            <Save className="h-[14px] w-[14px]" />
            {saving ? "Salvando..." : "Salvar"}
          </ClayBtnAc>
        </>
      ) : (
        <ClayBtnGhost onClick={() => setIsEditing(true)}>
          <Edit className="h-[14px] w-[14px]" />
          Editar
        </ClayBtnGhost>
      )}
    </div>
  </div>
</header>
```

- [ ] **Step 3:** Lint

---

## Task 3 — Nav sidebar icons + active state

**Linhas alvo:** `2014–2106`

- [ ] **Step 1:** Adicionar ícone `nav-icon` em cada `TabsTrigger`. O ícone 26×26 precisa ser um wrapper `<span>` ao redor do ícone SVG com bg muted-lt. Mas como o `TabsTrigger` já recebe o ícone como filho, basta envelopá-lo:

```tsx
// Padrão para CADA TabsTrigger:
<TabsTrigger value="detalhes" className={verticalTabClass}>
  <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors group-data-[state=active]:bg-white/16">
    <FileText className="h-[14px] w-[14px] stroke-[1.75]" />
  </span>
  Geral
  {/* nav-dot no item ativo */}
</TabsTrigger>
```

- [ ] **Step 2:** Adicionar `nav-dot` (indicador redondo) via `::after` pseudo-element com Tailwind ou como elemento filho:

```tsx
// Adicionar ao final de cada TabsTrigger:
<span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/25 data-[state=active]:bg-white/55" />
```

- [ ] **Step 3:** Lint

---

## Task 4 — Status card com progress bar e pipeline

**Linhas alvo:** `2119–2218`

- [ ] **Step 1:** Adicionar progress bar acima do status atual:

```tsx
{/* Progress bar */}
<div className="mb-[18px]">
  <div className="mb-[7px] flex justify-between text-[10px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">
    <span>Progresso do fluxo</span>
    <span>Etapa {currentColumnIndex + 1} de {KANBAN_COLUMNS.length}</span>
  </div>
  <div className="h-[5px] overflow-hidden rounded-[10px] bg-[#e8eaef]" style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,.06), inset -1px -1px 3px rgba(255,255,255,.8)" }}>
    <div
      className="h-full rounded-[10px] bg-gradient-to-r from-[#22c55e] via-[#6366f1] to-[#0e4d6a] transition-all duration-700"
      style={{ width: `${Math.round(((currentColumnIndex + 1) / KANBAN_COLUMNS.length) * 100)}%` }}
    />
  </div>
</div>
```

- [ ] **Step 2:** Substituir `Chip` do status atual por `chip-current` Clay:

```tsx
{/* Status atual */}
<div className="inline-flex h-[38px] items-center gap-2 rounded-[22px] bg-[#0e4d6a] px-4 text-[13px] font-extrabold text-white" style={{ boxShadow: sh.btnAc }}>
  <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
  {statusAtualLabel}
</div>
```

- [ ] **Step 3:** Substituir `Chip` da próxima etapa por `chip-next`:

```tsx
{nextColumn && (
  <div className="inline-flex h-[38px] items-center gap-[7px] rounded-[22px] border border-[#e8eaef] bg-white px-4 text-[13px] font-bold text-[#374151]" style={{ boxShadow: sh.sm }}>
    <ArrowRight className="h-[13px] w-[13px]" />
    {nextColumn.titulo}
  </div>
)}
```

- [ ] **Step 4:** Substituir `Chip` de cada item do pipeline scroll por variantes `pipe-done/current/next/future`:

Os Chips do pipeline (linhas ~2198-2210) devem ser trocados por divs com classe variável:
- `isCurrent` → `bg-[#0e4d6a] text-white font-extrabold h-[34px] shadow-[5px_5px_12px_rgba(14,77,106,.34),-2px_-2px_6px_rgba(255,255,255,.5)]`
- `isDone` → `bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]`
- `isNext` → `bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]`
- `future` → `bg-black/[0.04] text-[#9ca3af] border border-black/[0.06]`

- [ ] **Step 5:** Lint

---

## Task 5 — Cards de conteúdo (Geral tab)

**Linhas alvo:** `2231–3448`

Objetivo: Substituir `<Card>` + `<CardHeader>` + `<CardContent>` por `<ClayCard>` + `<ClayCardHeader>` + `<div className="p-[20px_22px_22px]">`.

- [ ] **Step 1:** Card Identificação (linha ~2236):

```tsx
<ClayCard>
  <ClayCardHeader icon={FileText} title="Identificação" />
  <div className="p-5 lg:px-[22px] lg:py-5">
    {isEditing ? (
      // — manter form existente, só trocar Labels e inputs para Clay —
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        ...existing form fields...
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-[18px] xl:grid-cols-4">
        <Field label="Nº do Precatório" value={...} className="col-span-2 xl:col-span-1" />
        <Field label="Nº do Processo" value={...} />
        <Field label="Nº do Ofício" value={...} empty={!precatorio.numero_oficio} />
        <Field label="Natureza" value={...} />
        // divider
        <Field label="Tribunal" value={...} />
        <Field label="Devedor" value={...} />
        <Field label="Expedição" value={...} />
      </div>
    )}
  </div>
</ClayCard>
```

- [ ] **Step 2:** Card Credor (linha ~2329)  
  Mesma troca `Card` → `ClayCard` + usar `<Field>` para cada campo.

- [ ] **Step 3:** Card Dados Financeiros — adicionar ValueBlobs:

```tsx
<ClayCard>
  <ClayCardHeader icon={DollarSign} title="Dados Financeiros" />
  <div className="p-5 lg:px-[22px] lg:py-5 space-y-5">
    {/* Value blobs */}
    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
      <ValueBlob label="Valor Principal" value={`R$ ${formatCurrency(precatorio.valor_principal)}`} />
      <ValueBlob label="Valor Atualizado" value={`R$ ${formatCurrency(precatorio.valor_atualizado)}`} variant="hero" />
      <ValueBlob label="Honorários" value={`${precatorio.honorarios_percentual ?? 0}%`} variant="positive" />
    </div>
    {/* Divider */}
    <div className="h-px bg-[#e8eaef]" />
    {/* Info grid */}
    <div className="grid grid-cols-2 gap-[18px] xl:grid-cols-4">
      <Field label="Índice" value={precatorio.indice_correcao || "-"} />
      <Field label="Prioridade" value={...} />
      <Field label="Urgente" value={...} />
      <Field label="Origem do Lead" value={precatorio.origem_lead || "-"} empty={!precatorio.origem_lead} />
    </div>
  </div>
</ClayCard>
```

- [ ] **Step 4:** Cards Advogado e Responsáveis (two-col layout)
- [ ] **Step 5:** Card Observações com `obs-area`
- [ ] **Step 6:** Footer bar (criação/atualização + botões clay)
- [ ] **Step 7:** Lint

---

## Task 6 — Labels e inputs no modo edição

- [ ] Trocar `Label` shadcn por `<label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">`
- [ ] Trocar `Input` shadcn por versão Clay:
  ```tsx
  className="h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
  ```
- [ ] Trocar `Textarea` por área obs Clay
- [ ] Lint

---

## Task 7 — Lint final e polish

```bash
npm run lint -- --file "app/(dashboard)/precatorios/detalhes/page.tsx"
```

Checklist:
- [ ] Sem cores laranja decorativas
- [ ] Botões todos Clay (ghost ou ac)
- [ ] Cards todos usando ClayCard
- [ ] Nav ativo com bg petróleo + texto branco
- [ ] Tipografia dois andares no header
- [ ] Value blobs nos dados financeiros
- [ ] obs-area com inset shadow

---

## Notas técnicas

- `DetailSection` é `components/motion/DetailSection` — pode ser mantido como wrapper se não tiver impacto visual, ou substituído por `div`
- `Chip` (HeroUI compat) para pipeline → substituir por `<div>` nativo Clay
- `Chip` para status atual/próxima → substituir por `div` nativo Clay  
- Manter todos os handlers: `handleSave`, `handleAdvanceToNextStage`, `handleCancelEdit`, etc.
- Manter todos os componentes especializados de abas: `AbaFechamento`, `ChecklistDocumentos`, etc.
