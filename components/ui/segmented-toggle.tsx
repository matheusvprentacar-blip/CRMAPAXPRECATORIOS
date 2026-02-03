"use client"

type SegmentedOption<T extends string> = {
  value: T
  label: string
}

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value?: T
  onChange: (v: T) => void
  options: [SegmentedOption<T>, SegmentedOption<T>]
  className?: string
}) {
  return (
    <div
      className={[
        "inline-flex items-center rounded-2xl border bg-background p-1 shadow-sm",
        "dark:bg-background/60",
        className,
      ].join(" ")}
      role="tablist"
      aria-label="Modo de cálculo"
    >
      {options.map((opt) => {
        const active = opt.value === value

        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={[
              "h-10 min-w-[160px] px-4 rounded-xl text-sm font-medium transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              active
                ? "bg-primary text-primary-foreground shadow"
                : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            ].join(" ")}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export type { SegmentedOption }
