"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
  type TooltipProps,
} from "recharts"
import { useInViewOnce } from "@/lib/hooks/use-in-view-once"

type PieDatum = {
  name: string
  value: number
}

type PremiumDonutCardProps = {
  title: string
  subtitle?: string
  data: PieDatum[]
  className?: string
  centerLabel?: string
  valueFormatter?: (n: number) => string
  centerValueFormatter?: (n: number) => string
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1) / 0.9)",
  "hsl(var(--chart-2) / 0.9)",
  "hsl(var(--chart-3) / 0.9)",
  "hsl(var(--chart-4) / 0.9)",
  "hsl(var(--chart-5) / 0.9)",
]

function formatDefault(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n)
}

function PremiumTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: TooltipProps<number, string> & { valueFormatter: (n: number) => string }) {
  if (!active || !payload?.length) return null

  const item = payload[0]
  const name = item?.name ?? label
  const val = Number(item?.value ?? 0)

  return (
    <div className="rounded-2xl border border-border/60 bg-card/56 px-3 py-2 shadow-xl backdrop-blur-md">
      <div className="text-xs text-muted-foreground">{name}</div>
      <div className="text-sm font-semibold text-foreground tabular-nums">{valueFormatter(val)}</div>
      <div className="mt-1 h-px bg-border/60" />
      <div className="mt-1 text-[11px] text-muted-foreground">Passe o mouse para destacar</div>
    </div>
  )
}

type ActiveShapeProps = {
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
}

function renderActiveShape(rawProps: unknown) {
  const props = rawProps as ActiveShapeProps
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={Math.max(0, innerRadius - 2)}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.12}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 9}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.65}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.18))",
        }}
      />
    </g>
  )
}

export function PremiumDonutCard({
  title,
  subtitle,
  data,
  className,
  centerLabel,
  valueFormatter = formatDefault,
  centerValueFormatter,
}: PremiumDonutCardProps) {
  const [activeIndex, setActiveIndex] = React.useState<number>(0)
  const { ref: chartRef, hasEntered: canAnimate } = useInViewOnce<HTMLDivElement>({ threshold: 0.25 })

  const total = React.useMemo(() => data.reduce((acc, d) => acc + (Number(d.value) || 0), 0), [data])
  const isCurrency = React.useMemo(() => valueFormatter(1).includes("R$"), [valueFormatter])

  const active = data[activeIndex] ?? data[0]
  const centerTop = centerLabel ?? "Total"
  const centerValue = React.useMemo(() => {
    const formatted = (centerValueFormatter ?? valueFormatter)(total)
    if (formatted.length <= 14) return formatted

    if (isCurrency) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(total)
    }

    return new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(total)
  }, [centerValueFormatter, isCurrency, total, valueFormatter])

  const chartKey = React.useMemo(
    () => `${data.length}-${total}-${canAnimate ? "animate" : "idle"}`,
    [canAnimate, data.length, total]
  )

  return (
    <motion.div
      ref={chartRef}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={[
        "relative overflow-hidden rounded-2xl border border-primary/30 bg-content1 shadow-[0_24px_56px_-38px_hsl(222_35%_22%/0.22)] dark:border-primary/25 dark:bg-gradient-to-br dark:from-zinc-950/60 dark:via-zinc-900/40 dark:to-primary/22 dark:shadow-[0_24px_56px_-38px_hsl(var(--primary)/0.52)]",
        className ?? "",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 hidden opacity-80 dark:block">
        <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-gradient-to-br from-primary/34 to-transparent blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,transparent_0%,hsl(var(--primary)/0.12)_100%)]" />
      </div>
      <div className="relative p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[18px] font-semibold tracking-[-0.01em]">{title}</div>
            {subtitle ? <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</div> : null}
          </div>

          <div className="max-w-[52%] text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Destaque</div>
            <div className="truncate text-sm font-semibold leading-tight text-foreground" title={active?.name ?? "-"}>
              {active?.name ?? "-"}
            </div>
            <div
              className="truncate text-xs font-semibold tracking-tight text-foreground tabular-nums"
              title={valueFormatter(Number(active?.value ?? 0))}
            >
              {valueFormatter(Number(active?.value ?? 0))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 items-center gap-5 xl:grid-cols-[228px_minmax(0,1fr)]">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart key={chartKey}>
                <Tooltip content={<PremiumTooltip valueFormatter={valueFormatter} />} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  isAnimationActive={canAnimate}
                  animationDuration={900}
                  animationEasing="ease-out"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, idx) => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex((v) => v)}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>

                <foreignObject x="12%" y="34%" width="76%" height="34%">
                  <div className="flex h-full w-full flex-col items-center justify-center text-center">
                    <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{centerTop}</div>
                    <div
                      className="max-w-full truncate text-[clamp(1.05rem,2.1vw,1.35rem)] font-semibold leading-tight tracking-[-0.01em] text-foreground tabular-nums"
                      title={(centerValueFormatter ?? valueFormatter)(total)}
                    >
                      {centerValue}
                    </div>
                  </div>
                </foreignObject>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="min-w-0 space-y-2">
            {data.map((d, i) => {
              const isActive = i === activeIndex
              const formattedValue = valueFormatter(d.value)
              return (
                <button
                  key={`${d.name}${i}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                  className={[
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    "flex items-center justify-between gap-3",
                    isActive ? "border-border bg-muted/70 shadow-sm" : "border-border/60 hover:bg-muted/45",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                    />
                    <span className="truncate text-[13px] font-medium">{d.name}</span>
                  </div>

                  <div
                    className="max-w-[42%] truncate text-right text-[13px] font-extrabold tracking-tight tabular-nums text-foreground"
                    title={formattedValue}
                  >
                    {formattedValue}
                  </div>
                </button>
              )
            })}

            <div className="pt-2 text-[11px] text-muted-foreground">Dica: use hover para comparar rapidamente os segmentos.</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
