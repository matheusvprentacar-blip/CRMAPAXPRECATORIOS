import type { ReactNode, CSSProperties } from "react"
import { cn } from "@/lib/utils"

const toneBar: Record<string, string> = {
  primary: "#0e4d6a",
  success:  "#15803d",
  warning:  "#92400e",
  danger:   "#dc2626",
  info:     "#1d4ed8",
  neutral:  "#9ca3af",
}

const toneBadge: Record<string, CSSProperties> = {
  primary: { background: "rgba(14,77,106,0.08)",  border: "1px solid rgba(14,77,106,0.18)",  color: "#0e4d6a" },
  success: { background: "rgba(21,128,61,0.08)",  border: "1px solid rgba(21,128,61,0.18)",  color: "#15803d" },
  warning: { background: "rgba(146,64,14,0.08)",  border: "1px solid rgba(146,64,14,0.18)",  color: "#92400e" },
  danger:  { background: "rgba(220,38,38,0.08)",  border: "1px solid rgba(220,38,38,0.18)",  color: "#dc2626" },
  info:    { background: "rgba(29,78,216,0.08)",  border: "1px solid rgba(29,78,216,0.18)",  color: "#1d4ed8" },
  neutral: { background: "#f0f1f5",                border: "1px solid rgba(0,0,0,0.08)",      color: "#6b7280" },
}

interface SectionPanelProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  tone?: keyof typeof toneBar
  className?: string
}

export function SectionPanel({ title, description, action, children, tone = "primary", className }: SectionPanelProps) {
  return (
    <section
      className={cn("relative overflow-hidden rounded-[18px] bg-white p-5", className)}
      style={{
        border: "1.5px solid rgba(0,0,0,0.06)",
        boxShadow: "6px 6px 16px rgba(0,0,0,0.04),-3px -3px 10px rgba(255,255,255,0.9),inset 1px 1px 3px rgba(255,255,255,0.9)",
      }}
    >
      {/* color bar */}
      <span
        className="pointer-events-none absolute left-0 top-0 h-full w-1.5 rounded-l-[17px]"
        style={{ background: toneBar[tone] ?? toneBar.primary }}
      />
      <div className="flex flex-wrap items-start justify-between gap-3 pl-1">
        <div>
          <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>{title}</p>
          {description ? <p className="text-[11.5px] mt-0.5" style={{ color: "#9ca3af" }}>{description}</p> : null}
        </div>
        {action ? (
          <div
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={toneBadge[tone] ?? toneBadge.primary}
          >
            {action}
          </div>
        ) : null}
      </div>
      <div className="mt-4 space-y-4 pl-1">{children}</div>
    </section>
  )
}
