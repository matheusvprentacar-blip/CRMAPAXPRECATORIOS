import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const AC = "#0e4d6a"
const toneStyles = {
  primary: {
    bar: { background: AC },
    icon: { background: "rgba(14,77,106,0.1)", color: AC },
    value: { color: AC },
    badge: { background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.2)", color: AC },
    wrap: { borderColor: "rgba(14,77,106,0.12)" },
  },
  success: {
    bar: { background: "#15803d" },
    icon: { background: "rgba(21,128,61,0.1)", color: "#15803d" },
    value: { color: "#15803d" },
    badge: { background: "rgba(21,128,61,0.08)", border: "1px solid rgba(21,128,61,0.2)", color: "#15803d" },
    wrap: { borderColor: "rgba(21,128,61,0.12)" },
  },
  warning: {
    bar: { background: "#92400e" },
    icon: { background: "rgba(146,64,14,0.1)", color: "#92400e" },
    value: { color: "#92400e" },
    badge: { background: "rgba(146,64,14,0.08)", border: "1px solid rgba(146,64,14,0.2)", color: "#92400e" },
    wrap: { borderColor: "rgba(146,64,14,0.12)" },
  },
  danger: {
    bar: { background: "#dc2626" },
    icon: { background: "rgba(220,38,38,0.1)", color: "#dc2626" },
    value: { color: "#dc2626" },
    badge: { background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" },
    wrap: { borderColor: "rgba(220,38,38,0.12)" },
  },
  info: {
    bar: { background: "#1d4ed8" },
    icon: { background: "rgba(29,78,216,0.1)", color: "#1d4ed8" },
    value: { color: "#1d4ed8" },
    badge: { background: "rgba(29,78,216,0.08)", border: "1px solid rgba(29,78,216,0.2)", color: "#1d4ed8" },
    wrap: { borderColor: "rgba(29,78,216,0.12)" },
  },
  neutral: {
    bar: { background: "#9ca3af" },
    icon: { background: "#f0f1f5", color: "#6b7280" },
    value: { color: "#374151" },
    badge: { background: "#f0f1f5", border: "1px solid rgba(0,0,0,0.08)", color: "#6b7280" },
    wrap: { borderColor: "rgba(0,0,0,0.07)" },
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

export function KpiCard({ label, value, helper, badge, icon, tone = "primary", className }: KpiCardProps) {
  const s = toneStyles[tone]
  return (
    <div
      className={cn("relative overflow-hidden rounded-[18px] bg-white p-4", className)}
      style={{
        border: `1.5px solid ${s.wrap.borderColor}`,
        boxShadow: "8px 8px 20px rgba(0,0,0,0.05),-4px -4px 12px rgba(255,255,255,0.9),inset 1px 1px 3px rgba(255,255,255,0.9),inset -1px -1px 2px rgba(0,0,0,0.03)",
      }}
    >
      {/* color bar */}
      <span
        className="pointer-events-none absolute left-0 top-0 h-full w-1.5 rounded-l-[17px]"
        style={s.bar}
      />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#9ca3af" }}>
            {label}
          </p>
          <div
            className="truncate text-[clamp(1rem,2.2vw,1.45rem)] font-bold leading-tight tabular-nums tracking-tight"
            style={s.value}
          >
            {value}
          </div>
          {helper ? <p className="text-[11px]" style={{ color: "#9ca3af" }}>{helper}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {badge ? (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
              style={s.badge}
            >
              {badge}
            </span>
          ) : null}
          {icon ? (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={s.icon}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
