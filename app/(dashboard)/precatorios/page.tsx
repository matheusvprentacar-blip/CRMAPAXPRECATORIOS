"use client"
/* eslint-disable */

import React, { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  Button as HeroButton,
  Checkbox as HeroCheckbox,
  Chip as HeroChip,
  Dropdown as HeroDropdown,
  DropdownPopover as HeroDropdownPopover,
  DropdownItem as HeroDropdownItem,
  DropdownMenu as HeroDropdownMenu,
  DropdownTrigger as HeroDropdownTrigger,
  Modal as HeroModal,
  Spinner as HeroSpinner,
} from "@heroui/react"
import { Plus, Trash2, X, FileJson, Loader2, Filter, FileText, MoreVertical, LayoutGrid, List } from "@/components/icons"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { maskProcesso } from "@/lib/masks"
import { useToast } from "@/hooks/use-toast"
import { ImportJsonModal } from "@/components/import/import-json-modal"
import { SearchBar } from "@/components/precatorios/search-bar"
import { AdvancedFilters } from "@/components/precatorios/advanced-filters"
import { usePrecatoriosSearch } from "@/hooks/use-precatorios-search"
import { STATUS_LABELS, STATUS_OPTIONS } from "@/lib/types/filtros"

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ")

const deleteActionPopoverClassName =
  "w-fit !min-w-0 md:!min-w-0 overflow-hidden rounded-xl border border-white/15 !bg-black p-0 text-white shadow-[0_20px_50px_-28px_rgba(0,0,0,0.95)]"
const deleteActionMenuClassName = "w-auto min-w-0 !bg-black !p-0 !gap-0 text-white"
const deleteActionItemClassName =
  "!m-0 !h-auto !min-h-0 !rounded-none !bg-transparent !px-0 !py-0 text-white outline-none transition-colors data-[focus=true]:!bg-black/40 data-[focus-visible=true]:!bg-black/40 data-[hover=true]:!bg-black/40 data-[hovered=true]:!bg-black/40"
const deleteActionItemStyle: React.CSSProperties = { padding: 0, minHeight: 0 }
const deleteActionContentClassName =
  "group flex w-full select-none items-center gap-3 rounded-lg border border-white/15 bg-black p-2 shadow-sm"

const clayCardShadow: React.CSSProperties = {
  boxShadow: "16px 16px 36px rgba(0,0,0,.08), -8px -8px 20px rgba(255,255,255,.94), inset 1px 1px 4px rgba(255,255,255,.9), inset -1px -1px 2px rgba(0,0,0,.04)",
}

type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "secondary"

function Button({
  children,
  variant = "default",
  className,
  disabled,
  isLoading,
  size = "md",
  ...props
}: {
  children?: ReactNode
  variant?: ButtonVariant
  className?: string
  disabled?: boolean
  isLoading?: boolean
  size?: "sm" | "md" | "lg"
  [key: string]: unknown
}) {
  const heroVariant =
    variant === "outline"
      ? "outline"
      : variant === "ghost"
        ? "tertiary"
        : variant === "destructive"
          ? "danger"
          : "primary"
  const sizeClass = size === "sm" ? "h-9 px-3 text-sm" : size === "lg" ? "h-12 px-5 text-base" : "h-10 px-4 text-sm"
  return (
    <HeroButton
      {...(props as Record<string, unknown>)}
      variant={heroVariant}
      isDisabled={disabled || isLoading}
      className={cx(sizeClass, className)}
    >
      <span className="inline-flex items-center gap-2">
        {isLoading ? <HeroSpinner size="sm" /> : null}
        {children}
      </span>
    </HeroButton>
  )
}

function Badge({ children, className, variant }: { children?: ReactNode; className?: string; variant?: string }) {
  const colorClass =
    variant === "destructive"
      ? "bg-danger/15 text-danger border-danger/40"
      : "bg-default-100 text-foreground border-default-200/80"
  return (
    <HeroChip size="sm" className={cx("rounded-full px-2 py-1 text-xs font-semibold", colorClass, className)}>
      {children}
    </HeroChip>
  )
}

function Card({ children, className, ...props }: { children?: ReactNode; className?: string;[key: string]: unknown }) {
  return (
    <div className={cx("rounded-3xl border border-border bg-background shadow-sm", className)} {...(props as Record<string, unknown>)}>
      {children}
    </div>
  )
}

function CardContent({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

function Checkbox({
  checked,
  onCheckedChange,
  className,
  ...props
}: {
  checked?: boolean
  onCheckedChange?: (value: boolean) => void
  className?: string
  [key: string]: unknown
}) {
  return (
    <HeroCheckbox
      {...(props as Record<string, unknown>)}
      isSelected={Boolean(checked)}
      onChange={(v: boolean | undefined) => onCheckedChange?.(Boolean(v))}
      className={className}
    />
  )
}

type SelectContextType = {
  value?: string
  onChange?: (value: string) => void
}
const SelectContext = React.createContext<SelectContextType>({})

function Table({ children }: { children?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-default-200/60">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}
function TableHeader({ children }: { children?: ReactNode }) {
  return <thead>{children}</thead>
}
function TableBody({ children }: { children?: ReactNode }) {
  return <tbody>{children}</tbody>
}
function TableRow({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cx("border-t border-default-200/60", className)} {...props}>
      {children}
    </tr>
  )
}
function TableHead({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cx("px-3 py-2 font-semibold text-foreground/70", className)}>{children}</th>
}
function TableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cx("px-3 py-2 align-middle text-sm text-foreground", className)} {...props}>
      {children}
    </td>
  )
}

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <HeroModal isOpen={open} onOpenChange={onOpenChange}>
      <HeroModal.Trigger className="hidden">
        <span />
      </HeroModal.Trigger>
      <HeroModal.Backdrop className="bg-black/60" />
      <HeroModal.Container className="p-3">
        <HeroModal.Dialog className="w-[min(90vw,32rem)] rounded-2xl border border-border bg-background shadow-sm">
          {children}
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal>
  )
}

function DialogContent({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 p-6">{children}</div>
}
function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>
}
function DialogTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>
}
function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-foreground/70">{children}</p>
}
function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-3 pt-2">{children}</div>
}

function AnimatedListItem({
  children,
  index,
}: {
  children: ReactNode
  index: number
}) {
  return <div data-index={index}>{children}</div>
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
})

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

type ToneKey = "urgent" | "attention" | "healthy" | "neutral"

function formatMoney(value: number) {
  return currencyFormatter.format(value || 0)
}

function formatCompactMoney(value: number) {
  return compactCurrencyFormatter.format(value || 0)
}

function formatShortDate(value?: string | null) {
  if (!value) return "Nao informado"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Nao informado" : date.toLocaleDateString("pt-BR")
}

function getHeadline(precatorio: Precatorio) {
  return precatorio.credor_nome || precatorio.titulo || `Precatório ${precatorio.numero_precatorio || ""}`.trim()
}

function getInitials(value?: string | null) {
  const source = (value || "").trim()
  if (!source) return "PR"
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

function getResponsavelNome(precatorio: Precatorio) {
  return precatorio.responsavel_nome || precatorio.responsavel_calculo_nome || "Sem responsável"
}

function isPrecatorioDistribuido(precatorio: Precatorio) {
  return Boolean(
    precatorio.dono_usuario_id ||
      precatorio.responsavel ||
      precatorio.responsavel_nome ||
      precatorio.responsavel_calculo_id ||
      precatorio.responsavel_calculo_nome
  )
}

function getValorDisplay(precatorio: Precatorio) {
  const valorAtualizado = Number(precatorio.valor_atualizado || 0)
  const valorPrincipal = Number(precatorio.valor_principal || 0)
  const value = valorAtualizado > 0 ? valorAtualizado : valorPrincipal
  const label = valorAtualizado > 0 ? "Atualizado" : valorPrincipal > 0 ? "Principal" : "Valor"
  const valueClass = valorAtualizado > 0 ? "text-emerald-700" : "text-foreground"
  return { value, label, formatted: value > 0 ? formatMoney(value) : "Aguardando", valueClass }
}

function getComplexidadeMeta(precatorio: Precatorio) {
  if (precatorio.nivel_complexidade === "alta") {
    return { label: "Alta ▲", className: "text-rose-500 dark:text-rose-400" }
  }
  if (precatorio.nivel_complexidade === "media") {
    return { label: "Média ●", className: "text-amber-500 dark:text-amber-400" }
  }
  return { label: "Baixa ▼", className: "text-emerald-600 dark:text-emerald-400" }
}

function getOrigemLeadLabel(origemLead?: string | null) {
  if (!origemLead) return "Nao informada"
  return origemLead
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getStatusLabel(precatorio: Precatorio) {
  return STATUS_LABELS[precatorio.status || ""] || precatorio.status?.replace(/_/g, " ") || "Novo"
}

function getStatusTagClass(status?: Precatorio["status"]) {
  switch (status) {
    case "em_calculo":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "concluido":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "em_andamento":
    case "pendente_distribuicao":
    case "em_contato":
    case "aguardando_cliente":
      return "border-amber-200 bg-amber-50 text-amber-800"
    case "cancelado":
      return "border-red-200 bg-red-50 text-red-700"
    default:
      return "border-black/[0.07] bg-muted/40 text-muted-foreground"
  }
}

function getPriorityTagClass(prioridade?: Precatorio["prioridade"], urgente?: boolean) {
  if (urgente || prioridade === "urgente") {
    return "border-red-200 bg-red-50 text-red-700"
  }
  if (prioridade === "alta") {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }
  return "border-black/[0.07] bg-muted/40 text-muted-foreground"
}

function getSlaMeta(precatorio: Precatorio) {
  switch (precatorio.sla_status) {
    case "atrasado":
      return {
        tone: "urgent" as ToneKey,
        tagLabel: "SLA atrasado",
        tagClass: "border-red-200 bg-red-50 text-red-700",
        barClass: "bg-red-500",
        progress: 100,
        detail: precatorio.motivo_atraso_calculo || "Ação imediata",
        detailClass: "text-red-600",
      }
    case "atencao":
      return {
        tone: "attention" as ToneKey,
        tagLabel: "Atenção SLA",
        tagClass: "border-amber-200 bg-amber-50 text-amber-800",
        barClass: "bg-amber-500",
        progress: 78,
        detail: precatorio.sla_horas ? `${precatorio.sla_horas}h de SLA` : "Prazo em observação",
        detailClass: "text-amber-700",
      }
    case "concluido":
      return {
        tone: "healthy" as ToneKey,
        tagLabel: "Concluído",
        tagClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        barClass: "bg-emerald-500",
        progress: 100,
        detail: "Cálculo concluído",
        detailClass: "text-emerald-600",
      }
    case "nao_iniciado":
      return {
        tone: "neutral" as ToneKey,
        tagLabel: "Não iniciado",
        tagClass: "border-black/[0.07] bg-muted/40 text-muted-foreground",
        barClass: "bg-muted-foreground/30",
        progress: 16,
        detail: "Aguardando entrada em cálculo",
        detailClass: "text-muted-foreground",
      }
    default:
      return {
        tone: "healthy" as ToneKey,
        tagLabel: "No prazo",
        tagClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        barClass: "bg-emerald-500",
        progress: 56,
        detail: precatorio.sla_horas ? `${precatorio.sla_horas}h de SLA` : "Dentro do prazo",
        detailClass: "text-emerald-600",
      }
  }
}

function getToneClasses(tone: ToneKey) {
  switch (tone) {
    case "urgent":
      return {
        line: "bg-red-500",
        avatar: "bg-red-50 text-red-700",
        border: "border-red-200/60 hover:border-red-300",
      }
    case "attention":
      return {
        line: "bg-amber-500",
        avatar: "bg-amber-50 text-amber-800",
        border: "border-amber-200/60 hover:border-amber-300",
      }
    case "healthy":
      return {
        line: "bg-emerald-500",
        avatar: "bg-emerald-50 text-emerald-700",
        border: "border-emerald-200/60 hover:border-emerald-300",
      }
    default:
      return {
        line: "bg-blue-400",
        avatar: "bg-blue-50 text-blue-700",
        border: "border-black/[0.07] hover:border-black/[0.12]",
      }
  }
}

function TagPill({
  children,
  className,
}: {
  children: ReactNode
  className: string
}) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em]", className)}>
      {children}
    </span>
  )
}

function PrecatorioDeleteMenu({
  onDelete,
}: {
  onDelete: () => void
}) {
  return (
    <HeroDropdown>
      <HeroDropdownTrigger>
        <HeroButton
          as="div"
          isIconOnly
          variant="light"
          size="sm"
          className="h-8 w-8 min-w-0 rounded-md text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
        >
          <MoreVertical className="h-4 w-4" />
        </HeroButton>
      </HeroDropdownTrigger>
      <HeroDropdownPopover className={deleteActionPopoverClassName}>
        <HeroDropdownMenu aria-label="Acoes do precatorio" className={deleteActionMenuClassName}>
          <HeroDropdownItem
            key="delete"
            className={deleteActionItemClassName}
            style={deleteActionItemStyle}
            textValue="Excluir item"
            onPress={onDelete}
          >
            <div className={deleteActionContentClassName}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-sm font-semibold text-white">Excluir item</p>
              </div>
            </div>
          </HeroDropdownItem>
        </HeroDropdownMenu>
      </HeroDropdownPopover>
    </HeroDropdown>
  )
}

function PrecatorioVisualCard({
  precatorio,
  selected,
  selectable,
  onToggleSelect,
  onDelete,
  onOpen,
}: {
  precatorio: Precatorio
  selected: boolean
  selectable: boolean
  onToggleSelect: () => void
  onDelete: () => void
  onOpen: () => void
}) {
  const headline = getHeadline(precatorio)
  const statusLabel = getStatusLabel(precatorio)
  const responsavelNome = getResponsavelNome(precatorio)
  const initials = getInitials(headline)
  const valor = getValorDisplay(precatorio)
  const complexidade = getComplexidadeMeta(precatorio)
  const sla = getSlaMeta(precatorio)
  const tone = getToneClasses(sla.tone)

  return (
    <div
      className={cx(
        "group relative cursor-pointer overflow-hidden rounded-[22px] border border-black/[0.07] bg-white p-5 transition duration-200 hover:-translate-y-[2px]",
        tone.border,
        selected && "ring-2 ring-[#0e4d6a]/20"
      )}
      style={selected
        ? { ...clayCardShadow, boxShadow: "16px 16px 36px rgba(0,0,0,.08), -8px -8px 20px rgba(255,255,255,.94), inset 1px 1px 4px rgba(255,255,255,.9), inset -1px -1px 2px rgba(0,0,0,.04), 0 0 0 2px rgba(14,77,106,.2)" }
        : clayCardShadow}
      onClick={onOpen}
    >
      <div className={cx("absolute inset-x-0 top-0 h-[3px]", tone.line)} />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(precatorio.urgente || precatorio.prioridade === "urgente") && (
            <TagPill className={getPriorityTagClass(precatorio.prioridade, precatorio.urgente)}>
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
              Urgente
            </TagPill>
          )}
          <TagPill className={sla.tagClass}>
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
            {sla.tagLabel}
          </TagPill>
          <TagPill className={getStatusTagClass(precatorio.status)}>
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel}
          </TagPill>
          {precatorio.distribuido_por_admin && (
            <TagPill className="border-blue-200 bg-blue-50 text-blue-700">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
              Distribuído por admin
            </TagPill>
          )}
        </div>

        <div className="flex gap-4">
          {selectable && (
            <div className="pt-1" onClick={(event) => event.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={onToggleSelect}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </div>
          )}

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="min-w-0 flex-1 basis-[220px]">
                <div className="flex items-start gap-3">
                  <div className={cx("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold", tone.avatar)}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-bold text-foreground">{headline}</h3>
                    <div className="mt-1 text-[11.5px] font-medium text-muted-foreground">
                      {precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : precatorio.numero_precatorio || "Sem número"}
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground/70">
                      Devedor: {precatorio.devedor || "Não informado"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ml-auto min-w-0 max-w-full text-right sm:max-w-[48%]">
                <div className={cx("break-all text-[clamp(1rem,1.9vw,1.125rem)] font-extrabold leading-tight tracking-[-0.02em]", valor.valueClass)}>
                  {valor.formatted}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">
                  {valor.label}
                </div>
              </div>
            </div>

            {/* Info grid — inset clay */}
            <div className="grid grid-cols-2 gap-2 rounded-[12px] p-3" style={{ background: "#f2f3f7", boxShadow: "inset 5px 5px 12px rgba(0,0,0,.07), inset -4px -4px 10px rgba(255,255,255,.87)" }}>
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Tribunal</div>
                <div className="mt-1 truncate text-[12px] font-semibold text-foreground">{precatorio.tribunal || "Não informado"}</div>
              </div>
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Data-base</div>
                <div className="mt-1 text-[12px] font-semibold text-foreground">{formatShortDate(precatorio.data_base)}</div>
              </div>
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Complexidade</div>
                <div className={cx("mt-1 text-[12px] font-semibold", complexidade.className)}>{complexidade.label}</div>
              </div>
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Origem do lead</div>
                <div className="mt-1 inline-flex items-center rounded-full border border-black/[0.07] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {getOrigemLeadLabel(precatorio.origem_lead)}
                </div>
              </div>
            </div>

            {/* SLA progress */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "#e8eaef", boxShadow: "inset 2px 2px 4px rgba(0,0,0,.06), inset -1px -1px 3px rgba(255,255,255,.8)" }}>
                <div className={cx("h-full rounded-full transition-[width] duration-300", sla.barClass)} style={{ width: `${sla.progress}%` }} />
              </div>
              <span className={cx("w-[92px] shrink-0 text-right text-[10.5px] font-bold", sla.detailClass)}>{sla.detail}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: "#0e4d6a", boxShadow: "4px 4px 10px rgba(14,77,106,.36), -2px -2px 6px rgba(255,255,255,.3)" }}>
                  {getInitials(responsavelNome)}
                </div>
                <span className="text-[12px] font-medium text-muted-foreground">{responsavelNome}</span>
              </div>
              <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                {selectable ? <PrecatorioDeleteMenu onDelete={onDelete} /> : null}
                <span className="text-[12px] font-bold text-[#0e4d6a] transition-opacity duration-200 group-hover:opacity-100 md:opacity-0">
                  Ver detalhes →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrecatoriosTableView({
  precatorios,
  selectedIds,
  canDelete,
  toggleSelection,
  openDeleteDialog,
  openDetails,
}: {
  precatorios: Precatorio[]
  selectedIds: Set<string>
  canDelete: (precatorio: Precatorio) => boolean
  toggleSelection: (id: string) => void
  openDeleteDialog: (precatorio: Precatorio) => void
  openDetails: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-[22px] border border-black/[0.07] bg-white" style={clayCardShadow}>
      <table className="min-w-[980px] w-full border-collapse">
        <thead style={{ background: "#f2f3f7" }}>
          <tr>
            <th className="w-[44px] px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground" />
            <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Credor</th>
            <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">SLA</th>
            <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tribunal</th>
            <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Processo</th>
            <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Responsável</th>
            <th className="px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Valor</th>
            <th className="px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {precatorios.map((precatorio) => {
            const statusLabel = getStatusLabel(precatorio)
            const sla = getSlaMeta(precatorio)
            const valor = getValorDisplay(precatorio)
            const selectable = canDelete(precatorio)

            return (
              <tr
                key={precatorio.id}
                className="cursor-pointer border-t border-black/[0.05] transition hover:bg-[#f2f3f7]/60"
                onClick={() => openDetails(precatorio.id)}
              >
                <td className="px-4 py-3 align-middle" onClick={(event) => event.stopPropagation()}>
                  {selectable ? (
                    <Checkbox
                      checked={selectedIds.has(precatorio.id)}
                      onCheckedChange={() => toggleSelection(precatorio.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  ) : null}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="font-semibold text-foreground">{getHeadline(precatorio)}</div>
                  <div className="mt-1 text-[11.5px] text-muted-foreground">{precatorio.numero_precatorio || "Sem número"}</div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <TagPill className={getStatusTagClass(precatorio.status)}>{statusLabel}</TagPill>
                  {precatorio.distribuido_por_admin && (
                    <div className="mt-1 text-[10px] font-semibold text-blue-700">
                      Distribuído por admin
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex min-w-[150px] items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "#e8eaef" }}>
                      <div className={cx("h-full rounded-full", sla.barClass)} style={{ width: `${sla.progress}%` }} />
                    </div>
                    <span className={cx("text-[11px] font-semibold", sla.detailClass)}>{sla.tagLabel}</span>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-[13px] text-muted-foreground">{precatorio.tribunal || "-"}</td>
                <td className="px-4 py-3 align-middle text-[12px] font-mono text-muted-foreground">
                  {precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : "-"}
                </td>
                <td className="px-4 py-3 align-middle text-[13px] text-muted-foreground">{getResponsavelNome(precatorio)}</td>
                <td className="px-4 py-3 align-middle text-right">
                  <div className={cx("font-semibold", valor.valueClass)}>{valor.value > 0 ? formatMoney(valor.value) : "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">{valor.label}</div>
                </td>
                <td className="px-4 py-3 align-middle text-right" onClick={(event) => event.stopPropagation()}>
                  {selectable ? <PrecatorioDeleteMenu onDelete={() => openDeleteDialog(precatorio)} /> : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function PrecatoriosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userRole, setUserRole] = useState<string[] | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string }[]>([])
  const [searchInput, setSearchInput] = useState("")

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState(false)

  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const isCalculoOnly = userRole?.includes("operador_calculo") && !userRole?.includes("admin") && !userRole?.includes("gestor")
  const excludedStatuses = useMemo(() => (isCalculoOnly ? ["em_calculo"] : []), [isCalculoOnly])
  const searchOptions = useMemo(
    () => ({ page: currentPage, pageSize, excludedStatuses }),
    [currentPage, pageSize, excludedStatuses]
  )

  // Usar hook de busca avancada
  const {
    filtros,
    updateFiltros,
    clearFiltros,
    removeFiltro,
    setTermo,
    loading,
    initialized,
    resultados: precatorios,
    total: totalPrecatorios,
    summary,
    filtrosAtivos,
    refetch,
  } = usePrecatoriosSearch({}, { ...searchOptions, storageKey: "filtros:precatorios" })
  const precatoriosRawList = precatorios as unknown as Precatorio[]
  const precatoriosList = useMemo(() => {
    if (!filtros.distribuicao) return precatoriosRawList

    if (filtros.distribuicao === "distribuido") {
      return precatoriosRawList.filter((item) => isPrecatorioDistribuido(item))
    }

    if (filtros.distribuicao === "pendente") {
      return precatoriosRawList.filter((item) => !isPrecatorioDistribuido(item))
    }

    return precatoriosRawList.filter((item) => item.distribuido_por_admin === true)
  }, [precatoriosRawList, filtros.distribuicao])

  const calculadosCount = summary.calculados
  const emCalculoOuNovoCount = summary.emCalculoOuNovo

  const responsavelAtivo = useMemo(() => {
    if (!filtros.responsavel_id) return null
    const match = responsaveis.find((r) => r.id === filtros.responsavel_id)
    return match?.nome || filtros.responsavel_id
  }, [filtros.responsavel_id, responsaveis])

  const statusValues = useMemo(() => new Set(STATUS_OPTIONS.map((option) => option.value)), [])
  const statusSelectValue =
    filtros.status?.length === 1 && statusValues.has(filtros.status[0]) ? filtros.status[0] : "todos"

  useEffect(() => {
    if (!filtros.status || filtros.status.length === 0) return

    const validStatus = filtros.status.filter((value) => statusValues.has(value))
    if (validStatus.length === filtros.status.length) return

    updateFiltros({
      ...filtros,
      status: validStatus.length > 0 ? validStatus : undefined,
    })
  }, [filtros, statusValues, updateFiltros])

  const handleStatusFilterChange = (value: string) => {
    const nextStatus = value === "todos" || !statusValues.has(value) ? undefined : [value]
    updateFiltros({
      ...filtros,
      status: nextStatus,
    })
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [precatorioToDelete, setPrecatorioToDelete] = useState<Precatorio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importJsonOpen, setImportJsonOpen] = useState(false)

  useEffect(() => {
    loadUserInfo()
  }, [])

  async function loadUserInfo() {
    try {
      const supabase = getSupabase()

      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        setAuthUserId(user.id)

        const { data: perfil } = await supabase.from("usuarios").select("role").eq("id", user.id).single()
        setUserRole(perfil?.role || null)
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error)
    }
  }

  useEffect(() => {
    if (!userRole?.includes("admin")) {
      setResponsaveis([])
      return
    }

    ; (async () => {
      try {
        const supabase = getSupabase()
        if (!supabase) return

        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, role, ativo")
          .eq("ativo", true)
          .order("nome", { ascending: true })

        if (error) throw error

        const allowedRoles = new Set([
          "admin",
          "gestor",
          "gestor_oficio",
          "gestor_certidoes",
          "gestor_escrituras",
          "operador",
          "operador_comercial",
          "operador_calculo",
        ])

        const list =
          data?.filter((user: any) => {
            const roles = Array.isArray(user?.role) ? user.role : [user?.role].filter(Boolean)
            return roles.some((r: string) => allowedRoles.has(r))
          }) || []

        setResponsaveis(
          list.map((user: any) => ({
            id: user.id,
            nome: user.nome || "Sem nome",
          }))
        )
      } catch (err) {
        console.error("Erro ao carregar responsaveis:", err)
        setResponsaveis([])
      }
    })()
  }, [userRole])



  const temFiltrosAtivos = filtrosAtivos.length > 0 || !!filtros.responsavel_id
  const searchTerm = filtros.termo || ""

  useEffect(() => {
    setSearchInput(searchTerm)
  }, [searchTerm])

  const handleRemoveFiltro = (key: string) => {
    if (key === "termo") {
      setSearchInput("")
    }
    removeFiltro(key)
  }

  const handleClearAllFiltros = () => {
    setSearchInput("")
    clearFiltros()
  }

  const distribuicaoFiltroAtivo = Boolean(filtros.distribuicao)
  const effectiveTotalPrecatorios = distribuicaoFiltroAtivo ? precatoriosList.length : totalPrecatorios
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(effectiveTotalPrecatorios / pageSize)),
    [effectiveTotalPrecatorios, pageSize]
  )
  const rangeStart = effectiveTotalPrecatorios === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = effectiveTotalPrecatorios === 0 ? 0 : Math.min(rangeStart + precatoriosList.length - 1, effectiveTotalPrecatorios)

  useEffect(() => {
    setCurrentPage(1)
  }, [filtros, isCalculoOnly])

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [currentPage, filtros, isCalculoOnly])


  async function handleDeletePrecatorio() {
    if (!precatorioToDelete) return

    setDeleting(true)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase não disponível")

      const { error } = await supabase.rpc("delete_precatorio", { p_precatorio_id: precatorioToDelete.id })

      if (error) throw error

      toast({
        title: "Precatório excluído",
        description: "O precatório foi excluído com sucesso",
      })

      await refetch()
      setDeleteDialogOpen(false)
      setPrecatorioToDelete(null)
    } catch (error: any) {
      console.error("Erro ao excluir precatório:", error)
      toast({
        title: "Erro ao excluir precatório",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = (precatorio: Precatorio) => {
    if (userRole?.includes("admin") || userRole?.includes("gestor")) return true
    if (userRole?.includes("operador_comercial")) {
      return precatorio.criado_por === authUserId
    }
    return false
  }

  function toggleSelection(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function toggleSelectAll() {
    if (selectedIds.size === precatoriosList.filter((p) => canDelete(p)).length) {
      setSelectedIds(new Set<string>())
    } else {
      const allDeletable = new Set<string>(
        precatoriosList
          .filter((p) => canDelete(p))
          .map((p) => p.id)
      )
      setSelectedIds(allDeletable)
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return

    setDeletingBatch(true)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase não disponível")

      let successCount = 0
      let errorCount = 0

      for (const id of Array.from(selectedIds)) {
        try {
          const { error } = await supabase.rpc("delete_precatorio", { p_precatorio_id: id })
          if (error) errorCount++
          else successCount++
        } catch (error) {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast({
          title: "Exclusão concluída",
          description: `${successCount} precatórios excluídos.`,
        })
      }

      if (errorCount > 0) {
        toast({
          title: "Erro na exclusão",
          description: `Falha ao excluir ${errorCount} precatórios.`,
          variant: "destructive",
        })
      }

      await refetch()
      setSelectedIds(new Set<string>())
      setBatchDeleteDialogOpen(false)
    } catch (error: any) {
      console.error("Erro na exclusão em lote:", error)
      toast({
        title: "Erro na exclusão em lote",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeletingBatch(false)
    }
  }

  const deletableCount = precatoriosList.filter((p) => canDelete(p)).length
  const slaAtrasadoCount = precatoriosList.filter((precatorio) => precatorio.sla_status === "atrasado").length
  const valorExibidoTotal = precatoriosList.reduce((total, precatorio) => {
    const valorAtualizado = Number(precatorio.valor_atualizado || 0)
    const valorPrincipal = Number(precatorio.valor_principal || 0)
    return total + (valorAtualizado > 0 ? valorAtualizado : valorPrincipal)
  }, 0)

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 pb-24 sm:px-5">
      {/* ===== HERO TITLE — padrão de todas as páginas ===== */}
      <section className="relative overflow-hidden rounded-[28px] border border-black/[0.07] bg-[rgba(255,255,255,0.92)] backdrop-blur-xl" style={clayCardShadow}>
        <div className="p-4 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.9fr)]">

            {/* Coluna esquerda — identidade da página */}
            <div>
              <span className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-primary/10 px-3 py-1.5 text-[13px] font-bold tracking-wide text-primary">
                <span className="shrink-0">●</span>
                <span className="truncate">CRM Precatórios · gestão de processos</span>
              </span>
              <p className="mt-3 text-[clamp(1.55rem,6vw,4.4rem)] font-black leading-none tracking-[-0.05em] text-primary">
                Precatórios
              </p>
              <h1 className="no-route-shiny mt-3 text-[clamp(1rem,3vw,2.2rem)] font-bold leading-[1.1] tracking-[-0.03em]" style={{ color: "#0e4d6a" }}>
                Todos os processos em um só lugar.
              </h1>
              <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-[15px]">
                Gerencie a carteira com visão operacional clara, atalhos rápidos e filtros inteligentes.
              </p>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setImportJsonOpen(true)}
                  className="rounded-xl border-border bg-background text-muted-foreground hover:border-border hover:text-foreground"
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  Importar
                </Button>
                <Button
                  onClick={() => router.push("/precatorios/novo")}
                  className="rounded-xl border-none bg-primary text-white shadow-[8px_8px_20px_rgba(14,77,106,.42),-3px_-3px_8px_rgba(255,255,255,.3),inset_1px_1px_3px_rgba(255,255,255,.14),inset_-1px_-1px_2px_rgba(8,40,60,.3)]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Precatório
                </Button>
              </div>
            </div>

            {/* Coluna direita — KPIs */}
            <div className="grid grid-cols-2 gap-3 content-start">
              <div className="rounded-[18px] border border-black/[0.07] bg-white p-4" style={clayCardShadow}>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Total</div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-foreground">{effectiveTotalPrecatorios}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">na carteira</div>
              </div>
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-emerald-700">Calculados</div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-emerald-700">{calculadosCount}</div>
                <div className="mt-1 text-[11px] text-emerald-700/80">cálculo concluído</div>
              </div>
              <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-amber-800">Em cálculo / Novo</div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-amber-700">{emCalculoOuNovoCount}</div>
                <div className="mt-1 text-[11px] text-amber-800/80">em andamento</div>
              </div>
              <div className="rounded-[18px] border border-red-200 bg-red-50 p-4">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-red-700">SLA atrasado</div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-red-600">{slaAtrasadoCount}</div>
                <div className="mt-1 text-[11px] text-red-700/80">na página atual</div>
              </div>
              <div className="col-span-2 rounded-[18px] border border-blue-200 bg-blue-50 p-4">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-blue-700">Valor exibido</div>
                <div className="mt-1 text-[22px] font-bold leading-none tabular-nums text-blue-600">{formatCompactMoney(valorExibidoTotal)}</div>
                <div className="mt-1 text-[11px] text-blue-700/80">portfólio desta página</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="rounded-[18px] border border-slate-900/10 bg-white p-4 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#18181b] md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex-1">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={(value) => {
                setSearchInput(value)
                setTermo(value)
              }}
              onClear={() => setSearchInput("")}
              placeholder="Busque por título, número, credor ou processo..."
              autoSearch={false}
              showButton={true}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HeroDropdown>
              <HeroDropdownTrigger>
                <div
                  className="inline-flex h-11 w-[190px] cursor-pointer items-center justify-between rounded-xl border border-slate-900/10 bg-[#f4f5f8] px-3 text-sm font-medium text-slate-500 shadow-sm dark:border-white/10 dark:bg-[#09090b] dark:text-slate-300"
                >
                  {statusSelectValue === "todos"
                    ? "Todos os status"
                    : STATUS_OPTIONS.find((option) => option.value === statusSelectValue)?.label || "Status"}
                </div>
              </HeroDropdownTrigger>
              <HeroDropdownPopover>
                <HeroDropdownMenu aria-label="Filtro status">
                  <HeroDropdownItem key="todos" onPress={() => handleStatusFilterChange("todos")}>
                    Todos
                  </HeroDropdownItem>
                  {STATUS_OPTIONS.map((option) => (
                    <HeroDropdownItem key={option.value} onPress={() => handleStatusFilterChange(option.value)}>
                      {option.label}
                    </HeroDropdownItem>
                  ))}
                </HeroDropdownMenu>
              </HeroDropdownPopover>
            </HeroDropdown>
            <AdvancedFilters
              filtros={filtros}
              onFilterChange={updateFiltros}
              onClearFilters={handleClearAllFiltros}
              totalFiltrosAtivos={filtrosAtivos.length + (filtros.responsavel_id ? 1 : 0)}
              responsaveis={responsaveis}
              showResponsavelFilter={!!userRole?.includes("admin")}
              showDistribuicaoFilter={true}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 xl:ml-auto xl:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-[#f4f5f8] px-3 py-1.5 text-[12.5px] font-medium text-slate-500 dark:border-white/10 dark:bg-[#09090b] dark:text-slate-300">
              <span>{effectiveTotalPrecatorios} registros</span>
              {loading && initialized ? (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Atualizando...
                </span>
              ) : null}
            </div>
            <div className="inline-flex items-center rounded-full border border-slate-900/10 bg-[#f4f5f8] p-1 dark:border-white/10 dark:bg-[#09090b]">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  viewMode === "cards"
                    ? "bg-orange-500/15 text-orange-600 shadow-[0_2px_8px_rgba(249,115,22,0.18)] dark:text-orange-300"
                    : "text-slate-500 hover:text-orange-500 dark:text-slate-300 dark:hover:text-orange-300"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  viewMode === "table"
                    ? "bg-orange-500/15 text-orange-600 shadow-[0_2px_8px_rgba(249,115,22,0.18)] dark:text-orange-300"
                    : "text-slate-500 hover:text-orange-500 dark:text-slate-300 dark:hover:text-orange-300"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Tabela
              </button>
            </div>
          </div>
        </div>

        {temFiltrosAtivos ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-900/10 pt-4 dark:border-white/10">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Filtros ativos</span>
            {responsavelAtivo ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-3 py-1 text-[12px] text-slate-500 dark:border-white/10 dark:bg-[#09090b] dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Responsável:</span>
                <span>{responsavelAtivo}</span>
                <button onClick={() => handleRemoveFiltro("responsavel_id")} type="button" className="ml-1 transition-colors hover:text-rose-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            {filtrosAtivos.map((filtro: any, index: number) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-3 py-1 text-[12px] text-slate-500 dark:border-white/10 dark:bg-[#09090b] dark:text-slate-300"
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">{filtro.label}:</span>
                <span>{filtro.displayValue}</span>
                <button onClick={() => handleRemoveFiltro(filtro.key)} type="button" className="ml-1 transition-colors hover:text-rose-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearAllFiltros}
              className="h-7 rounded-lg border border-slate-900/10 bg-white px-2.5 text-[12px] font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-[#09090b] dark:text-slate-300"
            >
              Limpar tudo
            </button>
          </div>
        ) : null}
      </div>

      {/* Lista */}
      {
        precatoriosList.length === 0 ? (
          <div className="relative overflow-hidden rounded-[22px] border-2 border-dashed border-black/[0.07] bg-white px-6 py-20 text-center" style={clayCardShadow}>
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/[0.07] bg-[#f2f3f7]" style={{ boxShadow: "inset 5px 5px 12px rgba(0,0,0,.07), inset -4px -4px 10px rgba(255,255,255,.87)" }}>
              {searchTerm || temFiltrosAtivos ? (
                <Filter className="h-7 w-7 text-muted-foreground" />
              ) : (
                <FileText className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <h3 className="relative text-lg font-bold text-foreground">
              {searchTerm || temFiltrosAtivos ? "Nenhum resultado encontrado" : "Sua lista está vazia"}
            </h3>
            <p className="relative mx-auto mt-2 mb-6 max-w-sm text-[13.5px] leading-6 text-muted-foreground">
              {searchTerm || temFiltrosAtivos
                ? "Tente ajustar os filtros ou termo de busca para encontrar o que procura."
                : "Comece adicionando novos precatórios para gerenciá-los aqui."}
            </p>
            {!searchTerm && !temFiltrosAtivos && (
              <Button onClick={() => router.push("/precatorios/novo")} className="rounded-xl border-none bg-primary text-white shadow-[8px_8px_20px_rgba(14,77,106,.42),-3px_-3px_8px_rgba(255,255,255,.3),inset_1px_1px_3px_rgba(255,255,255,.14),inset_-1px_-1px_2px_rgba(8,40,60,.3)]">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Precatório
              </Button>
            )}
          </div>
        ) : (
          <>
            {deletableCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-black/[0.07] bg-white px-4 py-3 text-sm text-muted-foreground" style={{ boxShadow: "4px 4px 12px rgba(0,0,0,.05), -2px -2px 8px rgba(255,255,255,.9)" }}>
                <label className="flex items-center gap-2 font-semibold text-foreground">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === deletableCount}
                    onCheckedChange={toggleSelectAll}
                  />
                  Selecionar página
                </label>
                {selectedIds.size > 0 && (
                  <span className="inline-flex items-center rounded-full border border-[#0e4d6a]/20 bg-[#e8f4f8] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#0e4d6a]">
                    {selectedIds.size} selecionado(s)
                  </span>
                )}
              </div>
            )}

            {/* Visualização controlada por clique */}
            <div>
              {viewMode === "table" ? (
                <PrecatoriosTableView
                  precatorios={precatoriosList}
                  selectedIds={selectedIds}
                  canDelete={canDelete}
                  toggleSelection={toggleSelection}
                  openDeleteDialog={(precatorio) => {
                    setPrecatorioToDelete(precatorio)
                    setDeleteDialogOpen(true)
                  }}
                  openDetails={(id) => router.push(`/precatorios/detalhes?id=${id}`)}
                />
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))" }}>
                  {precatoriosList.map((precatorio, index) => (
                    <AnimatedListItem key={precatorio.id} index={index}>
                      <PrecatorioVisualCard
                        precatorio={precatorio}
                        selected={selectedIds.has(precatorio.id)}
                        selectable={canDelete(precatorio)}
                        onToggleSelect={() => toggleSelection(precatorio.id)}
                        onDelete={() => {
                          setPrecatorioToDelete(precatorio)
                          setDeleteDialogOpen(true)
                        }}
                        onOpen={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                      />
                    </AnimatedListItem>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-black/[0.07] bg-white px-4 py-3" style={clayCardShadow}>
              <span className="text-sm text-muted-foreground">
                Exibindo {rangeStart}–{rangeEnd} de {effectiveTotalPrecatorios} precatórios
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="border-border bg-background text-muted-foreground hover:border-[#0e4d6a]/30 hover:text-[#0e4d6a]"
                >
                  Anterior
                </Button>
                <span className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-black/[0.07] bg-[#f2f3f7] px-4 py-2 text-center text-xs font-semibold text-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="border-border bg-background text-muted-foreground hover:border-[#0e4d6a]/30 hover:text-[#0e4d6a]"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )
      }

      {
        selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-black/[0.07] bg-white/95 px-4 py-2 backdrop-blur" style={{ boxShadow: "16px 16px 36px rgba(0,0,0,.10), -8px -8px 20px rgba(255,255,255,.94), inset 1px 1px 4px rgba(255,255,255,.9), inset -1px -1px 2px rgba(0,0,0,.04)" }}>
              <span className="text-sm font-semibold text-foreground">
                {selectedIds.size} selecionado(s)
              </span>
              <div className="h-6 w-px bg-black/[0.07]" />
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Em breve"
                className="border-border bg-[#f2f3f7] text-muted-foreground"
              >
                Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Em breve"
                className="border-border bg-[#f2f3f7] text-muted-foreground"
              >
                Mover status
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Em breve"
                className="border-border bg-[#f2f3f7] text-muted-foreground"
              >
                Atribuir responsável
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Em breve"
                className="border-border bg-[#f2f3f7] text-muted-foreground"
              >
                Gerar PDF
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBatchDeleteDialogOpen(true)}
                className="shadow-[0_8px_20px_-12px_rgba(220,38,38,0.5)]"
              >
                Excluir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set<string>())}
                className="text-muted-foreground"
              >
                Limpar
              </Button>
            </div>
          </div>
        )
      }

      <AlertDialog isOpen={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger">
                  <Trash2 className="w-5 h-5" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Excluir este item?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Tem certeza que deseja remover permanentemente o precatório <strong>{precatorioToDelete?.titulo || precatorioToDelete?.numero_precatorio}</strong>? Esta ação não pode ser desfeita.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <HeroButton slot="close" variant="tertiary" onPress={() => setDeleteDialogOpen(false)}>
                  Cancelar
                </HeroButton>
                <HeroButton slot="close" variant="danger" onPress={handleDeletePrecatorio} isDisabled={deleting}>
                  {deleting ? <HeroSpinner size="sm" /> : null}
                  Excluir item
                </HeroButton>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão em Lote</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} precatório{selectedIds.size !== 1 ? 's' : ''}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchDeleteDialogOpen(false)}
              disabled={deletingBatch}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={deletingBatch}
            >
              {deletingBatch ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                `Excluir ${selectedIds.size} Precatório${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportJsonModal
        open={importJsonOpen}
        onOpenChange={setImportJsonOpen}
        onSuccess={() => {
          refetch()
          setImportJsonOpen(false)
        }}
      />
    </div >
  )
}

