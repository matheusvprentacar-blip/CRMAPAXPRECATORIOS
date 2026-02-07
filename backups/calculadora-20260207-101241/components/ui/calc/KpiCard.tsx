import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const toneStyles = {
  primary: {
    bar: "bg-primary",
    ring: "ring-primary/20",
    border: "border-primary/25",
    badge: "bg-primary/15 text-primary border-primary/30",
    value: "text-primary",
  },
  success: {
    bar: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    border: "border-emerald-500/25",
    badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    value: "text-emerald-500",
  },
  warning: {
    bar: "bg-amber-500",
    ring: "ring-amber-500/20",
    border: "border-amber-500/25",
    badge: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    value: "text-amber-500",
  },
  danger: {
    bar: "bg-rose-500",
    ring: "ring-rose-500/20",
    border: "border-rose-500/25",
    badge: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    value: "text-rose-500",
  },
  info: {
    bar: "bg-sky-500",
    ring: "ring-sky-500/20",
    border: "border-sky-500/25",
    badge: "bg-sky-500/15 text-sky-500 border-sky-500/30",
    value: "text-sky-500",
  },
  neutral: {
    bar: "bg-muted-foreground/60",
    ring: "ring-border/20",
    border: "border-border/60",
    badge: "bg-muted/40 text-muted-foreground border-border/60",
    value: "text-foreground",
  },
}

type Tone = keyof typeof toneStyles

interface KpiCardProps {
  label: string
  value: ReactNode
  helper?: ReactNode
  badge?: ReactNode
  icon?: ReactNode
  tone?: Tone
  className?: string
}

export function KpiCard({
  label,
  value,
  helper,
  badge,
  icon,
  tone = "primary",
  className,
}: KpiCardProps) {
  const styles = toneStyles[tone]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur",
        "ring-1",
        styles.ring,
        styles.border,
        className,
      )}
    >
      <span className={cn("pointer-events-none absolute left-0 top-0 h-full w-1.5", styles.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              "truncate text-[clamp(1rem,2.2vw,1.5rem)] font-semibold leading-tight tabular-nums tracking-tight",
              "group-data-[pdf=open]:text-[clamp(0.85rem,1.4vw,1.1rem)]",
              "group-data-[pdf=open]:whitespace-normal group-data-[pdf=open]:break-words group-data-[pdf=open]:overflow-visible group-data-[pdf=open]:text-clip group-data-[pdf=open]:leading-snug",
              styles.value,
            )}
          >
            {value}
          </div>
          {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {badge ? (
            <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", styles.badge)}>
              {badge}
            </span>
          ) : null}
          {icon ? (
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border", styles.badge)}>
              {icon}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
