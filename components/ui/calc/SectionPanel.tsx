import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const toneStyles = {
  primary: {
    bar: "bg-primary",
    border: "border-primary/25",
    badge: "bg-primary/15 text-primary border-primary/30",
  },
  success: {
    bar: "bg-primary/15",
    border: "border-primary/40",
    badge: "bg-primary/15 text-primary border-primary/40",
  },
  warning: {
    bar: "bg-primary/15",
    border: "border-primary/40",
    badge: "bg-primary/15 text-primary border-primary/40",
  },
  danger: {
    bar: "bg-destructive/15",
    border: "border-destructive/40",
    badge: "bg-destructive/15 text-destructive border-destructive/40",
  },
  info: {
    bar: "bg-primary/15",
    border: "border-primary/40",
    badge: "bg-primary/15 text-primary border-primary/40",
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
