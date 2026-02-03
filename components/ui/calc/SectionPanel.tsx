import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const toneStyles = {
  primary: {
    bar: "bg-primary",
    border: "border-primary/25",
    badge: "bg-primary/15 text-primary border-primary/30",
  },
  success: {
    bar: "bg-emerald-500",
    border: "border-emerald-500/25",
    badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  },
  warning: {
    bar: "bg-amber-500",
    border: "border-amber-500/25",
    badge: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  },
  danger: {
    bar: "bg-rose-500",
    border: "border-rose-500/25",
    badge: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  },
  info: {
    bar: "bg-sky-500",
    border: "border-sky-500/25",
    badge: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  },
  neutral: {
    bar: "bg-muted-foreground/60",
    border: "border-border/60",
    badge: "bg-muted/40 text-muted-foreground border-border/60",
  },
}

type Tone = keyof typeof toneStyles

interface SectionPanelProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  tone?: Tone
  className?: string
}

export function SectionPanel({
  title,
  description,
  action,
  children,
  tone = "primary",
  className,
}: SectionPanelProps) {
  const styles = toneStyles[tone]

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur",
        styles.border,
        className,
      )}
    >
      <span className={cn("pointer-events-none absolute left-0 top-0 h-full w-1.5", styles.bar)} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? (
          <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", styles.badge)}>
            {action}
          </div>
        ) : null}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}
