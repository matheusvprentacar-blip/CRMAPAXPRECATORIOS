import * as React from "react"
import {
  Accordion,
  AccordionItem,
  AvatarFallback as HeroAvatarFallback,
  AvatarImage as HeroAvatarImage,
  AvatarRoot as HeroAvatarRoot,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  RouterProvider,
  ScrollShadow,
  Skeleton,
  Spinner,
  Tooltip,
} from "@heroui/react"

import { cn } from "@/lib/utils"

export {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  Skeleton,
  Spinner,
  Tooltip,
}

export const HeroUIProvider = RouterProvider

export const CardBody = CardContent

type DividerProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical"
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "vertical" ? "h-full w-px" : "h-px w-full",
        "bg-divider",
        className
      )}
      {...props}
    />
  )
)
Divider.displayName = "Divider"

const assignRef = <T,>(ref: React.Ref<T> | undefined, value: T | null) => {
  if (!ref) return
  if (typeof ref === "function") {
    ref(value)
    return
  }
  ; (ref as React.MutableRefObject<T | null>).current = value
}

type InputClassNames = {
  base?: string
  inputWrapper?: string
  input?: string
  startContent?: string
  endContent?: string
  clearButton?: string
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  classNames?: InputClassNames
  startContent?: React.ReactNode
  endContent?: React.ReactNode
  onValueChange?: (value: string) => void
  isClearable?: boolean
  onClear?: () => void
  isDisabled?: boolean
  fullWidth?: boolean
  variant?: "flat" | "bordered" | "faded" | "underlined"
  size?: "sm" | "md" | "lg"
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      classNames,
      startContent,
      endContent,
      onValueChange,
      isClearable,
      onClear,
      isDisabled,
      disabled,
      value,
      defaultValue,
      size = "md",
      variant = "flat",
      fullWidth = true,
      onChange,
      type = "text",
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const isControlled = value !== undefined
    const [internalValue, setInternalValue] = React.useState(() => {
      if (defaultValue === null || defaultValue === undefined) return ""
      return String(defaultValue)
    })

    const currentValue = isControlled ? String(value ?? "") : internalValue
    const disabledState = Boolean(disabled || isDisabled)

    const wrapperHeightClass =
      size === "sm" ? "h-9 text-sm" : size === "lg" ? "h-12 text-base" : "h-10 text-sm"
    const wrapperVariantClass =
      variant === "bordered"
        ? "border border-default-200/80 bg-content1"
        : variant === "underlined"
          ? "rounded-none border-b border-default-200/80 bg-transparent px-0"
          : variant === "faded"
            ? "border border-default-200/60 bg-default-100/60"
            : "border border-transparent bg-default-100/70"

    return (
      <div className={cn(fullWidth && "w-full", classNames?.base, className)}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 transition-colors",
            wrapperHeightClass,
            wrapperVariantClass,
            disabledState && "cursor-not-allowed opacity-60",
            classNames?.inputWrapper
          )}
        >
          {startContent ? (
            <span className={cn("shrink-0 text-foreground/60", classNames?.startContent)}>
              {startContent}
            </span>
          ) : null}
          <input
            {...props}
            ref={(node) => {
              inputRef.current = node
              assignRef(ref, node)
            }}
            type={type}
            disabled={disabledState}
            value={isControlled ? value : undefined}
            defaultValue={isControlled ? undefined : defaultValue}
            className={cn(
              "h-full w-full border-none bg-transparent text-foreground outline-none placeholder:text-foreground/55",
              classNames?.input
            )}
            onChange={(event) => {
              if (!isControlled) {
                setInternalValue(event.target.value)
              }
              onValueChange?.(event.target.value)
              onChange?.(event)
            }}
          />
          {endContent ? (
            <span className={cn("shrink-0 text-foreground/70", classNames?.endContent)}>
              {endContent}
            </span>
          ) : null}
          {isClearable && currentValue ? (
            <button
              type="button"
              aria-label="Limpar"
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-foreground/60 hover:bg-default-200/70 hover:text-foreground",
                classNames?.clearButton
              )}
              disabled={disabledState}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (disabledState) return
                if (!isControlled) {
                  setInternalValue("")
                }
                onValueChange?.("")
                onClear?.()
                inputRef.current?.focus()
              }}
            >
              x
            </button>
          ) : null}
        </div>
      </div>
    )
  }
)
Input.displayName = "Input"

type ChipProps = Omit<React.HTMLAttributes<HTMLDivElement>, "color"> & {
  color?: "default" | "primary" | "success" | "warning" | "danger"
  variant?: "flat" | "dot" | "solid" | "bordered"
  size?: "sm" | "md" | "lg"
  radius?: "none" | "sm" | "md" | "lg" | "full"
  startContent?: React.ReactNode
  endContent?: React.ReactNode
  onClose?: () => void
}

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      className,
      color = "default",
      variant = "flat",
      size = "md",
      radius = "lg",
      startContent,
      endContent,
      onClose,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClass =
      size === "sm"
        ? "h-6 gap-1.5 px-2 text-xs"
        : size === "lg"
          ? "h-8 gap-2.5 px-3 text-sm"
          : "h-7 gap-2 px-2.5 text-sm"

    const radiusClass =
      radius === "none"
        ? "rounded-none"
        : radius === "sm"
          ? "rounded-md"
          : radius === "md"
            ? "rounded-lg"
            : radius === "full"
              ? "rounded-full"
              : "rounded-xl"

    const flatColorClass =
      color === "primary"
        ? "border-primary/30 bg-primary/10 text-primary"
        : color === "success"
          ? "border-success/30 bg-success/10 text-success"
          : color === "warning"
            ? "border-warning/30 bg-warning/10 text-warning"
            : color === "danger"
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-default-200/70 bg-content2/40 text-foreground/85"

    const borderedColorClass =
      color === "primary"
        ? "border-primary/60 bg-transparent text-primary"
        : color === "success"
          ? "border-success/60 bg-transparent text-success"
          : color === "warning"
            ? "border-warning/60 bg-transparent text-warning"
            : color === "danger"
              ? "border-danger/60 bg-transparent text-danger"
              : "border-default-300/70 bg-transparent text-foreground/85"

    const solidColorClass =
      color === "primary"
        ? "border-primary bg-primary text-primary-foreground"
        : color === "success"
          ? "border-success bg-success text-success-foreground"
          : color === "warning"
            ? "border-warning bg-warning text-warning-foreground"
            : color === "danger"
              ? "border-danger bg-danger text-danger-foreground"
              : "border-default bg-default text-default-foreground"

    const toneClass =
      variant === "solid"
        ? solidColorClass
        : variant === "bordered"
          ? borderedColorClass
          : flatColorClass

    const dotClass =
      color === "primary"
        ? "bg-primary"
        : color === "success"
          ? "bg-success"
          : color === "warning"
            ? "bg-warning"
            : color === "danger"
              ? "bg-danger"
              : "bg-default-400"

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex max-w-full items-center border font-medium",
          sizeClass,
          radiusClass,
          toneClass,
          className
        )}
        {...props}
      >
        {variant === "dot" ? <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} /> : null}
        {startContent ? <span className="shrink-0">{startContent}</span> : null}
        <span className="truncate">{children}</span>
        {endContent ? <span className="shrink-0">{endContent}</span> : null}
        {onClose ? (
          <button
            type="button"
            aria-label="Remover"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] opacity-75 hover:bg-default-200/70 hover:opacity-100"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onClose()
            }}
          >
            x
          </button>
        ) : null}
      </div>
    )
  }
)
Chip.displayName = "Chip"

type SelectClassNames = {
  base?: string
  trigger?: string
  value?: string
  popoverContent?: string
  listboxWrapper?: string
  listbox?: string
}

type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "defaultValue" | "onChange" | "size"
> & {
  selectedKeys?: "all" | Iterable<React.Key>
  defaultSelectedKeys?: "all" | Iterable<React.Key>
  onSelectionChange?: (keys: Set<React.Key> | "all") => void
  startContent?: React.ReactNode
  classNames?: SelectClassNames
  isDisabled?: boolean
  variant?: "flat" | "bordered" | "faded" | "underlined"
  size?: "sm" | "md" | "lg"
}

type SelectItemProps = {
  value?: string
  isDisabled?: boolean
  disabled?: boolean
  children?: React.ReactNode
}

const normalizeReactKey = (key: React.Key | null) => {
  if (key === null || key === undefined) return ""
  const value = String(key)
  return value.replace(/^\.\$?/, "").replace(/^\./, "")
}

const firstKey = (keys?: "all" | Iterable<React.Key>) => {
  if (!keys || keys === "all") return ""
  for (const key of keys) return String(key)
  return ""
}

const toText = (value: React.ReactNode): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.map((item) => toText(item)).join("")
  if (React.isValidElement(value)) return toText(value.props.children)
  return ""
}

export const SelectItem: React.FC<SelectItemProps> = () => null
SelectItem.displayName = "SelectItem"

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      children,
      selectedKeys,
      defaultSelectedKeys,
      onSelectionChange,
      onChange,
      startContent,
      classNames,
      isDisabled,
      disabled,
      placeholder,
      variant,
      size = "md",
      ...props
    },
    ref
  ) => {
    const options = React.useMemo(() => {
      const next: Array<{ value: string; label: string; disabled: boolean }> = []
      React.Children.forEach(children, (child) => {
        if (!React.isValidElement<SelectItemProps>(child)) return
        const keyValue = normalizeReactKey(child.key)
        const value = child.props.value ?? keyValue
        if (!value) return
        next.push({
          value,
          label: toText(child.props.children),
          disabled: Boolean(child.props.isDisabled || child.props.disabled),
        })
      })
      return next
    }, [children])

    const controlledValue = firstKey(selectedKeys)
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
      firstKey(defaultSelectedKeys)
    )
    const currentValue = controlledValue || uncontrolledValue || ""

    const disabledState = Boolean(disabled || isDisabled)
    const heightClass = size === "sm" ? "h-9 text-sm" : size === "lg" ? "h-12 text-base" : "h-10 text-sm"

    return (
      <div className={cn("w-full", classNames?.base, className)}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border border-default-200/70 bg-content1 px-3",
            heightClass,
            disabledState && "opacity-60",
            classNames?.trigger
          )}
          data-variant={variant}
        >
          {startContent ? <span className="shrink-0 text-foreground/70">{startContent}</span> : null}
          <select
            {...props}
            ref={ref}
            disabled={disabledState}
            value={currentValue}
            className={cn(
              "h-full w-full appearance-none bg-transparent outline-none text-foreground",
              classNames?.value
            )}
            onChange={(event) => {
              const value = event.target.value
              if (!controlledValue) setUncontrolledValue(value)
              onSelectionChange?.(value ? new Set([value]) : new Set())
              onChange?.(event)
            }}
          >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((item) => (
              <option key={item.value} value={item.value} disabled={item.disabled}>
                {item.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none text-xs text-foreground/60">▼</span>
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

type TabsClassNames = {
  base?: string
  tabList?: string
  tab?: string
  panel?: string
}

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  selectedKey?: React.Key
  defaultSelectedKey?: React.Key
  onSelectionChange?: (key: React.Key) => void
  classNames?: TabsClassNames
}

type TabProps = {
  title?: React.ReactNode
  children?: React.ReactNode
  isDisabled?: boolean
}

type TabEntry = {
  key: string
  title?: React.ReactNode
  content?: React.ReactNode
  isDisabled?: boolean
}

const normalizeCollectionKey = (key: React.Key | null, fallback: string) => {
  if (key === null || key === undefined) return fallback
  const value = String(key)
  const normalized = value.replace(/^\.\$?/, "").replace(/^\./, "")
  return normalized || fallback
}

export const Tab: React.FC<TabProps> = () => null
Tab.displayName = "Tab"

export function Tabs({
  className,
  children,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  classNames,
  ...props
}: TabsProps) {
  const tabs = React.useMemo<TabEntry[]>(() => {
    return React.Children.toArray(children)
      .map((child, index) => {
        if (!React.isValidElement<TabProps>(child)) return null
        return {
          key: normalizeCollectionKey(child.key, `tab-${index}`),
          title: child.props.title,
          content: child.props.children,
          isDisabled: child.props.isDisabled,
        }
      })
      .filter((entry): entry is TabEntry => entry !== null)
  }, [children])

  const firstEnabledKey =
    tabs.find((entry) => !entry.isDisabled)?.key || tabs[0]?.key || ""

  const controlledKey = selectedKey !== undefined ? String(selectedKey) : null
  const [internalKey, setInternalKey] = React.useState<string>(() =>
    defaultSelectedKey !== undefined ? String(defaultSelectedKey) : firstEnabledKey
  )

  React.useEffect(() => {
    if (controlledKey !== null) return
    if (tabs.length === 0) return
    if (tabs.some((entry) => entry.key === internalKey)) return
    setInternalKey(firstEnabledKey)
  }, [controlledKey, firstEnabledKey, internalKey, tabs])

  const activeKey = controlledKey ?? internalKey
  const activeTab = tabs.find((entry) => entry.key === activeKey) || tabs[0]

  return (
    <div className={cn("w-full", classNames?.base, className)} {...props}>
      <div className={cn("flex items-center gap-2 border-b border-default-200/70", classNames?.tabList)}>
        {tabs.map((entry) => {
          const isActive = entry.key === (activeTab?.key || "")
          return (
            <button
              key={entry.key}
              type="button"
              disabled={Boolean(entry.isDisabled)}
              className={cn(
                "inline-flex items-center border-b-2 border-transparent px-2 py-2 text-sm text-foreground/70 transition",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isActive && "border-primary text-primary",
                classNames?.tab
              )}
              onClick={() => {
                if (entry.isDisabled) return
                if (controlledKey === null) setInternalKey(entry.key)
                onSelectionChange?.(entry.key)
              }}
            >
              {entry.title ?? entry.key}
            </button>
          )
        })}
      </div>
      <div className={cn("pt-3", classNames?.panel)}>{activeTab?.content ?? null}</div>
    </div>
  )
}

type ModalContentProps = React.ComponentProps<typeof ModalDialog>

export const ModalContent = React.forwardRef<
  React.ElementRef<typeof ModalDialog>,
  ModalContentProps
>(({ className, ...props }, ref) => (
  <ModalDialog ref={ref} className={cn("outline-none", className)} {...props} />
))
ModalContent.displayName = "ModalContent"

export const AvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center -space-x-2 [&>*]:ring-2 [&>*]:ring-background", className)}
    {...props}
  />
))
AvatarGroup.displayName = "AvatarGroup"

export const AvatarIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={cn("h-4 w-4", className)}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M4 20c1.7-3.2 4.8-5 8-5s6.3 1.8 8 5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
)

type AvatarClassNames = {
  base?: string
  image?: string
  fallback?: string
  icon?: string
}

type AvatarProps = Omit<React.ComponentProps<typeof HeroAvatarRoot>, "children"> & {
  src?: string | null
  name?: string | null
  showFallback?: boolean
  icon?: React.ReactNode
  classNames?: AvatarClassNames
  children?: React.ReactNode
}

const getInitials = (name?: string | null) => {
  const value = (name || "").trim()
  if (!value) return "?"
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase()
}

export const Avatar = React.forwardRef<
  React.ElementRef<typeof HeroAvatarRoot>,
  AvatarProps
>(
  (
    { className, children, src, name, showFallback, icon, classNames, ...props },
    ref
  ) => {
    if (children) {
      return (
        <HeroAvatarRoot
          ref={ref}
          className={cn(classNames?.base, className)}
          {...props}
        >
          {children}
        </HeroAvatarRoot>
      )
    }

    return (
      <HeroAvatarRoot
        ref={ref}
        className={cn(classNames?.base, className)}
        {...props}
      >
        {src ? <HeroAvatarImage src={src} className={classNames?.image} /> : null}
        {(showFallback || !src) ? (
          <HeroAvatarFallback className={classNames?.fallback}>
            {icon ? (
              <span className={classNames?.icon}>{icon}</span>
            ) : (
              <span className={classNames?.icon}>{getInitials(name)}</span>
            )}
          </HeroAvatarFallback>
        ) : null}
      </HeroAvatarRoot>
    )
  }
)
Avatar.displayName = "Avatar"

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number
  maxValue?: number
  size?: "sm" | "md" | "lg"
  color?: "default" | "primary" | "success" | "warning" | "danger"
}

export function Progress({
  className,
  value = 0,
  maxValue = 100,
  size = "md",
  color = "primary",
  ...props
}: ProgressProps) {
  const safeMax = maxValue > 0 ? maxValue : 100
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0
  const percent = (safeValue / safeMax) * 100

  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2"
  const toneClass =
    color === "success"
      ? "bg-success"
      : color === "warning"
        ? "bg-warning"
        : color === "danger"
          ? "bg-danger"
          : color === "default"
            ? "bg-default-400"
            : "bg-primary"

  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-default-200/70", heightClass, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", toneClass)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

type TableClassNames = {
  wrapper?: string
  table?: string
  thead?: string
  tbody?: string
  tr?: string
  th?: string
  td?: string
}

type TableContextValue = {
  classNames?: TableClassNames
  onRowAction?: (key: React.Key) => void
  isStriped?: boolean
  isHeaderSticky?: boolean
  columnCount?: number
}

const TableContext = React.createContext<TableContextValue>({})

type TableProps = Omit<React.TableHTMLAttributes<HTMLTableElement>, "className"> & {
  className?: string
  classNames?: TableClassNames
  removeWrapper?: boolean
  isStriped?: boolean
  isHeaderSticky?: boolean
  onRowAction?: (key: React.Key) => void
}

export function Table({
  className,
  classNames,
  removeWrapper,
  isStriped,
  isHeaderSticky,
  onRowAction,
  children,
  ...props
}: TableProps) {
  const [columnCount, setColumnCount] = React.useState(1)

  const table = (
    <table
      {...props}
      className={cn("w-full text-left text-sm", classNames?.table, className)}
      data-table-column-count={columnCount}
      ref={(node) => {
        if (!node) return
        const count = node.querySelectorAll("thead th").length
        if (count > 0 && count !== columnCount) setColumnCount(count)
      }}
    >
      {children}
    </table>
  )

  return (
    <TableContext.Provider
      value={{
        classNames,
        onRowAction,
        isStriped,
        isHeaderSticky,
        columnCount,
      }}
    >
      {removeWrapper ? table : <div className={cn("w-full overflow-auto rounded-xl", classNames?.wrapper)}>{table}</div>}
    </TableContext.Provider>
  )
}

type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>

export function TableHeader({ className, children, ...props }: TableHeaderProps) {
  const { classNames, isHeaderSticky } = React.useContext(TableContext)
  return (
    <thead
      className={cn(
        classNames?.thead,
        isHeaderSticky && "sticky top-0 z-10 bg-content1/95 backdrop-blur",
        className
      )}
      {...props}
    >
      <tr>{children}</tr>
    </thead>
  )
}

type TableColumnProps = React.ThHTMLAttributes<HTMLTableCellElement>

export function TableColumn({ className, children, ...props }: TableColumnProps) {
  const { classNames } = React.useContext(TableContext)
  return (
    <th
      scope="col"
      className={cn("px-3 py-2 font-semibold text-foreground/75", classNames?.th, className)}
      {...props}
    >
      {children}
    </th>
  )
}

type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement> & {
  isLoading?: boolean
  loadingContent?: React.ReactNode
  emptyContent?: React.ReactNode
}

export function TableBody({
  className,
  children,
  isLoading,
  loadingContent,
  emptyContent,
  ...props
}: TableBodyProps) {
  const { classNames, columnCount = 1, onRowAction } = React.useContext(TableContext)
  const rows = React.Children.toArray(children)

  return (
    <tbody className={cn(classNames?.tbody, className)} {...props}>
      {isLoading && rows.length === 0 ? (
        <tr>
          <td className="px-3 py-6 text-center text-foreground/70" colSpan={columnCount}>
            {loadingContent || "Carregando..."}
          </td>
        </tr>
      ) : rows.length === 0 ? (
        <tr>
          <td className="px-3 py-6 text-center text-foreground/70" colSpan={columnCount}>
            {emptyContent || "Sem dados"}
          </td>
        </tr>
      ) : (
        rows.map((row) => {
          if (!React.isValidElement(row)) return row
          const key = row.key
          const normalizedKey =
            typeof key === "string" ? key.replace(/^\.\$?/, "").replace(/^\./, "") : key
          return React.cloneElement(row as React.ReactElement<TableRowProps>, {
            __rowActionKey: normalizedKey,
            __onRowAction: onRowAction,
          })
        })
      )}
    </tbody>
  )
}

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  __rowActionKey?: React.Key | null
  __onRowAction?: (key: React.Key) => void
}

export function TableRow({
  className,
  children,
  onClick,
  __rowActionKey,
  __onRowAction,
  ...props
}: TableRowProps) {
  const { classNames, isStriped } = React.useContext(TableContext)
  return (
    <tr
      className={cn(
        "border-t border-default-200/60",
        isStriped && "odd:bg-default-100/25",
        classNames?.tr,
        className
      )}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (!__onRowAction) return
        if (__rowActionKey === null || __rowActionKey === undefined) return
        __onRowAction(__rowActionKey)
      }}
      {...props}
    >
      {children}
    </tr>
  )
}

type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>

export function TableCell({ className, children, ...props }: TableCellProps) {
  const { classNames } = React.useContext(TableContext)
  return (
    <td className={cn("px-3 py-2 align-middle", classNames?.td, className)} {...props}>
      {children}
    </td>
  )
}

type SliderProps = {
  value?: number
  minValue?: number
  maxValue?: number
  step?: number
  onChange?: (value: number) => void
  onChangeEnd?: (value: number) => void
  className?: string
  "aria-label"?: string
  size?: "sm" | "md" | "lg"
  color?: "primary" | "secondary" | "success" | "warning" | "danger"
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value = 0,
      minValue = 0,
      maxValue = 100,
      step = 1,
      onChange,
      onChangeEnd,
      className,
      size = "md",
      color = "primary",
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value)
    const _trackRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      setInternalValue(value)
    }, [value])

    const percentage = ((internalValue - minValue) / (maxValue - minValue)) * 100

    const colorClass =
      color === "success"
        ? "bg-success"
        : color === "warning"
          ? "bg-warning"
          : color === "danger"
            ? "bg-danger"
            : color === "secondary"
              ? "bg-secondary"
              : "bg-primary"

    const heightClass = size === "sm" ? "h-1" : size === "lg" ? "h-2" : "h-1.5"
    const thumbSizeClass = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value)
      setInternalValue(next)
      onChange?.(next)
    }

    const handleMouseUp = () => {
      onChangeEnd?.(internalValue)
    }

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full flex-col gap-2", className)}
        {...props}
      >
        <div className="relative flex h-6 w-full items-center">
          <div className={cn("relative w-full rounded-full bg-default-200/50", heightClass)}>
            <div
              className={cn("absolute h-full rounded-full transition-[width] duration-100", colorClass)}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            type="range"
            min={minValue}
            max={maxValue}
            step={step}
            value={internalValue}
            onChange={handleChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="absolute z-10 w-full cursor-pointer opacity-0"
            aria-label={props["aria-label"]}
          />
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-md transition-transform duration-100",
              colorClass,
              thumbSizeClass
            )}
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }
)
Slider.displayName = "Slider"
