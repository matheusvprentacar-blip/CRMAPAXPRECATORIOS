"use client"

import React, { type ReactNode, createContext, useContext, useDeferredValue, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import CountUp from "react-countup"
import {
  Accordion as HeroAccordion,
  Button as HeroButton,
  Checkbox as HeroCheckbox,
  Chip as HeroChip,
  Dropdown as HeroDropdown,
  DropdownItem as HeroDropdownItem,
  DropdownMenu as HeroDropdownMenu,
  DropdownPopover as HeroDropdownPopover,
  DropdownTrigger as HeroDropdownTrigger,
  Input as HeroInput,
  Modal as HeroModal,
  Separator,
  Spinner as HeroSpinner,
  Tabs as HeroTabs,
  useOverlayState,
} from "@heroui/react"
import { Search, User, Phone, Mail, FileText, ChevronRight, Clock, Filter, X, MoreVertical, RefreshCw, Users, Edit3 } from "@/components/icons"
import { getSupabase } from "@/lib/supabase/client"
import { CredorView, Precatorio } from "@/lib/types/database"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"

type PrecatorioResumo = Precatorio & {
  status_kanban?: string | null
  localizacao_kanban?: string | null
  dono_usuario_id?: string | null
  responsavel?: string | null
}

type CredorResumo = CredorView & {
  valor_total_atualizado: number
  ultimo_status: string | null
  ultimo_precatorio_valor: number
}

type ClientesAdminFilters = {
  status?: string[]
  cidade?: string
  uf?: string
  carteiraMin?: number
  carteiraMax?: number
  qtdMin?: number
  qtdMax?: number
  ultimaMovInicio?: string
  ultimaMovFim?: string
  apenasComContato?: boolean
}

type ClienteFilterChip = {
  key: string
  label: string
  value: string
}

const glassCard = "rounded-3xl border border-border bg-background shadow-sm"

const cardSoft = "rounded-3xl border border-border bg-background shadow-sm"

const clientGridRows = ""
const clientCardHeight = ""

const modalWrapper = "z-[120] p-2 sm:p-4"
const modalBackdrop = "bg-black/65"
const modalBase =
  "w-[min(96vw,72rem)] max-w-[96vw] rounded-3xl border border-border bg-background shadow-sm"
const modalContentBase =
  "flex max-h-[88vh] min-h-0 flex-col overflow-hidden overflow-x-hidden rounded-3xl bg-background"

const sheen = ""
const carteiraAccentClass = "text-[#95c63d] dark:text-[#a7d75a] drop-shadow-[0_0_12px_rgba(149,198,61,0.16)]"

const clienteModalInputClassNames =
  "h-11 min-h-11 rounded-xl border border-border bg-muted/40 px-3 " +
  "text-foreground placeholder:text-foreground/55 hover:bg-muted/60"

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ")

type LegacyButtonProps = {
  children?: ReactNode
  className?: string
  startContent?: ReactNode
  endContent?: ReactNode
  isLoading?: boolean
  isDisabled?: boolean
  isIconOnly?: boolean
  color?: "default" | "primary" | "success" | "warning" | "danger"
  radius?: "none" | "sm" | "md" | "lg" | "full"
  variant?: "solid" | "flat" | "light" | "bordered" | "ghost"
  size?: "sm" | "md" | "lg"
  onPress?: (event?: unknown) => void
  type?: "button" | "submit" | "reset"
  [key: string]: unknown
}

const mapButtonVariant = (variant: LegacyButtonProps["variant"]) => {
  switch (variant) {
    case "flat":
      return "secondary"
    case "light":
      return "tertiary"
    case "bordered":
      return "outline"
    case "ghost":
      return "ghost"
    default:
      return "primary"
  }
}

function Button({
  children,
  className,
  startContent,
  endContent,
  isLoading,
  isDisabled,
  isIconOnly,
  color = "default",
  radius = "md",
  variant = "solid",
  onPress,
  ...props
}: LegacyButtonProps) {
  const radiusClass =
    radius === "none"
      ? "rounded-none"
      : radius === "sm"
        ? "rounded-md"
        : radius === "lg"
          ? "rounded-xl"
          : radius === "full"
            ? "rounded-full"
            : "rounded-lg"

  const colorClass =
    color === "primary"
      ? variant === "solid"
        ? "bg-primary text-primary-foreground"
        : "text-primary"
      : color === "success"
        ? variant === "solid"
          ? "bg-success text-success-foreground"
          : "text-success"
        : color === "warning"
          ? variant === "solid"
            ? "bg-warning text-warning-foreground"
            : "text-warning"
          : color === "danger"
            ? variant === "solid"
              ? "bg-danger text-danger-foreground"
              : "text-danger"
            : ""

  return (
    <HeroButton
      {...(props as Record<string, unknown>)}
      variant={mapButtonVariant(variant)}
      isDisabled={Boolean(isDisabled || isLoading)}
      isIconOnly={isIconOnly}
      onPress={onPress as ((event: unknown) => void) | undefined}
      className={cx(radiusClass, colorClass, className)}
    >
      <span className="inline-flex items-center gap-2">
        {isLoading ? <HeroSpinner size="sm" /> : startContent}
        {children}
        {!isLoading ? endContent : null}
      </span>
    </HeroButton>
  )
}

type LegacyInputClassNames = {
  inputWrapper?: string
  input?: string
}

type LegacyInputProps = {
  className?: string
  onValueChange?: (value: string) => void
  isClearable?: boolean
  onClear?: () => void
  startContent?: ReactNode
  classNames?: LegacyInputClassNames | string
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  size?: "sm" | "md" | "lg"
  [key: string]: unknown
}

function Input({
  className,
  classNames,
  onValueChange,
  isClearable,
  onClear,
  startContent,
  value,
  onChange,
  size = "md",
  ...props
}: LegacyInputProps) {
  const sizeClass = size === "sm" ? "h-10 text-sm" : size === "lg" ? "h-12 text-base" : "h-11 text-sm"
  const hasValue = typeof value === "string" ? value.length > 0 : Boolean(value)
  const resolvedClassNames = typeof classNames === "string" ? { inputWrapper: classNames } : classNames
  return (
    <div className={cx("relative w-full", className)}>
      {startContent ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">{startContent}</span> : null}
      <HeroInput
        {...(props as Record<string, unknown>)}
        value={value}
        className={cx(
          sizeClass,
          "w-full rounded-xl border border-border bg-muted/50 px-3 text-foreground placeholder:text-foreground/55",
          startContent ? "pl-10" : "",
          resolvedClassNames?.inputWrapper,
          resolvedClassNames?.input
        )}
        onChange={(event) => {
          onValueChange?.(event.target.value)
          onChange?.(event)
        }}
      />
      {isClearable && hasValue ? (
        <HeroButton
          type="button"
          isIconOnly
          variant="tertiary"
          className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
          onPress={() => {
            onValueChange?.("")
            onClear?.()
          }}
          aria-label="Limpar"
        >
          <X className="h-3.5 w-3.5" />
        </HeroButton>
      ) : null}
    </div>
  )
}

type LegacyChipProps = {
  children?: ReactNode
  className?: string
  startContent?: ReactNode
  onClose?: () => void
  size?: "sm" | "md" | "lg"
  variant?: "flat" | "solid" | "bordered"
  [key: string]: unknown
}

const mapChipVariant = (variant: LegacyChipProps["variant"]) => {
  switch (variant) {
    case "solid":
      return "primary"
    case "bordered":
      return "tertiary"
    default:
      return "secondary"
  }
}

function Chip({ startContent, onClose, children, className, variant = "flat", ...props }: LegacyChipProps) {
  return (
    <HeroChip className={cx("inline-flex items-center gap-1.5", className)} variant={mapChipVariant(variant)} {...(props as Record<string, unknown>)}>
      {startContent ? <span className="inline-flex items-center">{startContent}</span> : null}
      <span className="inline-flex items-center gap-1">{children}</span>
      {onClose ? (
        <HeroButton
          isIconOnly
          variant="tertiary"
          className="h-4 w-4 rounded-full p-0 text-[10px]"
          onPress={onClose}
          aria-label="Remover"
        >
          <X className="h-2.5 w-2.5" />
        </HeroButton>
      ) : null}
    </HeroChip>
  )
}

type LegacyDropdownProps = {
  placement?: string
  children?: ReactNode
  [key: string]: unknown
}

const DropdownPlacementContext = createContext<string | undefined>(undefined)

function Dropdown({ placement, children, ...props }: LegacyDropdownProps) {
  return (
    <DropdownPlacementContext.Provider value={placement}>
      <HeroDropdown {...(props as Record<string, unknown>)}>{children}</HeroDropdown>
    </DropdownPlacementContext.Provider>
  )
}

const DropdownTrigger = HeroDropdownTrigger
const DropdownMenu = HeroDropdownMenu

function DropdownPopover({ placement, children, ...props }: { placement?: string; children?: ReactNode;[key: string]: unknown }) {
  const placementFromContext = useContext(DropdownPlacementContext)
  const normalized =
    placement || (placementFromContext ? placementFromContext.replace("-", " ") : undefined)
  return (
    <HeroDropdownPopover {...(props as Record<string, unknown>)} placement={normalized as "bottom"}>
      {children}
    </HeroDropdownPopover>
  )
}

type LegacyDropdownItemProps = {
  startContent?: ReactNode
  onPress?: () => void
  children?: ReactNode
  id?: string
  [key: string]: unknown
}

function DropdownItem({ startContent, children, onPress, id, ...props }: LegacyDropdownItemProps) {
  return (
    <HeroDropdownItem
      {...(props as Record<string, unknown>)}
      id={id}
      onAction={() => {
        onPress?.()
      }}
    >
      <span className="inline-flex items-center gap-2">
        {startContent}
        {children}
      </span>
    </HeroDropdownItem>
  )
}

type LegacyCheckboxProps = {
  onValueChange?: (checked: boolean) => void
  className?: string
  children?: ReactNode
  isSelected?: boolean
  size?: "sm" | "md" | "lg"
  classNames?: { base?: string; label?: string }
  [key: string]: unknown
}

function Checkbox({ onValueChange, classNames, className, children, ...props }: LegacyCheckboxProps) {
  return (
    <HeroCheckbox
      {...(props as Record<string, unknown>)}
      className={cx(classNames?.base, className)}
      onChange={(checked: unknown) => onValueChange?.(Boolean((checked as { target?: { checked?: boolean } })?.target?.checked ?? checked))}
    >
      <span className={classNames?.label}>{children}</span>
    </HeroCheckbox>
  )
}

const Divider = Separator

function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  if (typeof content !== "string") return <>{children}</>
  return <span title={content}>{children}</span>
}

type LegacyModalProps = {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl"
  scrollBehavior?: "inside" | "outside"
  backdrop?: string
  classNames?: {
    wrapper?: string
    backdrop?: string
    base?: string
  }
  children?: ReactNode
}

const mapModalSize = (size?: LegacyModalProps["size"]): "sm" | "md" | "lg" => {
  if (!size) return "lg"
  if (size === "sm" || size === "md" || size === "lg") return size
  return "lg"
}

const ModalContentContext = createContext<Record<string, never>>({})

function Modal({ isOpen = false, onOpenChange, size, scrollBehavior, backdrop, classNames, children }: LegacyModalProps) {
  const state = useOverlayState({ isOpen, onOpenChange })
  const backdropClass = backdrop === "blur" ? "bg-black/35 backdrop-blur-sm" : classNames?.backdrop
  return (
    <HeroModal state={state}>
      <HeroModal.Trigger className="hidden">
        <span />
      </HeroModal.Trigger>
      <HeroModal.Backdrop className={backdropClass}>
        <HeroModal.Container size={mapModalSize(size)} scroll={scrollBehavior === "inside" ? "inside" : "outside"} className={classNames?.wrapper}>
          <HeroModal.Dialog className={classNames?.base}>
            <ModalContentContext.Provider value={{}}>
              {children}
            </ModalContentContext.Provider>
          </HeroModal.Dialog>
        </HeroModal.Container>
      </HeroModal.Backdrop>
    </HeroModal>
  )
}

function ModalContent({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={className}>{children}</div>
}

function ModalHeader({ className, children }: { className?: string; children?: ReactNode }) {
  return <HeroModal.Header className={className}>{children}</HeroModal.Header>
}

function ModalBody({ className, children }: { className?: string; children?: ReactNode }) {
  return <HeroModal.Body className={className}>{children}</HeroModal.Body>
}

function ModalFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return <HeroModal.Footer className={className}>{children}</HeroModal.Footer>
}

type LegacyTabsClassNames = {
  base?: string
  tabList?: string
  tab?: string
  panel?: string
}

type LegacyTabsProps = {
  selectedKey?: React.Key
  onSelectionChange?: (key: React.Key) => void
  variant?: string
  color?: string
  classNames?: LegacyTabsClassNames
  children?: ReactNode
}

type LegacyTabProps = {
  title?: ReactNode
  children?: ReactNode
}

const Tab: React.FC<LegacyTabProps> = () => null

function Tabs({ selectedKey, onSelectionChange, classNames, children }: LegacyTabsProps) {
  const tabs = React.Children.toArray(children).reduce<Array<{ key: string; title: ReactNode; content: ReactNode }>>(
    (acc, child, index) => {
      if (!React.isValidElement<LegacyTabProps>(child)) return acc
      const keyValue = child.key ? String(child.key).replace(/^\.\$?/, "") : `tab-${index}`
      acc.push({
        key: keyValue,
        title: child.props.title ?? keyValue,
        content: child.props.children,
      })
      return acc
    },
    []
  )

  const activeKey = selectedKey ? String(selectedKey) : tabs[0]?.key

  return (
    <HeroTabs selectedKey={activeKey as string | undefined} onSelectionChange={onSelectionChange as ((key: React.Key) => void) | undefined} className={classNames?.base}>
      <HeroTabs.List className={classNames?.tabList}>
        {tabs.map((tab) => (
          <HeroTabs.Tab key={tab.key} id={tab.key} className={classNames?.tab}>
            {tab.title}
          </HeroTabs.Tab>
        ))}
      </HeroTabs.List>
      {tabs.map((tab) => (
        <HeroTabs.Panel key={`${tab.key}-panel`} id={tab.key} className={classNames?.panel}>
          {tab.content}
        </HeroTabs.Panel>
      ))}
    </HeroTabs>
  )
}

type LegacyAccordionItemClasses = {
  base?: string
  title?: string
  trigger?: string
  content?: string
}

const AccordionClassesContext = createContext<LegacyAccordionItemClasses | undefined>(undefined)

function Accordion({
  children,
  selectionMode,
  defaultExpandedKeys,
  className,
  itemClasses,
}: {
  children?: ReactNode
  selectionMode?: "single" | "multiple"
  defaultExpandedKeys?: Iterable<React.Key>
  className?: string
  itemClasses?: LegacyAccordionItemClasses
}) {
  return (
    <AccordionClassesContext.Provider value={itemClasses}>
      <HeroAccordion
        allowsMultipleExpanded={selectionMode === "multiple"}
        defaultExpandedKeys={defaultExpandedKeys as Iterable<string> | undefined}
        className={className}
      >
        {children}
      </HeroAccordion>
    </AccordionClassesContext.Provider>
  )
}

function AccordionItem({
  title,
  children,
  ...props
}: {
  title: ReactNode
  children?: ReactNode
  [key: string]: unknown
}) {
  const itemClasses = useContext(AccordionClassesContext)
  const defaultId = useMemo(
    () =>
      (typeof title === "string" ? title : "item")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    [title]
  )
  return (
    <HeroAccordion.Item id={(props["aria-label"] as string | undefined) || defaultId || "item"} className={itemClasses?.base}>
      <HeroAccordion.Heading>
        <HeroAccordion.Trigger className={cx("flex w-full items-center justify-between", itemClasses?.trigger)}>
          <span className={itemClasses?.title}>{title}</span>
          <HeroAccordion.Indicator />
        </HeroAccordion.Trigger>
      </HeroAccordion.Heading>
      <HeroAccordion.Panel>
        <HeroAccordion.Body className={itemClasses?.content}>{children}</HeroAccordion.Body>
      </HeroAccordion.Panel>
    </HeroAccordion.Item>
  )
}

type TableClassNames = {
  wrapper?: string
  table?: string
  th?: string
  td?: string
}

const TableStylesContext = createContext<TableClassNames | undefined>(undefined)

function Table({
  classNames,
  children,
  removeWrapper,
}: {
  classNames?: TableClassNames
  children?: ReactNode
  removeWrapper?: boolean
  [key: string]: unknown
}) {
  const table = <table className={cx("w-full text-left text-sm", classNames?.table)}>{children}</table>
  return (
    <TableStylesContext.Provider value={classNames}>
      {removeWrapper ? table : <div className={classNames?.wrapper}>{table}</div>}
    </TableStylesContext.Provider>
  )
}

function TableHeader({ children }: { children?: ReactNode }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  )
}

function TableColumn({ className, children }: { className?: string; children?: ReactNode }) {
  const classNames = useContext(TableStylesContext)
  return (
    <th scope="col" className={cx("px-3 py-2 font-semibold text-foreground/75", classNames?.th, className)}>
      {children}
    </th>
  )
}

function TableBody({
  children,
  isLoading,
  loadingContent,
  emptyContent,
}: {
  children?: ReactNode
  isLoading?: boolean
  loadingContent?: ReactNode
  emptyContent?: ReactNode
}) {
  const rows = React.Children.toArray(children)
  return (
    <tbody>
      {isLoading && rows.length === 0 ? (
        <tr>
          <td className="px-3 py-6 text-center text-foreground/70" colSpan={5}>
            {loadingContent || "Carregando..."}
          </td>
        </tr>
      ) : rows.length === 0 ? (
        <tr>
          <td className="px-3 py-6 text-center text-foreground/70" colSpan={5}>
            {emptyContent || "Sem dados"}
          </td>
        </tr>
      ) : (
        rows
      )}
    </tbody>
  )
}

function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cx("border-t border-border", className)} {...props}>
      {children}
    </tr>
  )
}

function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  const classNames = useContext(TableStylesContext)
  return (
    <td className={cx("px-3 py-2 align-middle", classNames?.td, className)} {...props}>
      {children}
    </td>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
  isLoading,
  prefix,
  decimals = 0,
}: {
  title: string
  value: number
  subtitle: string
  icon: ReactNode
  tone?: "default" | "success" | "primary"
  isLoading?: boolean
  prefix?: string
  decimals?: number
}) {
  const toneClasses =
    tone === "success"
      ? carteiraAccentClass
      : tone === "primary"
        ? "text-primary"
        : "text-foreground"
  const formattedPrefix = prefix ? prefix.replace(/\s+$/, "\u00A0") : undefined
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [decimals]
  )
  const valueClassName = prefix
    ? "text-[clamp(1.35rem,1.65vw,2.05rem)] leading-tight tracking-tight"
    : "text-3xl"

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="h-full"
    >
      <article className="flex h-full flex-col rounded-3xl border border-border bg-background p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
            <div className={`mt-2 font-extrabold tabular-nums ${valueClassName} ${toneClasses}`}>
              {isLoading ? (
                <span className="inline-block h-8 w-28 animate-pulse rounded-lg bg-muted" />
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
            <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
          </div>
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </article>
    </motion.div>
  )
}

function ClienteGridCard({
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
  const nome = credor.credor_nome || "Cliente"
  const cpf =
    credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith("SEM_CPF") ? credor.credor_cpf_cnpj : null
  const cidadeUf = credor.cidade ? `${credor.cidade}/${credor.uf || "--"}` : null
  const status = credor.ultimo_status
  const dt = credor.ultimo_precatorio_data
    ? new Date(credor.ultimo_precatorio_data).toLocaleDateString("pt-BR")
    : null
  const carteira = Number(credor.valor_total_atualizado || credor.valor_total_principal || 0)
  const ultimo = Number(credor.ultimo_precatorio_valor || 0)

  const avatarColors = [
    "bg-gradient-to-br from-orange-200 to-orange-100 text-orange-700",
    "bg-gradient-to-br from-blue-200 to-blue-100 text-blue-700",
    "bg-gradient-to-br from-emerald-200 to-emerald-100 text-emerald-700",
    "bg-gradient-to-br from-violet-200 to-violet-100 text-violet-700",
  ]
  const avatarColor = avatarColors[nome.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 4]
  const initials = nome.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"

  const statusBadgeClass = cx(
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
    statusClass(status),
  )

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
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
        className="flex flex-col gap-4 rounded-3xl border border-border bg-background p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {/* Header: avatar + nome + menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cx("grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-sm font-bold", avatarColor)}>
              {initials}
            </div>
            <div className="min-w-0">
              <p title={nome} className="truncate text-sm font-semibold leading-5 text-foreground">{nome}</p>
              <p className="truncate text-xs text-muted-foreground">{cpf ?? "CPF/CNPJ não informado"}</p>
            </div>
          </div>
          <div
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            className="flex-shrink-0"
          >
            <Dropdown>
              <DropdownTrigger>
                <button
                  aria-label={`Ações de ${nome}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownTrigger>
              <DropdownPopover placement="bottom end">
                <DropdownMenu
                  aria-label={`Ações para ${nome}`}
                  onAction={(key) => {
                    if (String(key) === "detalhes") onOpen()
                  }}
                >
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

        {/* Localização + data */}
        {(cidadeUf || dt) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {cidadeUf && <span>{cidadeUf}</span>}
            {dt && <span>Últ. mov.: {dt}</span>}
          </div>
        )}

        {/* Status + contagem */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusBadgeClass}>{formatStatus(status)}</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {credor.total_precatorios ?? 0} proc.
          </span>
        </div>

        {/* Carteira */}
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Carteira atualizada</div>
          <div className={cx("mt-1 truncate text-lg font-extrabold tabular-nums", carteiraAccentClass)}>
            {carteira ? `R$ ${formatCurrency(carteira)}` : "R$ 0,00"}
          </div>
          {ultimo > 0 && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              Último: R$ {formatCurrency(ultimo)}
            </div>
          )}
        </div>

        {/* Contato */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {credor.telefone || credor.email ? (
            <>
              {credor.telefone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{credor.telefone}</span>
                </div>
              )}
              {credor.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="break-all">{credor.email}</span>
                </div>
              )}
            </>
          ) : (
            <span>Sem contato cadastrado</span>
          )}
        </div>

        {/* Rodapé */}
        <div className="mt-auto border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            Abrir detalhes
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    </motion.div>
  )
}

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeCredorResumo = (item: Partial<CredorResumo>): CredorResumo => ({
  id_unico: String(item.id_unico || ""),
  credor_nome: item.credor_nome || "Credor sem nome",
  credor_cpf_cnpj: item.credor_cpf_cnpj || null,
  cidade: item.cidade || null,
  uf: item.uf || null,
  telefone: item.telefone || null,
  email: item.email || null,
  total_precatorios: Math.trunc(toNumber(item.total_precatorios)),
  valor_total_principal: toNumber(item.valor_total_principal),
  valor_total_atualizado: toNumber(item.valor_total_atualizado),
  ultimo_precatorio_data: item.ultimo_precatorio_data || null,
  ultimo_status: item.ultimo_status || null,
  ultimo_precatorio_valor: toNumber(item.ultimo_precatorio_valor),
})

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const parseDateStart = (value?: string) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const parseDateEnd = (value?: string) => {
  if (!value) return null
  const parsed = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatStatusLabel = (value?: string | null) => {
  if (!value) return "N/I"
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const normalizeAdminFilters = (filters: ClientesAdminFilters): ClientesAdminFilters => {
  const next: ClientesAdminFilters = { ...filters }
  next.cidade = next.cidade?.trim() || undefined
  next.uf = next.uf?.trim().toUpperCase() || undefined
  next.status = next.status?.filter(Boolean) || undefined

  const normalizeNumber = (value?: number) =>
    value === undefined || value === null || Number.isNaN(Number(value)) ? undefined : Number(value)

  next.carteiraMin = normalizeNumber(next.carteiraMin)
  next.carteiraMax = normalizeNumber(next.carteiraMax)
  next.qtdMin = normalizeNumber(next.qtdMin)
  next.qtdMax = normalizeNumber(next.qtdMax)

  if (
    next.carteiraMin !== undefined &&
    next.carteiraMax !== undefined &&
    next.carteiraMin > next.carteiraMax
  ) {
    const temp = next.carteiraMin
    next.carteiraMin = next.carteiraMax
    next.carteiraMax = temp
  }

  if (next.qtdMin !== undefined && next.qtdMax !== undefined && next.qtdMin > next.qtdMax) {
    const temp = next.qtdMin
    next.qtdMin = next.qtdMax
    next.qtdMax = temp
  }

  const start = parseDateStart(next.ultimaMovInicio)
  const end = parseDateEnd(next.ultimaMovFim)
  if (start && end && start > end) {
    const temp = next.ultimaMovInicio
    next.ultimaMovInicio = next.ultimaMovFim
    next.ultimaMovFim = temp
  }

  next.apenasComContato = next.apenasComContato ? true : undefined

  return next
}

const matchesClientesAdvancedFilters = (credor: CredorResumo, filters: ClientesAdminFilters) => {
  if (filters.status && filters.status.length > 0) {
    const statusAtual = credor.ultimo_status || ""
    if (!filters.status.includes(statusAtual)) return false
  }

  if (filters.cidade) {
    const cidade = normalizeText(credor.cidade)
    if (!cidade.includes(normalizeText(filters.cidade))) return false
  }

  if (filters.uf) {
    if ((credor.uf || "").toUpperCase() !== filters.uf.toUpperCase()) return false
  }

  const carteira = Number(credor.valor_total_atualizado || credor.valor_total_principal || 0)
  if (filters.carteiraMin !== undefined && carteira < filters.carteiraMin) return false
  if (filters.carteiraMax !== undefined && carteira > filters.carteiraMax) return false

  const quantidade = Number(credor.total_precatorios || 0)
  if (filters.qtdMin !== undefined && quantidade < filters.qtdMin) return false
  if (filters.qtdMax !== undefined && quantidade > filters.qtdMax) return false

  if (filters.apenasComContato) {
    const hasContato = Boolean((credor.telefone || "").trim() || (credor.email || "").trim())
    if (!hasContato) return false
  }

  if (filters.ultimaMovInicio || filters.ultimaMovFim) {
    const ultimaMov = credor.ultimo_precatorio_data ? new Date(credor.ultimo_precatorio_data) : null
    if (!ultimaMov || Number.isNaN(ultimaMov.getTime())) return false

    const inicio = parseDateStart(filters.ultimaMovInicio)
    const fim = parseDateEnd(filters.ultimaMovFim)
    if (inicio && ultimaMov < inicio) return false
    if (fim && ultimaMov > fim) return false
  }

  return true
}

const getAdminFilterChips = (filters: ClientesAdminFilters): ClienteFilterChip[] => {
  const chips: ClienteFilterChip[] = []

  if (filters.status && filters.status.length > 0) {
    chips.push({
      key: "status",
      label: "Status",
      value: filters.status.map((status) => formatStatusLabel(status)).join(", "),
    })
  }

  if (filters.cidade) {
    chips.push({ key: "cidade", label: "Cidade", value: filters.cidade })
  }

  if (filters.uf) {
    chips.push({ key: "uf", label: "UF", value: filters.uf })
  }

  if (filters.carteiraMin !== undefined || filters.carteiraMax !== undefined) {
    chips.push({
      key: "carteira",
      label: "Carteira",
      value: `${filters.carteiraMin !== undefined ? `R$ ${filters.carteiraMin.toLocaleString("pt-BR")}` : "..."} até ${filters.carteiraMax !== undefined ? `R$ ${filters.carteiraMax.toLocaleString("pt-BR")}` : "..."
        }`,
    })
  }

  if (filters.qtdMin !== undefined || filters.qtdMax !== undefined) {
    chips.push({
      key: "qtd",
      label: "Qtd. Precatórios",
      value: `${filters.qtdMin ?? "..."} até ${filters.qtdMax ?? "..."}`,
    })
  }

  if (filters.ultimaMovInicio || filters.ultimaMovFim) {
    chips.push({
      key: "ultimaMov",
      label: "Ultima mov.",
      value: `${filters.ultimaMovInicio ? new Date(`${filters.ultimaMovInicio}T00:00:00`).toLocaleDateString("pt-BR") : "..."} até ${filters.ultimaMovFim ? new Date(`${filters.ultimaMovFim}T00:00:00`).toLocaleDateString("pt-BR") : "..."
        }`,
    })
  }

  if (filters.apenasComContato) {
    chips.push({
      key: "apenasComContato",
      label: "Contato",
      value: "Somente com contato",
    })
  }

  return chips
}

const firstMeaningfulValue = (
  values: Array<string | null | undefined>,
  validate?: (value: string) => boolean
) => {
  for (const raw of values) {
    const value = (raw || "").trim()
    if (!value) continue
    if (validate && !validate(value)) continue
    return value
  }
  return undefined
}

const extractCredorDataFromPrecatorios = (items: Precatorio[]): Partial<CredorResumo> => ({
  credor_nome: firstMeaningfulValue(items.map((item) => item.credor_nome), (value) => !/^credor sem nome$/i.test(value)),
  credor_cpf_cnpj: firstMeaningfulValue(
    items.map((item) => item.credor_cpf_cnpj),
    (value) => !value.startsWith("SEM_CPF")
  ),
  telefone: firstMeaningfulValue(items.map((item) => item.credor_telefone)),
  email: firstMeaningfulValue(items.map((item) => item.credor_email)),
  cidade: firstMeaningfulValue(items.map((item) => item.credor_cidade)),
  uf: firstMeaningfulValue(items.map((item) => (item.credor_uf || "").toUpperCase())),
})

const CREDOR_IMPORT_FIELDS = ["credor_nome", "credor_cpf_cnpj", "telefone", "email", "cidade", "uf"] as const

const mergeCredorFormWithImportedData = (
  current: Partial<CredorResumo>,
  imported: Partial<CredorResumo>,
  overwrite: boolean
) => {
  const next: Partial<CredorResumo> = { ...current }
  let updatedCount = 0

  for (const field of CREDOR_IMPORT_FIELDS) {
    const importedValue = ((imported[field] as string | null | undefined) || "").trim()
    if (!importedValue) continue

    const currentValue = ((next[field] as string | null | undefined) || "").trim()
    if (!overwrite && currentValue) continue
    if (currentValue === importedValue) continue

      ; (next as Record<string, string | undefined>)[field] = importedValue
    updatedCount += 1
  }

  return { next, updatedCount }
}

export default function ClientsPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [credores, setCredores] = useState<CredorResumo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)

  // role pode vir como string ou array (evita includes quebrar)
  const roles = useMemo(() => {
    const r = profile?.role as string | string[] | undefined
    return Array.isArray(r) ? r : r ? [r] : []
  }, [profile?.role])

  const isAdmin = roles.includes("admin")

  // Modal states
  const [selectedCredor, setSelectedCredor] = useState<CredorResumo | null>(null)
  const [credorForm, setCredorForm] = useState<Partial<CredorResumo>>({})
  const [credorPrecatorios, setCredorPrecatorios] = useState<Precatorio[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCredor, setEditingCredor] = useState(false)
  const [detailsTab, setDetailsTab] = useState<"dados" | "processos" | "historico">("dados")
  const [savingCredor, setSavingCredor] = useState(false)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [adminFilters, setAdminFilters] = useState<ClientesAdminFilters>({})
  const [adminFiltersDraft, setAdminFiltersDraft] = useState<ClientesAdminFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(24)

  const makeCredorForm = (credor: CredorResumo | null): Partial<CredorResumo> => ({
    credor_nome: credor?.credor_nome || "",
    credor_cpf_cnpj: credor?.credor_cpf_cnpj || "",
    telefone: credor?.telefone || "",
    email: credor?.email || "",
    cidade: credor?.cidade || "",
    uf: credor?.uf || "",
  })

  const startCredorEditing = () => {
    setEditingCredor(true)
  }

  const cancelCredorEditing = () => {
    setEditingCredor(false)
    setCredorForm(makeCredorForm(selectedCredor))
  }

  useEffect(() => {
    if (!isAdmin) {
      setAdminFilters({})
      setAdminFiltersDraft({})
    }
  }, [isAdmin])

  useEffect(() => {
    if (!advancedFiltersOpen) return
    setAdminFiltersDraft(adminFilters)
  }, [advancedFiltersOpen, adminFilters])

  useEffect(() => {
    if (!profile?.id) return
    loadCredores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isAdmin])

  function aggregateCredores(items: PrecatorioResumo[]): CredorResumo[] {
    const map = new Map<string, CredorResumo>()

    items.forEach((precatorio) => {
      const cpf = precatorio.credor_cpf_cnpj?.trim() || null
      const nome = (precatorio.credor_nome || "Credor sem nome").trim()
      const cidade = precatorio.credor_cidade || null
      const uf = precatorio.credor_uf || null
      const telefone = precatorio.credor_telefone || null
      const email = precatorio.credor_email || null

      const key =
        cpf && !cpf.startsWith("SEM_CPF") ? `cpf:${cpf}` : `nome:${nome}|${cidade || ""}|${uf || ""}`

      const valorPrincipal = Number(precatorio.valor_principal || 0)
      const valorAtualizado = Number(precatorio.valor_atualizado || precatorio.valor_principal || 0)
      const dataUltimo = precatorio.updated_at || precatorio.created_at || null
      const statusAtual = precatorio.status_kanban || precatorio.localizacao_kanban || precatorio.status || null

      if (!map.has(key)) {
        map.set(key, {
          id_unico: key,
          credor_nome: nome,
          credor_cpf_cnpj: cpf,
          cidade,
          uf,
          telefone,
          email,
          total_precatorios: 0,
          valor_total_principal: 0,
          valor_total_atualizado: 0,
          ultimo_precatorio_data: null,
          ultimo_status: null,
          ultimo_precatorio_valor: 0,
        })
      }

      const entry = map.get(key)!
      entry.total_precatorios += 1
      entry.valor_total_principal += valorPrincipal
      entry.valor_total_atualizado += valorAtualizado

      if (!entry.telefone && telefone) entry.telefone = telefone
      if (!entry.email && email) entry.email = email
      if (!entry.cidade && cidade) entry.cidade = cidade
      if (!entry.uf && uf) entry.uf = uf

      if (!entry.ultimo_precatorio_data || (dataUltimo && new Date(dataUltimo) > new Date(entry.ultimo_precatorio_data))) {
        entry.ultimo_precatorio_data = dataUltimo
        entry.ultimo_precatorio_valor = valorAtualizado
        entry.ultimo_status = statusAtual
      }
    })

    return Array.from(map.values()).sort((a, b) => b.valor_total_atualizado - a.valor_total_atualizado)
  }

  async function loadCredores() {
    setLoading(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc("listar_clientes_resumo")

      if (!rpcError && Array.isArray(rpcData)) {
        setCredores((rpcData as Partial<CredorResumo>[]).map(normalizeCredorResumo))
        return
      }

      if (rpcError) {
        console.warn("RPC listar_clientes_resumo indisponivel, usando fallback local.", rpcError.message)
      }

      let fallbackQuery = supabase
        .from("precatorios")
        .select(
          "id, credor_nome, credor_cpf_cnpj, credor_cidade, credor_uf, credor_telefone, credor_email, valor_principal, valor_atualizado, status, status_kanban, localizacao_kanban, created_at, updated_at, dono_usuario_id, responsavel"
        )
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })

      if (!isAdmin && profile?.id) {
        fallbackQuery = fallbackQuery.or(`dono_usuario_id.eq.${profile.id},responsavel.eq.${profile.id}`)
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery

      if (fallbackError) {
        console.error("Erro ao carregar credores:", fallbackError)
        setCredores([])
        return
      }

      setCredores(aggregateCredores((fallbackData || []) as PrecatorioResumo[]))
    } catch (error) {
      console.error("Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  async function openCredorDetails(credor: CredorResumo) {
    setSelectedCredor(credor)
    setCredorForm(makeCredorForm(credor))
    setEditingCredor(false)
    setDetailsTab("dados")
    setModalOpen(true)
    setLoadingDetails(true)

    try {
      const supabase = getSupabase()
      if (!supabase) {
        setLoadingDetails(false)
        return
      }

      let query = supabase
        .from("precatorios")
        .select(
          "id, numero_processo, numero_precatorio, status, status_kanban, localizacao_kanban, valor_principal, valor_atualizado, created_at, updated_at, credor_nome, credor_cpf_cnpj, credor_telefone, credor_email, credor_cidade, credor_uf, dono_usuario_id, responsavel"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (!isAdmin && profile?.id) {
        query = query.or(`dono_usuario_id.eq.${profile.id},responsavel.eq.${profile.id}`)
      }

      if (credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith("SEM_CPF")) {
        query = query.eq("credor_cpf_cnpj", credor.credor_cpf_cnpj)
      } else {
        query = query.eq("credor_nome", credor.credor_nome)
      }

      const { data, error } = await query
      if (error) throw error

      const fetchedPrecatorios = (data || []) as unknown as Precatorio[]
      setCredorPrecatorios(fetchedPrecatorios)

      if (fetchedPrecatorios.length > 0) {
        const importedData = extractCredorDataFromPrecatorios(fetchedPrecatorios)
        setCredorForm((prev) => mergeCredorFormWithImportedData(prev, importedData, false).next)
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const importCredorDataFromPrecatorios = (overwrite = true) => {
    if (loadingDetails) {
      toast.info("Aguarde o carregamento dos processos para importar dados.")
      return
    }

    if (credorPrecatorios.length === 0) {
      toast.info("Nenhum precatorio vinculado para importar dados.")
      return
    }

    const importedData = extractCredorDataFromPrecatorios(credorPrecatorios)
    const { next, updatedCount } = mergeCredorFormWithImportedData(credorForm, importedData, overwrite)

    if (updatedCount === 0) {
      toast.info("Nao ha novos dados para importar.")
      return
    }

    setCredorForm(next)
    toast.success(`Dados importados com sucesso (${updatedCount} campo(s)).`)
  }

  async function handleSaveCredor() {
    if (!selectedCredor) return
    const nome = (credorForm.credor_nome || "").trim()
    if (!nome) {
      toast.error("Informe o nome do cliente.")
      return
    }

    const payload = {
      credor_nome: nome,
      credor_cpf_cnpj: credorForm.credor_cpf_cnpj || null,
      credor_telefone: credorForm.telefone || null,
      credor_email: credorForm.email || null,
      credor_cidade: credorForm.cidade || null,
      credor_uf: credorForm.uf || null,
      updated_at: new Date().toISOString(),
    }

    setSavingCredor(true)
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const relatedIds = credorPrecatorios.map((item) => item.id).filter(Boolean)
      let query = supabase.from("precatorios").update(payload)

      if (relatedIds.length > 0) {
        query = query.in("id", relatedIds)
      } else if (selectedCredor.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")) {
        query = query.eq("credor_cpf_cnpj", selectedCredor.credor_cpf_cnpj)
      } else {
        query = query.eq("credor_nome", selectedCredor.credor_nome)
        if (selectedCredor.cidade) query = query.eq("credor_cidade", selectedCredor.cidade)
        if (selectedCredor.uf) query = query.eq("credor_uf", selectedCredor.uf)
      }

      const { error } = await query
      if (error) throw error

      toast.success("Dados do cliente atualizados.")
      setEditingCredor(false)
      await loadCredores()

      const updatedCredor: CredorResumo = {
        ...selectedCredor,
        credor_nome: payload.credor_nome,
        credor_cpf_cnpj: payload.credor_cpf_cnpj,
        telefone: payload.credor_telefone,
        email: payload.credor_email,
        cidade: payload.credor_cidade,
        uf: payload.credor_uf,
      }
      await openCredorDetails(updatedCredor)
    } catch (error: unknown) {
      console.error("Erro ao atualizar cliente:", error)
      const message = error instanceof Error ? error.message : "Erro ao atualizar cliente."
      toast.error(message)
    } finally {
      setSavingCredor(false)
    }
  }

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(credores.map((credor) => credor.ultimo_status).filter(Boolean) as string[])).sort((a, b) =>
        formatStatusLabel(a).localeCompare(formatStatusLabel(b), "pt-BR")
      ),
    [credores]
  )

  const ufOptions = useMemo(
    () =>
      Array.from(new Set(credores.map((credor) => (credor.uf || "").toUpperCase()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [credores]
  )

  const searchedCredores = useMemo(() => {
    const term = normalizeText(deferredSearchTerm)
    if (!term) return credores

    return credores.filter((credor) => {
      const matchesNome = normalizeText(credor.credor_nome).includes(term)
      const matchesCpf = (credor.credor_cpf_cnpj || "").includes(deferredSearchTerm.trim())
      const matchesCidade = normalizeText(credor.cidade).includes(term)
      const matchesStatus = normalizeText(credor.ultimo_status).includes(term)
      const matchesEmail = normalizeText(credor.email).includes(term)
      const matchesTelefone = normalizeText(credor.telefone).includes(term)
      return matchesNome || matchesCpf || matchesCidade || matchesStatus || matchesEmail || matchesTelefone
    })
  }, [credores, deferredSearchTerm])

  const filteredCredores = useMemo(
    () =>
      isAdmin ? searchedCredores.filter((credor) => matchesClientesAdvancedFilters(credor, adminFilters)) : searchedCredores,
    [isAdmin, searchedCredores, adminFilters]
  )

  const adminFilterChips = useMemo(() => getAdminFilterChips(adminFilters), [adminFilters])
  const totalAdminFilters = adminFilterChips.length

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredCredores.length / pageSize)), [filteredCredores.length, pageSize])

  const paginatedCredores = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCredores.slice(start, start + pageSize)
  }, [filteredCredores, currentPage, pageSize])

  const rangeStart = filteredCredores.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, filteredCredores.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearchTerm, adminFilters, isAdmin])

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const updateDraftNumberFilter = (key: keyof ClientesAdminFilters, rawValue: string) => {
    const normalized = rawValue.replace(",", ".")
    const parsed = Number(normalized)
    setAdminFiltersDraft((prev) => ({
      ...prev,
      [key]: rawValue === "" || Number.isNaN(parsed) ? undefined : parsed,
    }))
  }

  const toggleDraftStatus = (status: string) => {
    setAdminFiltersDraft((prev) => {
      const current = prev.status || []
      const nextStatus = current.includes(status) ? current.filter((item) => item !== status) : [...current, status]
      return {
        ...prev,
        status: nextStatus.length > 0 ? nextStatus : undefined,
      }
    })
  }

  const applyAdminFilters = () => {
    setAdminFilters(normalizeAdminFilters(adminFiltersDraft))
    setAdvancedFiltersOpen(false)
  }

  const clearAdminFilters = () => {
    setAdminFilters({})
    setAdminFiltersDraft({})
    setAdvancedFiltersOpen(false)
  }

  const removeAdminFilter = (key: string) => {
    setAdminFilters((prev) => {
      const next = { ...prev }
      switch (key) {
        case "status":
          delete next.status
          break
        case "cidade":
          delete next.cidade
          break
        case "uf":
          delete next.uf
          break
        case "carteira":
          delete next.carteiraMin
          delete next.carteiraMax
          break
        case "qtd":
          delete next.qtdMin
          delete next.qtdMax
          break
        case "ultimaMov":
          delete next.ultimaMovInicio
          delete next.ultimaMovFim
          break
        case "apenasComContato":
          delete next.apenasComContato
          break
        default:
          break
      }
      return normalizeAdminFilters(next)
    })
  }

  const resumo = useMemo(() => {
    let totalCarteira = 0
    let totalPrecatorios = 0
    let ultimaAtualizacao: string | null = null

    credores.forEach((credor) => {
      totalCarteira += credor.valor_total_atualizado || credor.valor_total_principal || 0
      totalPrecatorios += credor.total_precatorios || 0
      if (credor.ultimo_precatorio_data) {
        if (!ultimaAtualizacao || new Date(credor.ultimo_precatorio_data) > new Date(ultimaAtualizacao)) {
          ultimaAtualizacao = credor.ultimo_precatorio_data
        }
      }
    })

    return { totalCarteira, totalPrecatorios, ultimaAtualizacao }
  }, [credores])

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })

  const formatStatus = formatStatusLabel

  const statusClass = (value?: string | null) => {
    switch (value) {
      case "proposta_negociacao":
        return "bg-primary/15 text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40"
      case "proposta_aceita":
        return "bg-primary/15 text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40"
      case "calculo_andamento":
      case "em_calculo":
        return "bg-primary/15 text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40"
      case "analise_processual_inicial":
        return "bg-primary/15 text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40"
      default:
        return "bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border"
    }
  }

  const clientesComContato = useMemo(
    () => credores.filter((credor) => Boolean((credor.telefone || "").trim() || (credor.email || "").trim())).length,
    [credores]
  )

  const clientesSemContato = Math.max(credores.length - clientesComContato, 0)

  const clientesComStatus = useMemo(() => credores.filter((credor) => Boolean(credor.ultimo_status)).length, [credores])

  const carteiraMedia = credores.length > 0 ? resumo.totalCarteira / credores.length : 0

  const ultimaAtualizacaoLabel = resumo.ultimaAtualizacao
    ? new Date(resumo.ultimaAtualizacao).toLocaleDateString("pt-BR")
    : "Sem movimentacao recente"

  return (
    <div className="clients-revamp relative w-full max-w-[100vw] px-4 py-6 lg:px-6">
      <div className="space-y-6">
        <section className="rounded-3xl border border-border bg-background shadow-sm">
          <div className="flex flex-col gap-5 p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Clientes</h1>
                    <span className="text-xs uppercase tracking-[0.16em] text-foreground/60">CRM operacional</span>
                  </div>
                </div>
                <p className="text-sm text-foreground/70">Gerencie clientes, contatos e historico de processos de ponta a ponta.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {credores.length} clientes
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {resumo.totalPrecatorios} processos
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Atualizado em {ultimaAtualizacaoLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!searchTerm}
                  onClick={() => setSearchTerm("")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-muted px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                  Limpar busca
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => loadCredores()}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
                >
                  <RefreshCw className={cx("h-4 w-4", loading ? "animate-spin" : "")} />
                  Atualizar
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setAdvancedFiltersOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    <Filter className="h-4 w-4" />
                    {totalAdminFilters > 0 ? `Filtros (${totalAdminFilters})` : "Filtros avancados"}
                  </button>
                ) : null}
              </div>
            </div>

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
              <KpiCard
                title="Clientes com contato"
                value={clientesComContato}
                subtitle={`${clientesSemContato} sem telefone/e-mail`}
                icon={<Users className="h-5 w-5" />}
                tone="default"
                isLoading={loading}
              />
              <KpiCard
                title="Clientes com status"
                value={clientesComStatus}
                subtitle={`${statusOptions.length} status distintos`}
                icon={<Clock className="h-5 w-5" />}
                tone="default"
                isLoading={loading}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-background shadow-sm">
          <div className="space-y-4 p-5 lg:p-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-2xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  aria-label="Buscar clientes"
                  placeholder="Buscar por nome, CPF/CNPJ, cidade, status, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpar"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {filteredCredores.length} exibidos
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {resumo.totalPrecatorios} processos
                </span>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setAdvancedFiltersOpen(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    <Filter className="h-4 w-4" />
                    Filtros avancados
                  </button>
                ) : null}
              </div>
            </div>

            {isAdmin && adminFilterChips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros ativos:</span>
                {adminFilterChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    <span className="font-semibold">{chip.label}:</span>
                    <span className="truncate">{chip.value}</span>
                    <button
                      type="button"
                      onClick={() => removeAdminFilter(chip.key)}
                      aria-label={`Remover filtro ${chip.label}`}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAdminFilters}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Limpar tudo
                </button>
              </div>
            ) : null}

            <div className="border-t border-border" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <div key={`cliente-skeleton-${idx}`} className="w-full rounded-3xl border border-border bg-background p-5 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-4 w-3/4 rounded-lg bg-muted animate-pulse" />
                          <div className="h-3 w-1/2 rounded-lg bg-muted animate-pulse" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                        <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
                      </div>
                      <div className="h-16 w-full rounded-2xl bg-muted animate-pulse" />
                    </div>
                  </div>
                ))
              ) : filteredCredores.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-border bg-background shadow-sm sm:col-span-2 xl:col-span-3 2xl:col-span-4">
                  <p className="font-medium text-foreground">Nenhum cliente encontrado</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajuste a busca ou remova filtros para visualizar resultados.
                  </p>
                </div>
              ) : (
                paginatedCredores.map((credor) => (
                  <ClienteGridCard
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
            {!loading && filteredCredores.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Exibindo {rangeStart}-{rangeEnd} de {filteredCredores.length} clientes
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="h-8 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="min-w-[120px] text-center text-xs font-medium text-muted-foreground">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="h-8 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  >
                    Proxima
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
      {isAdmin ? (
        <Modal
          isOpen={advancedFiltersOpen}
          onOpenChange={setAdvancedFiltersOpen}
          size="5xl"
          scrollBehavior="inside"
          backdrop="opaque"
          classNames={{
            wrapper: modalWrapper,
            backdrop: modalBackdrop,
            base: modalBase,
          }}
        >
          <ModalContent className={modalContentBase}>
            <>
              <ModalHeader className="shrink-0 flex flex-col gap-1 border-b border-border dark:border-border px-6 pb-4 pt-5">
                <h2 className="text-xl font-semibold tracking-tight">Filtros avancados de clientes</h2>
                <p className="text-sm text-foreground/70">
                  Refine a lista por status, periodo, faixa de carteira e contato.
                </p>
              </ModalHeader>

              <ModalBody className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-4">
                <Accordion
                  selectionMode="multiple"
                  defaultExpandedKeys={["status", "periodo", "financeiro", "outros"]}
                  className="gap-3"
                  itemClasses={{
                    base:
                      "rounded-2xl border border-border dark:border-border " +
                      "bg-background",
                    title: "text-base font-semibold text-left",
                    trigger: "py-3 px-3",
                    content: "px-3 pb-4 pt-1",
                  }}
                >
                  <AccordionItem key="status" aria-label="Status e segmento" title="Status e segmento">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Status atual</p>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() =>
                                setAdminFiltersDraft((prev) => ({
                                  ...prev,
                                  status: statusOptions.length ? [...statusOptions] : undefined,
                                }))
                              }
                              isDisabled={statusOptions.length === 0}
                            >
                              Marcar todos
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() =>
                                setAdminFiltersDraft((prev) => ({
                                  ...prev,
                                  status: undefined,
                                }))
                              }
                              isDisabled={!adminFiltersDraft.status?.length}
                            >
                              Limpar
                            </Button>
                            <Chip size="sm" variant="flat" color="primary">
                              {adminFiltersDraft.status?.length ?? 0} selecionados
                            </Chip>
                          </div>
                        </div>

                        {statusOptions.length === 0 ? (
                          <p className="text-sm text-foreground/60">Sem status disponiveis.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {statusOptions.map((status) => {
                              const selected = adminFiltersDraft.status?.includes(status) || false
                              return (
                                <Button
                                  key={status}
                                  size="sm"
                                  radius="lg"
                                  variant={selected ? "flat" : "bordered"}
                                  color={selected ? "primary" : "default"}
                                  className={[
                                    "w-full justify-between border-border",
                                    "bg-muted/50 hover:bg-muted/70",
                                    "transition",
                                    selected ? "border-primary/40" : "",
                                  ].join(" ")}
                                  onPress={() => toggleDraftStatus(status)}
                                  endContent={
                                    <span
                                      className={[
                                        "h-2.5 w-2.5 rounded-full",
                                        selected ? "bg-primary" : "bg-default-300 dark:bg-default-200/40",
                                      ].join(" ")}
                                    />
                                  }
                                >
                                  <span className="truncate">{formatStatus(status)}</span>
                                </Button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold tracking-wide text-foreground/70">Cidade</p>
                          <Input
                            aria-label="Cidade"
                            placeholder="Ex.: Curitiba"
                            variant="bordered"
                            size="sm"
                            classNames={{
                              inputWrapper:
                                "h-11 min-h-11 rounded-xl border border-border " +
                                "bg-muted/50 hover:bg-muted/70 transition",
                              input: "text-sm text-foreground",
                            }}
                            value={adminFiltersDraft.cidade || ""}
                            onValueChange={(value) =>
                              setAdminFiltersDraft((prev) => ({
                                ...prev,
                                cidade: value || undefined,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-semibold tracking-wide text-foreground/70">UF</p>
                          <Input
                            aria-label="UF"
                            placeholder="Ex.: PR"
                            maxLength={2}
                            variant="bordered"
                            size="sm"
                            classNames={{
                              inputWrapper:
                                "h-11 min-h-11 rounded-xl border border-border " +
                                "bg-muted/50 hover:bg-muted/70 transition",
                              input: "text-sm text-foreground",
                            }}
                            value={adminFiltersDraft.uf || ""}
                            onValueChange={(value) =>
                              setAdminFiltersDraft((prev) => ({
                                ...prev,
                                uf: value.toUpperCase() || undefined,
                              }))
                            }
                          />
                        </div>
                      </div>

                      {ufOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {ufOptions.map((uf) => {
                            const isSelected = adminFiltersDraft.uf === uf
                            return (
                              <Button
                                key={uf}
                                size="sm"
                                radius="full"
                                variant={isSelected ? "flat" : "bordered"}
                                color={isSelected ? "primary" : "default"}
                                className={[
                                  "min-w-[48px] border-border",
                                  "bg-muted/30 hover:bg-muted/60 transition",
                                  isSelected ? "border-primary/40" : "",
                                ].join(" ")}
                                onPress={() =>
                                  setAdminFiltersDraft((prev) => ({
                                    ...prev,
                                    uf: prev.uf === uf ? undefined : uf,
                                  }))
                                }
                              >
                                {uf}
                              </Button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </AccordionItem>

                  <AccordionItem key="periodo" aria-label="Periodo e datas" title="Periodo e datas">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-foreground/70">Ultima movimentacao (de)</p>
                        <Input
                          aria-label="Ultima movimentacao (de)"
                          type="date"
                          variant="bordered"
                          size="sm"
                          classNames={{
                            inputWrapper:
                              "h-11 min-h-11 rounded-xl border border-border " +
                              "bg-muted/50 hover:bg-muted/70 transition",
                            input: "text-sm text-foreground",
                          }}
                          value={adminFiltersDraft.ultimaMovInicio || ""}
                          onChange={(event) =>
                            setAdminFiltersDraft((prev) => ({
                              ...prev,
                              ultimaMovInicio: event.target.value || undefined,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-foreground/70">Ultima movimentacao (ate)</p>
                        <Input
                          aria-label="Ultima movimentacao (ate)"
                          type="date"
                          variant="bordered"
                          size="sm"
                          classNames={{
                            inputWrapper:
                              "h-11 min-h-11 rounded-xl border border-border " +
                              "bg-muted/50 hover:bg-muted/70 transition",
                            input: "text-sm text-foreground",
                          }}
                          value={adminFiltersDraft.ultimaMovFim || ""}
                          onChange={(event) =>
                            setAdminFiltersDraft((prev) => ({
                              ...prev,
                              ultimaMovFim: event.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem key="financeiro" aria-label="Financeiro" title="Financeiro">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-foreground/70">Carteira minima</p>
                        <Input
                          aria-label="Carteira minima"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          variant="bordered"
                          size="sm"
                          classNames={{
                            inputWrapper:
                              "h-11 min-h-11 rounded-xl border border-border " +
                              "bg-muted/50 hover:bg-muted/70 transition",
                            input: "text-sm text-foreground",
                          }}
                          value={adminFiltersDraft.carteiraMin?.toString() ?? ""}
                          onValueChange={(value) => updateDraftNumberFilter("carteiraMin", value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-foreground/70">Carteira maxima</p>
                        <Input
                          aria-label="Carteira maxima"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="9999999,99"
                          variant="bordered"
                          size="sm"
                          classNames={{
                            inputWrapper:
                              "h-11 min-h-11 rounded-xl border border-border " +
                              "bg-muted/50 hover:bg-muted/70 transition",
                            input: "text-sm text-foreground",
                          }}
                          value={adminFiltersDraft.carteiraMax?.toString() ?? ""}
                          onValueChange={(value) => updateDraftNumberFilter("carteiraMax", value)}
                        />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem key="outros" aria-label="Outros filtros" title="Outros">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold tracking-wide text-foreground/70">Qtd. minima de precatorios</p>
                          <Input
                            aria-label="Qtd. minima de precatorios"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            variant="bordered"
                            size="sm"
                            classNames={{
                              inputWrapper:
                                "h-11 min-h-11 rounded-xl border border-border " +
                                "bg-muted/50 hover:bg-muted/70 transition",
                              input: "text-sm text-foreground",
                            }}
                            value={adminFiltersDraft.qtdMin?.toString() ?? ""}
                            onValueChange={(value) => updateDraftNumberFilter("qtdMin", value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-semibold tracking-wide text-foreground/70">Qtd. maxima de precatorios</p>
                          <Input
                            aria-label="Qtd. maxima de precatorios"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="999"
                            variant="bordered"
                            size="sm"
                            classNames={{
                              inputWrapper:
                                "h-11 min-h-11 rounded-xl border border-border " +
                                "bg-muted/50 hover:bg-muted/70 transition",
                              input: "text-sm text-foreground",
                            }}
                            value={adminFiltersDraft.qtdMax?.toString() ?? ""}
                            onValueChange={(value) => updateDraftNumberFilter("qtdMax", value)}
                          />
                        </div>
                      </div>

                      <Checkbox
                        isSelected={adminFiltersDraft.apenasComContato || false}
                        onValueChange={(checked) =>
                          setAdminFiltersDraft((prev) => ({
                            ...prev,
                            apenasComContato: checked ? true : undefined,
                          }))
                        }
                        classNames={{
                          base:
                            "w-full max-w-full rounded-xl border border-border " +
                            "bg-muted/40 hover:bg-muted/60 transition px-3 py-3",
                          label: "text-sm text-foreground/90",
                        }}
                      >
                        Mostrar somente clientes com telefone ou e-mail
                      </Checkbox>
                    </div>
                  </AccordionItem>
                </Accordion>
              </ModalBody>

              <ModalFooter className="shrink-0 border-t border-border bg-background px-6 py-4">
                <Button variant="light" color="default" onPress={clearAdminFilters}>
                  Limpar
                </Button>
                <Button color="primary" onPress={applyAdminFilters}>
                  Aplicar filtros
                </Button>
              </ModalFooter>
            </>
          </ModalContent>
        </Modal>
      ) : null}

      <Modal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setEditingCredor(false)
            setDetailsTab("dados")
            setCredorForm(makeCredorForm(selectedCredor))
          }
        }}
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        classNames={{
          wrapper: modalWrapper,
          backdrop: modalBackdrop,
          base: modalBase,
        }}
      >
        <ModalContent className={modalContentBase}>
          <>
            <ModalHeader className="shrink-0 border-b border-border/50 px-6 pb-4 pt-5">
              <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                      {selectedCredor?.credor_nome || "Cliente"}
                    </h2>
                    <p className="text-sm text-foreground/70">
                      {selectedCredor?.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")
                        ? selectedCredor.credor_cpf_cnpj
                        : "CPF/CNPJ nao informado"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {selectedCredor?.total_precatorios || 0} processos
                      </span>
                      <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", statusClass(selectedCredor?.ultimo_status))}>
                        {formatStatus(selectedCredor?.ultimo_status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-start">
                  {!editingCredor ? (
                    <Button color="primary" variant="flat" startContent={<Edit3 className="h-4 w-4" />} onPress={startCredorEditing}>
                      Editar dados
                    </Button>
                  ) : (
                    <>
                      <Button variant="light" color="default" isDisabled={savingCredor} onPress={cancelCredorEditing}>
                        Cancelar
                      </Button>
                      <Button color="primary" isLoading={savingCredor} onPress={handleSaveCredor}>
                        {savingCredor ? "Salvando..." : "Salvar alteracoes"}
                      </Button>
                    </>
                  )}
                  <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                      <Button as="div" isIconOnly variant="light" aria-label="Mais acoes">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownPopover>
                      <DropdownMenu aria-label="Acoes do cliente">
                        <DropdownItem key="editar" onPress={editingCredor ? cancelCredorEditing : startCredorEditing}>
                          {editingCredor ? "Cancelar edicao" : "Editar dados"}
                        </DropdownItem>
                        <DropdownItem key="fechar" onPress={() => setModalOpen(false)}>
                          Fechar
                        </DropdownItem>
                      </DropdownMenu>
                    </DropdownPopover>
                  </Dropdown>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total processos</p>
                  <p className="text-2xl font-semibold tabular-nums">{selectedCredor?.total_precatorios || 0}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Carteira atualizada</p>
                  <p className={cx("text-2xl font-semibold tabular-nums", carteiraAccentClass)}>
                    {selectedCredor?.valor_total_atualizado || selectedCredor?.valor_total_principal
                      ? `R$ ${formatCurrency(selectedCredor.valor_total_atualizado || selectedCredor.valor_total_principal)}`
                      : "R$ 0,00"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ultimo status</p>
                  <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", statusClass(selectedCredor?.ultimo_status))}>
                    {formatStatus(selectedCredor?.ultimo_status)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {selectedCredor?.ultimo_precatorio_data
                      ? new Date(selectedCredor.ultimo_precatorio_data).toLocaleDateString("pt-BR")
                      : "Sem movimentacao"}
                    </p>
                  </div>
              </div>

              <Tabs
                selectedKey={detailsTab}
                onSelectionChange={(key) =>
                  setDetailsTab(String(key) as "dados" | "processos" | "historico")
                }
                variant="underlined"
                color="primary"
                classNames={{
                  base: "w-full",
                  tabList: "w-full gap-2 border-b border-border px-1",
                  tab: "h-10 px-3 data-[selected=true]:text-primary",
                  panel: "pt-4",
                }}
              >
                <Tab key="dados" title="Dados do cliente">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold tracking-tight">Dados do cliente</h3>
                      {editingCredor ? (
                        <button
                          type="button"
                          onClick={() => importCredorDataFromPrecatorios(true)}
                          disabled={loadingDetails || credorPrecatorios.length === 0}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-40"
                        >
                          Importar do precatorio
                        </button>
                      ) : null}
                    </div>
                    <div className="space-y-4">
                      {editingCredor ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">Nome</p>
                            <Input
                              aria-label="Nome"
                              placeholder=""
                              value={credorForm.credor_nome || ""}
                              onValueChange={(value) => setCredorForm({ ...credorForm, credor_nome: value })}
                              classNames={clienteModalInputClassNames}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">CPF/CNPJ</p>
                            <Input
                              aria-label="CPF/CNPJ"
                              placeholder=""
                              value={credorForm.credor_cpf_cnpj || ""}
                              onValueChange={(value) => setCredorForm({ ...credorForm, credor_cpf_cnpj: value })}
                              classNames={clienteModalInputClassNames}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">Telefone</p>
                            <Input
                              aria-label="Telefone"
                              placeholder=""
                              value={credorForm.telefone || ""}
                              onValueChange={(value) => setCredorForm({ ...credorForm, telefone: value })}
                              classNames={clienteModalInputClassNames}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">Email</p>
                            <Input
                              type="email"
                              aria-label="Email"
                              placeholder=""
                              value={credorForm.email || ""}
                              onValueChange={(value) => setCredorForm({ ...credorForm, email: value })}
                              classNames={clienteModalInputClassNames}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">Cidade</p>
                            <Input
                              aria-label="Cidade"
                              placeholder=""
                              value={credorForm.cidade || ""}
                              onValueChange={(value) => setCredorForm({ ...credorForm, cidade: value })}
                              classNames={clienteModalInputClassNames}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">UF</p>
                            <Input
                              aria-label="UF"
                              placeholder=""
                              value={credorForm.uf || ""}
                              onValueChange={(value) => setCredorForm({ ...credorForm, uf: value.toUpperCase() })}
                              classNames={clienteModalInputClassNames}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                          <div>
                            <p className="text-xs text-foreground/60">Nome</p>
                            <p className="font-medium">{selectedCredor?.credor_nome || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground/60">CPF/CNPJ</p>
                            <p className="font-medium">
                              {selectedCredor?.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")
                                ? selectedCredor.credor_cpf_cnpj
                                : "Nao informado"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground/60">Telefone</p>
                            <p className="font-medium">{selectedCredor?.telefone || "Nao informado"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground/60">Email</p>
                            <p className="font-medium">{selectedCredor?.email || "Nao informado"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground/60">Cidade</p>
                            <p className="font-medium">{selectedCredor?.cidade || "Nao informada"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground/60">UF</p>
                            <p className="font-medium">{selectedCredor?.uf || "Nao informada"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Tab>

                <Tab key="processos" title={`Processos vinculados (${credorPrecatorios.length})`}>
                  <div className="rounded-2xl border border-border bg-background overflow-hidden">
                      <Table
                        aria-label="Tabela de processos do cliente"
                        isHeaderSticky
                        classNames={{
                          wrapper: "w-full overflow-x-hidden rounded-xl border border-border shadow-none",
                          table: "w-full table-fixed",
                          th: "bg-default-100/70 text-xs uppercase tracking-wide text-foreground/70",
                          td: "align-top",
                        }}
                      >
                        <TableHeader>
                          <TableColumn>Processo</TableColumn>
                          <TableColumn>Precatorio</TableColumn>
                          <TableColumn>Status</TableColumn>
                          <TableColumn>Valor</TableColumn>
                          <TableColumn className="text-right">Criado em</TableColumn>
                        </TableHeader>
                        <TableBody
                          isLoading={loadingDetails}
                          loadingContent={
                            <div className="flex items-center justify-center py-6">
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
                            </div>
                          }
                          emptyContent="Nenhum processo encontrado para este cliente."
                        >
                          {credorPrecatorios.map((precatorio) => (
                            <TableRow
                              key={precatorio.id}
                              className="cursor-pointer hover:bg-default-100/50"
                              onClick={() => {
                                setModalOpen(false)
                                router.push(`/precatorios/detalhes?id=${precatorio.id}`)
                              }}
                            >
                              <TableCell>
                                <div className="max-w-0 truncate font-mono text-sm">{precatorio.numero_processo || "N/A"}</div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-0 truncate text-sm">{precatorio.numero_precatorio || "N/A"}</div>
                              </TableCell>
                              <TableCell>
                                <Chip size="sm" variant="flat" className={`border ${statusClass(precatorio.status || null)}`}>
                                  {(precatorio.status || "N/I").replaceAll("_", " ")}
                                </Chip>
                              </TableCell>
                              <TableCell>
                                <span className={cx("font-semibold tabular-nums", carteiraAccentClass)}>
                                  {precatorio.valor_atualizado || precatorio.valor_principal
                                    ? `R$ ${formatCurrency(precatorio.valor_atualizado || precatorio.valor_principal)}`
                                    : "R$ 0,00"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-xs text-foreground/70">
                                {new Date(precatorio.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                  </div>
                </Tab>

                <Tab key="historico" title="Historico de atualizacoes">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="space-y-3">
                      {loadingDetails ? (
                        <div className="space-y-2">
                          <div className="h-14 w-full rounded-lg bg-muted animate-pulse" />
                          <div className="h-14 w-full rounded-lg bg-muted animate-pulse" />
                          <div className="h-14 w-full rounded-lg bg-muted animate-pulse" />
                        </div>
                      ) : credorPrecatorios.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem movimentacoes registradas para este cliente.</p>
                      ) : (
                        credorPrecatorios.slice(0, 8).map((precatorio) => (
                          <div
                            key={`timeline-${precatorio.id}`}
                            className="rounded-xl border border-border bg-muted/30 px-4 py-3"
                          >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="font-mono text-xs text-foreground/80">{precatorio.numero_processo || "Processo N/A"}</p>
                              <p className="text-xs text-foreground/60">
                                Atualizado em{" "}
                                {precatorio.updated_at
                                  ? new Date(precatorio.updated_at).toLocaleDateString("pt-BR")
                                  : new Date(precatorio.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-foreground/75">
                              Status: {(precatorio.status || "N/I").replaceAll("_", " ")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Tab>
              </Tabs>
            </ModalBody>
            <ModalFooter className="shrink-0 border-t border-border/50 px-6 py-4">
              <Button
                variant="light"
                color="default"
                onPress={() => {
                  setModalOpen(false)
                  setEditingCredor(false)
                }}
              >
                Fechar
              </Button>
              {editingCredor && (
                <>
                  <Button variant="light" color="default" isDisabled={savingCredor} onPress={cancelCredorEditing}>
                    Cancelar
                  </Button>
                  <Button color="primary" isLoading={savingCredor} onPress={handleSaveCredor}>
                    {savingCredor ? "Salvando..." : "Salvar alteracoes"}
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </div>
  )
}

