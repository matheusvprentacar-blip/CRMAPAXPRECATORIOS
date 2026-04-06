# Clientes Clay Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar `app/(dashboard)/clientes/page.tsx` para o padrão Apax Clay, melhorando leitura e navegação da listagem e do modal sem alterar a lógica atual.

**Architecture:** Execute em um worktree dedicado. Mantenha toda a lógica de dados no mesmo arquivo e concentre a mudança em composição visual, hierarquia e responsividade. Evite mexer em RPCs, filtros e persistência; se precisar reutilizar classes ou shadows, faça isso com constantes locais no próprio arquivo para não contaminar o tema global.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, HeroUI v3, Framer Motion, Sonner

---

## File Structure

- **Modify:** `app/(dashboard)/clientes/page.tsx`
  - continua sendo o arquivo único da tela;
  - recebe os tokens/constantes Clay locais;
  - troca o hero atual por Hero Title Clay;
  - troca a grid principal por listagem híbrida desktop/mobile;
  - refatora modal de filtros e modal de detalhes.
- **Do not modify unless absolutely necessary:** `app/globals.css`
  - este plano assume **nenhuma** alteração global para evitar vazamento do tema Clay azul-petróleo para o restante do app, que ainda usa a paleta laranja atual.
- **Validation only:** `docs/superpowers/specs/2026-04-05-clientes-design.md`
  - usar como fonte da implementação; não editar.

## Testing Strategy

Este repositório não expõe um runner de testes frontend em `package.json`. Para esta refatoração visual, a validação será:
- lint direcionado no arquivo da página;
- verificação manual no navegador em 375px, 768px e 1280px;
- checagem funcional de busca, filtros, paginação e abertura de modal.

Use estes comandos ao longo do trabalho:

```bash
npm run lint -- --file "app/(dashboard)/clientes/page.tsx"
```

```bash
npm run dev
```

No browser, valide a tela `/clientes` pela navegação do app já existente.

### Task 1: Introduzir tokens locais e primitives Clay

**Files:**
- Modify: `app/(dashboard)/clientes/page.tsx:61-83`
- Modify: `app/(dashboard)/clientes/page.tsx:653-723`
- Modify: `app/(dashboard)/clientes/page.tsx:725-887`
- Test: `npm run lint -- --file "app/(dashboard)/clientes/page.tsx"`

- [ ] **Step 1: Definir as constantes locais do sistema Clay no topo do arquivo**

Substitua as constantes visuais provisórias por um bloco explícito de tokens locais. Use este trecho como base perto das constantes existentes:

```tsx
const clayPageClass =
  "clients-revamp relative w-full max-w-[100vw] bg-[#f0f1f5] px-3 py-4 text-[#0b0c10] sm:px-4 lg:px-6 lg:py-6"

const clayCardClass =
  "rounded-[24px] border border-black/[0.07] bg-white transition-transform duration-200"

const clayInsetClass =
  "rounded-[18px] border border-black/[0.06] bg-[#f2f3f7]"

const clayGhostButtonClass =
  "inline-flex min-h-11 items-center gap-2 rounded-[15px] border border-black/[0.08] bg-white px-4 text-sm font-semibold text-[#374151] transition hover:-translate-y-0.5"

const clayPrimaryButtonClass =
  "inline-flex min-h-11 items-center gap-2 rounded-[15px] bg-[#0e4d6a] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"

const clayBadgeClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"

const clayCardShadow: React.CSSProperties = {
  boxShadow:
    "16px 16px 36px rgba(0,0,0,.08), -8px -8px 20px rgba(255,255,255,.94), inset 1px 1px 4px rgba(255,255,255,.9), inset -1px -1px 2px rgba(0,0,0,.04)",
}

const clayInsetShadow: React.CSSProperties = {
  boxShadow:
    "inset 5px 5px 12px rgba(0,0,0,.07), inset -4px -4px 10px rgba(255,255,255,.87)",
}

const clayPrimaryShadow: React.CSSProperties = {
  boxShadow:
    "8px 8px 20px rgba(14,77,106,.42), -3px -3px 8px rgba(255,255,255,.3), inset 1px 1px 3px rgba(255,255,255,.14), inset -1px -1px 2px rgba(8,40,60,.3)",
}
```

- [ ] **Step 2: Transformar `KpiCard` em blob Clay com hierarquia tipográfica mais forte**

Troque o markup principal de `KpiCard` por esta estrutura, mantendo `CountUp`, `tone`, `isLoading`, `prefix` e `decimals`:

```tsx
<article className="h-full rounded-[24px] border border-black/[0.07] bg-white p-5" style={clayCardShadow}>
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">{title}</span>
      <div className={cx("mt-3 font-black leading-tight tracking-[-0.04em]", valueClassName, toneClasses)}>
        {isLoading ? (
          <span className="inline-block h-8 w-28 animate-pulse rounded-xl bg-[#e8eaef]" />
        ) : (
          <CountUp
            end={Number.isFinite(value) ? value : 0}
            duration={0.9}
            decimals={decimals}
            prefix={formattedPrefix}
            formattingFn={(currentValue) => numberFormatter.format(currentValue)}
          />
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-[#6b7280]">{subtitle}</p>
    </div>
    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-black/[0.06] bg-[#f2f3f7] text-[#0e4d6a]" style={clayInsetShadow}>
      {icon}
    </div>
  </div>
</article>
```

Atualize `toneClasses` para o novo sistema:

```tsx
const toneClasses =
  tone === "success"
    ? carteiraAccentClass
    : tone === "primary"
      ? "text-[#0e4d6a]"
      : "text-[#0b0c10]"
```

- [ ] **Step 3: Renomear `ClienteGridCard` para `ClienteListRow` e preparar a base do novo item**

Altere a assinatura do componente e troque o contêiner externo para um layout híbrido desktop/mobile:

```tsx
function ClienteListRow({
  credor,
  onOpen,
  formatCurrency,
  formatStatus,
  statusClass,
}: {
  credor: CredorResumo
  onOpen: () => void
  formatCurrency: (n: number) => string
  formatStatus: (s?: string | null) => string
  statusClass: (s?: string | null) => string
}) {
```

Troque o `<article>` por:

```tsx
<article
  role="button"
  tabIndex={0}
  onClick={onOpen}
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onOpen()
    }
  }}
  className="group flex flex-col gap-4 rounded-[24px] border border-black/[0.07] bg-white p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e4d6a]/40 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-center"
  style={clayCardShadow}
>
```

- [ ] **Step 4: Rodar lint para garantir que as novas constantes e componentes compilam**

Run:

```bash
npm run lint -- --file "app/(dashboard)/clientes/page.tsx"
```

Expected: comando termina sem erros para o arquivo.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/clientes/page.tsx"
git commit -m "$(cat <<'EOF'
ref(clientes): add local Clay primitives

Add page-scoped Clay tokens and reusable visual primitives so the
clientes refactor can proceed without changing global theme behavior.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Task 2: Refatorar hero, KPIs e barra operacional

**Files:**
- Modify: `app/(dashboard)/clientes/page.tsx:1608-1787`
- Test: `npm run lint -- --file "app/(dashboard)/clientes/page.tsx"`

- [ ] **Step 1: Substituir o hero atual pelo Hero Title Clay**

Troque o primeiro `<section>` por esta composição:

```tsx
<section className="space-y-4 rounded-[28px] border border-black/[0.07] bg-[rgba(255,255,255,0.92)] p-5 backdrop-blur-xl lg:p-6" style={clayCardShadow}>
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="space-y-3">
      <span className="inline-flex h-7 items-center rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1d4ed8]">
        CRM operacional
      </span>
      <div className="space-y-2">
        <p className="text-[26px] font-extrabold leading-none tracking-[-0.04em] text-[#6b7280] sm:text-[30px]">
          Gestão de
          <strong className="block text-[34px] font-black text-[#0b0c10] sm:text-[40px]">Clientes</strong>
        </p>
        <p className="max-w-3xl text-sm leading-6 text-[#6b7280]">
          Gerencie carteira, contato, processos e histórico dos clientes em uma leitura operacional mais rápida.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx(clayBadgeClass, "border-[#e5e7eb] bg-[#f2f3f7] text-[#6b7280]")}>{credores.length} clientes</span>
        <span className={cx(clayBadgeClass, "border-[#e5e7eb] bg-[#f2f3f7] text-[#6b7280]")}>{resumo.totalPrecatorios} processos</span>
        <span className={cx(clayBadgeClass, "border-[#e5e7eb] bg-[#f2f3f7] text-[#6b7280]")}>Atualizado em {ultimaAtualizacaoLabel}</span>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      <button type="button" disabled={!searchTerm} onClick={() => setSearchTerm("")} className={clayGhostButtonClass}>
        <X className="h-4 w-4" />
        Limpar busca
      </button>
      <button type="button" disabled={loading} onClick={() => loadCredores()} className={clayPrimaryButtonClass} style={clayPrimaryShadow}>
        <RefreshCw className={cx("h-4 w-4", loading ? "animate-spin" : "")} />
        Atualizar
      </button>
    </div>
  </div>
```

- [ ] **Step 2: Reorganizar a faixa de KPIs em uma grade Clay mais densa**

Mantenha os quatro KPIs, mas coloque a grade logo abaixo do hero com este wrapper:

```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
  <KpiCard
    title="Total de clientes"
    value={credores.length}
    subtitle="Base consolidada"
    icon={<Users className="h-5 w-5" />}
    tone="primary"
    isLoading={loading}
  />
  <KpiCard
    title="Carteira atualizada"
    value={resumo.totalCarteira}
    subtitle={`Media de R$ ${formatCurrency(carteiraMedia)} por cliente`}
    icon={<FileText className="h-5 w-5" />}
    tone="success"
    isLoading={loading}
    prefix={"R$\u00A0"}
    decimals={2}
  />
```

(Repita os outros dois `KpiCard` sem alterar a lógica existente.)

- [ ] **Step 3: Unificar busca, filtros, contadores e chips em uma barra operacional única**

Troque o topo do segundo `<section>` por este bloco:

```tsx
<div className="space-y-4 rounded-[24px] border border-black/[0.06] bg-white p-4" style={clayCardShadow}>
  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    <div className="relative w-full xl:max-w-3xl">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
      <input
        aria-label="Buscar clientes"
        placeholder="Buscar por nome, CPF/CNPJ, cidade, status, email ou telefone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-12 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] pl-11 pr-10 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
      />
      {searchTerm ? (
        <button
          type="button"
          onClick={() => setSearchTerm("")}
          aria-label="Limpar"
          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6b7280] hover:bg-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <span className={cx(clayBadgeClass, "border-[#e5e7eb] bg-[#f2f3f7] text-[#6b7280]")}>{filteredCredores.length} exibidos</span>
      <span className={cx(clayBadgeClass, "border-[#e5e7eb] bg-[#f2f3f7] text-[#6b7280]")}>{resumo.totalPrecatorios} processos</span>
      {isAdmin ? (
        <button type="button" onClick={() => setAdvancedFiltersOpen(true)} className={clayGhostButtonClass}>
          <Filter className="h-4 w-4" />
          {totalAdminFilters > 0 ? `Filtros (${totalAdminFilters})` : "Filtros avançados"}
        </button>
      ) : null}
    </div>
  </div>
```

Para os filtros ativos, use:

```tsx
<div className="flex flex-wrap items-center gap-2">
  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Filtros ativos</span>
  {adminFilterChips.map((chip) => (
    <span
      key={chip.key}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]"
    >
      <span>{chip.label}:</span>
      <span className="truncate">{chip.value}</span>
      <button type="button" onClick={() => removeAdminFilter(chip.key)} aria-label={`Remover filtro ${chip.label}`} className="rounded-full p-0.5 hover:bg-[#dbeafe]">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  ))}
</div>
```

- [ ] **Step 4: Rodar lint depois da troca do shell principal**

Run:

```bash
npm run lint -- --file "app/(dashboard)/clientes/page.tsx"
```

Expected: comando termina sem erros para o arquivo.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/clientes/page.tsx"
git commit -m "$(cat <<'EOF'
ref(clientes): apply Clay hero and operations bar

Replace the clientes page shell with a Clay hero, denser KPI section,
and unified operations bar to improve scanability.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Task 3: Trocar a grid por listagem híbrida desktop/mobile

**Files:**
- Modify: `app/(dashboard)/clientes/page.tsx:725-887`
- Modify: `app/(dashboard)/clientes/page.tsx:1788-1855`
- Test: `npm run lint -- --file "app/(dashboard)/clientes/page.tsx"`

- [ ] **Step 1: Reescrever o conteúdo de `ClienteListRow` com quatro zonas de leitura**

Use esta composição para o corpo do item:

```tsx
<>
  <div className="flex min-w-0 items-center gap-3">
    <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-[#0e4d6a] text-sm font-black text-white" style={clayPrimaryShadow}>
      {initials}
    </div>
    <div className="min-w-0 space-y-1">
      <p title={nome} className="truncate text-sm font-extrabold text-[#0b0c10]">{nome}</p>
      <p className="truncate text-xs font-medium text-[#6b7280]">{cpf ?? "CPF/CNPJ não informado"}</p>
    </div>
  </div>

  <div className="grid gap-2 text-xs text-[#6b7280] sm:grid-cols-2 lg:grid-cols-1">
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Contexto</span>
      <p className="mt-1 truncate">{cidadeUf ?? "Localização não informada"}</p>
      <p className="truncate">{dt ? `Últ. mov.: ${dt}` : "Sem movimentação recente"}</p>
    </div>
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Contato</span>
      <p className="truncate">{credor.telefone || "Sem telefone"}</p>
      <p className="truncate">{credor.email || "Sem e-mail"}</p>
    </div>
  </div>

  <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
    <div className="rounded-[18px] border border-black/[0.06] bg-[#f2f3f7] px-4 py-3" style={clayInsetShadow}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Carteira atualizada</span>
      <strong className={cx("mt-1 block truncate text-lg font-black tracking-[-0.03em]", carteiraAccentClass)}>
        {carteira ? `R$ ${formatCurrency(carteira)}` : "R$ 0,00"}
      </strong>
      <p className="mt-1 text-xs text-[#6b7280]">{ultimo > 0 ? `Último: R$ ${formatCurrency(ultimo)}` : "Sem último valor"}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2 lg:justify-start">
      <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold", statusClass(status))}>{formatStatus(status)}</span>
      <span className="inline-flex items-center rounded-full border border-black/[0.06] bg-white px-3 py-1 text-xs font-bold text-[#6b7280]">
        {credor.total_precatorios ?? 0} proc.
      </span>
    </div>
  </div>
```

- [ ] **Step 2: Mover as ações para a quarta zona do item**

Adicione este bloco ao final do `article`:

```tsx
<div className="flex items-center justify-between gap-2 lg:justify-end">
  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#0e4d6a]">
    Abrir detalhes
    <ChevronRight className="h-3.5 w-3.5" />
  </span>
  <div onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
    <Dropdown>
      <DropdownTrigger aria-label={`Ações de ${nome}`} className="inline-flex h-11 w-11 min-w-0 items-center justify-center rounded-2xl border border-black/[0.06] bg-[#f2f3f7] text-[#6b7280] hover:text-[#0b0c10]" style={clayInsetShadow}>
        <span className="inline-flex items-center justify-center" aria-hidden="true">
          <MoreVertical className="h-4 w-4" />
        </span>
      </DropdownTrigger>
      <DropdownPopover placement="bottom end">
        <DropdownMenu aria-label={`Ações para ${nome}`} onAction={(key) => {
          if (String(key) === "detalhes") onOpen()
        }}>
          <DropdownItem id="detalhes">
            <span className="inline-flex items-center gap-2">
              <ChevronRight className="h-4 w-4" />
              Ver detalhes
            </span>
          </DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  </div>
</div>
```

- [ ] **Step 3: Trocar a grid de cards por lista vertical com skeleton e vazio no novo formato**

Substitua o wrapper atual por este:

```tsx
<div className="space-y-3">
  {loading ? (
    Array.from({ length: 8 }).map((_, idx) => (
      <div key={`cliente-skeleton-${idx}`} className="rounded-[24px] border border-black/[0.07] bg-white p-4" style={clayCardShadow}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#e8eaef] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded-xl bg-[#e8eaef] animate-pulse" />
              <div className="h-3 w-28 rounded-xl bg-[#e8eaef] animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-32 rounded-xl bg-[#e8eaef] animate-pulse" />
            <div className="h-3 w-36 rounded-xl bg-[#e8eaef] animate-pulse" />
          </div>
          <div className="h-20 rounded-[18px] bg-[#f2f3f7] animate-pulse" />
          <div className="h-11 w-11 rounded-2xl bg-[#e8eaef] animate-pulse" />
        </div>
      </div>
    ))
  ) : filteredCredores.length === 0 ? (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-black/[0.07] bg-white px-6 text-center" style={clayCardShadow}>
      <p className="text-base font-extrabold text-[#0b0c10]">Nenhum cliente encontrado</p>
      <p className="mt-2 max-w-md text-sm text-[#6b7280]">Ajuste a busca ou remova filtros para visualizar resultados.</p>
    </div>
  ) : (
    paginatedCredores.map((credor) => (
      <ClienteListRow
        key={credor.id_unico}
        credor={credor}
        formatCurrency={formatCurrency}
        formatStatus={formatStatus}
        statusClass={statusClass}
        onOpen={() => openCredorDetails(credor)}
      />
    ))
  )}
</div>
```

Atualize também a paginação para botões maiores:

```tsx
<button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} className={clayGhostButtonClass}>
  Anterior
</button>
```

- [ ] **Step 4: Rodar lint após a troca da listagem principal**

Run:

```bash
npm run lint -- --file "app/(dashboard)/clientes/page.tsx"
```

Expected: comando termina sem erros para o arquivo.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/clientes/page.tsx"
git commit -m "$(cat <<'EOF'
ref(clientes): switch cards to hybrid list layout

Replace the clientes card grid with a denser Clay list that scans
faster on desktop while preserving compact stacked cards on mobile.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Task 4: Refatorar o modal de filtros avançados

**Files:**
- Modify: `app/(dashboard)/clientes/page.tsx:1859-2227`
- Test: `npm run lint -- --file "app/(dashboard)/clientes/page.tsx"`

- [ ] **Step 1: Atualizar o container e o header do modal de filtros para Clay**

Ajuste as constantes do modal e o header do modal de filtros para:

```tsx
const modalWrapper = "z-[120] p-0 sm:p-4"
const modalBackdrop = "bg-black/45 backdrop-blur-sm"
const modalBase = "w-[min(96vw,72rem)] max-w-[96vw] rounded-[28px] border border-black/[0.07] bg-white text-[#0b0c10]"
const modalContentBase = "flex max-h-[90dvh] min-h-0 flex-col overflow-hidden rounded-[28px] bg-white text-[#0b0c10]"
```

Use este header:

```tsx
<ModalHeader className="shrink-0 border-b border-black/[0.06] px-5 pb-4 pt-5 sm:px-6">
  <div className="space-y-2">
    <span className="inline-flex h-7 items-center rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1d4ed8]">
      Filtros avançados
    </span>
    <div>
      <h2 className="text-xl font-black tracking-[-0.03em] text-[#0b0c10]">Refinar base de clientes</h2>
      <p className="text-sm text-[#6b7280]">Filtre por status, período, carteira e presença de contato.</p>
    </div>
  </div>
</ModalHeader>
```

- [ ] **Step 2: Dar aparência Clay aos accordions e controles**

Atualize `itemClasses` para:

```tsx
itemClasses={{
  base: "rounded-[20px] border border-black/[0.06] bg-white",
  title: "text-sm font-extrabold tracking-[-0.02em] text-[#0b0c10]",
  trigger: "px-4 py-4",
  content: "px-4 pb-4 pt-1",
}}
```

Troque classes dos inputs/botões internos por estas bases:

```tsx
classNames={{
  inputWrapper: "h-11 min-h-11 rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] transition hover:bg-[#eef1f6]",
  input: "text-sm text-[#0b0c10] placeholder:text-[#9ca3af]",
}}
```

```tsx
className="w-full justify-between rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] text-[#374151] hover:bg-[#eef1f6]"
```

- [ ] **Step 3: Atualizar o footer para ações mais claras e alcançáveis no mobile**

Troque o footer por:

```tsx
<ModalFooter className="shrink-0 border-t border-black/[0.06] bg-white px-5 py-4 sm:px-6">
  <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button variant="light" color="default" onPress={clearAdminFilters} className="min-h-11 rounded-[15px] border border-black/[0.06] bg-[#f2f3f7] text-[#374151]">
      Limpar
    </Button>
    <Button color="primary" onPress={applyAdminFilters} className="min-h-11 rounded-[15px] bg-[#0e4d6a] text-white">
      Aplicar filtros
    </Button>
  </div>
</ModalFooter>
```

- [ ] **Step 4: Rodar lint após a refatoração do modal de filtros**

Run:

```bash
npm run lint -- --file "app/(dashboard)/clientes/page.tsx"
```

Expected: comando termina sem erros para o arquivo.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/clientes/page.tsx"
git commit -m "$(cat <<'EOF'
ref(clientes): restyle advanced filters modal

Bring the clientes advanced filters modal into the Clay system with a
clearer header, denser controls, and mobile-friendly actions.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Task 5: Refatorar o modal de detalhes, abas e dados do cliente

**Files:**
- Modify: `app/(dashboard)/clientes/page.tsx:2229-2599`
- Test: `npm run lint -- --file "app/(dashboard)/clientes/page.tsx"`

- [ ] **Step 1: Atualizar o cabeçalho do modal de detalhes e o resumo inicial**

Troque o header atual por:

```tsx
<ModalHeader className="shrink-0 border-b border-black/[0.06] px-5 pb-4 pt-5 sm:px-6">
  <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="flex items-start gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0e4d6a] text-white" style={clayPrimaryShadow}>
        <User className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <div>
          <h2 className="break-words text-[28px] font-black tracking-[-0.04em] text-[#0b0c10]">
            {selectedCredor?.credor_nome || "Cliente"}
          </h2>
          <p className="text-sm text-[#6b7280]">
            {selectedCredor?.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")
              ? selectedCredor.credor_cpf_cnpj
              : "CPF/CNPJ não informado"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx(clayBadgeClass, "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]")}>{selectedCredor?.total_precatorios || 0} processos</span>
          <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold", statusClass(selectedCredor?.ultimo_status))}>
            {formatStatus(selectedCredor?.ultimo_status)}
          </span>
        </div>
      </div>
    </div>
```

Troque os três cards-resumo por:

```tsx
<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
  <div className="rounded-[20px] border border-black/[0.07] bg-white p-4" style={clayCardShadow}>
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Total de processos</p>
    <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#0b0c10] tabular-nums">{selectedCredor?.total_precatorios || 0}</p>
  </div>
  <div className="rounded-[20px] bg-[#0e4d6a] p-4 text-white" style={clayPrimaryShadow}>
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Carteira atualizada</p>
    <p className="mt-2 text-2xl font-black tracking-[-0.03em] tabular-nums">
      {selectedCredor?.valor_total_atualizado || selectedCredor?.valor_total_principal
        ? `R$ ${formatCurrency(selectedCredor.valor_total_atualizado || selectedCredor.valor_total_principal)}`
        : "R$ 0,00"}
    </p>
  </div>
  <div className="rounded-[20px] border border-black/[0.07] bg-white p-4" style={clayCardShadow}>
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Último status</p>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold", statusClass(selectedCredor?.ultimo_status))}>
        {formatStatus(selectedCredor?.ultimo_status)}
      </span>
      <p className="text-xs text-[#6b7280]">
        {selectedCredor?.ultimo_precatorio_data
          ? new Date(selectedCredor.ultimo_precatorio_data).toLocaleDateString("pt-BR")
          : "Sem movimentação"}
      </p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Refatorar as tabs e a aba de dados para info-fields Clay**

Atualize `Tabs` para:

```tsx
<Tabs
  selectedKey={detailsTab}
  onSelectionChange={(key) => setDetailsTab(String(key) as "dados" | "processos" | "historico")}
  classNames={{
    base: "w-full",
    tabList: "w-full gap-2 overflow-x-auto rounded-[18px] bg-[#e8eaef] p-2",
    tab: "min-h-11 rounded-[14px] px-4 text-sm font-bold text-[#6b7280] data-[selected=true]:bg-white data-[selected=true]:text-[#0e4d6a]",
    panel: "pt-4",
  }}
>
```

No modo leitura, troque a grade simples por info-fields:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div className="space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Nome</p>
    <p className="text-sm font-semibold text-[#0b0c10]">{selectedCredor?.credor_nome || "-"}</p>
  </div>
  <div className="space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">CPF/CNPJ</p>
    <p className="text-sm font-semibold text-[#0b0c10]">
      {selectedCredor?.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")
        ? selectedCredor.credor_cpf_cnpj
        : "Não informado"}
    </p>
  </div>
```

No modo edição, atualize labels e campos para:

```tsx
<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Nome</p>
<Input
  aria-label="Nome"
  value={credorForm.credor_nome || ""}
  onValueChange={(value) => setCredorForm({ ...credorForm, credor_nome: value })}
  classNames={{
    inputWrapper: "h-11 min-h-11 rounded-[16px] border border-black/[0.06] bg-[#f2f3f7]",
    input: "text-sm text-[#0b0c10]",
  }}
/>
```

Repita o mesmo padrão para CPF/CNPJ, telefone, email, cidade e UF.

- [ ] **Step 3: Refatorar as abas de processos e histórico para o novo padrão visual**

Na aba de processos, envolva a tabela em um card Clay e ajuste as classes:

```tsx
<div className="overflow-hidden rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
  <Table
    aria-label="Tabela de processos do cliente"
    classNames={{
      wrapper: "w-full overflow-x-auto rounded-[24px]",
      table: "min-w-[720px] w-full",
      th: "bg-[#f2f3f7] text-[11px] uppercase tracking-[0.16em] text-[#9ca3af]",
      td: "align-top",
    }}
  >
```

Na aba histórico, troque cada item por:

```tsx
<div key={`timeline-${precatorio.id}`} className="rounded-[18px] border border-black/[0.06] bg-[#f2f3f7] px-4 py-3" style={clayInsetShadow}>
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <p className="font-mono text-xs text-[#374151]">{precatorio.numero_processo || "Processo N/A"}</p>
    <p className="text-xs text-[#6b7280]">
      Atualizado em {precatorio.updated_at ? new Date(precatorio.updated_at).toLocaleDateString("pt-BR") : new Date(precatorio.created_at).toLocaleDateString("pt-BR")}
    </p>
  </div>
  <p className="mt-2 text-sm font-medium text-[#0b0c10]">Status: {(precatorio.status || "N/I").replaceAll("_", " ")}</p>
</div>
```

- [ ] **Step 4: Rodar lint após a refatoração do modal de detalhes**

Run:

```bash
npm run lint -- --file "app/(dashboard)/clientes/page.tsx"
```

Expected: comando termina sem erros para o arquivo.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/clientes/page.tsx"
git commit -m "$(cat <<'EOF'
ref(clientes): redesign client details modal in Clay style

Reshape the clientes details modal with Clay summary blobs, cleaner
header hierarchy, and denser tabs for reading and editing.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Task 6: Validar responsividade, comportamento e acabamento

**Files:**
- Modify: `app/(dashboard)/clientes/page.tsx` (somente ajustes finos descobertos na validação)
- Test: `npm run lint -- --file "app/(dashboard)/clientes/page.tsx"`

- [ ] **Step 1: Rodar lint final do arquivo**

Run:

```bash
npm run lint -- --file "app/(dashboard)/clientes/page.tsx"
```

Expected: comando termina sem erros para o arquivo.

- [ ] **Step 2: Subir o app para validação manual**

Run:

```bash
npm run dev
```

Expected: servidor Next.js inicia sem erro fatal e a navegação do app abre a tela de clientes.

- [ ] **Step 3: Validar a tela em 375px, 768px e 1280px**

Checklist manual obrigatório:

```text
[ ] 375px: hero quebra corretamente, busca ocupa largura total, listagem empilha bem
[ ] 375px: botões e ações do modal têm toque mínimo de 44x44px
[ ] 768px: KPIs ficam legíveis em duas colunas, barra operacional não colide
[ ] 1280px: listagem mostra claramente identidade, contexto, negócio e ações
[ ] Modal: cabeçalho, value blobs, tabs e footer ficam consistentes
[ ] Busca, filtros, paginação, abrir detalhes, editar e salvar continuam funcionando
[ ] Não restou laranja decorativo na página de clientes
```

- [ ] **Step 4: Aplicar ajustes finos encontrados e rerodar lint**

Se algum ajuste visual for necessário, faça no mesmo arquivo e execute novamente:

```bash
npm run lint -- --file "app/(dashboard)/clientes/page.tsx"
```

Expected: comando termina sem erros para o arquivo após os ajustes finais.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/clientes/page.tsx"
git commit -m "$(cat <<'EOF'
ref(clientes): finalize Clay layout polish

Polish spacing, responsiveness, and modal interactions for the
clientes Clay refactor after manual viewport validation.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```