"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus, LucideIcon } from "@/components/icons"
import CountUp from "react-countup"
import { cn } from "@/lib/utils"

interface AnimatedNumberConfig {
  end: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  separator?: string
  decimal?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  variant?: "default" | "success" | "warning" | "danger"
  className?: string
  animatedNumber?: AnimatedNumberConfig
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  className,
  animatedNumber,
}: MetricCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-emerald-500/30",
    warning: "border-amber-500/30",
    danger: "border-destructive/40",
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-4 w-4" />
      case "down":
        return <ArrowDown className="h-4 w-4" />
      case "neutral":
        return <Minus className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-primary dark:text-primary"
      case "down":
        return "text-destructive dark:text-destructive"
      case "neutral":
        return "text-muted-foreground dark:text-muted-foreground"
      default:
        return ""
    }
  }

  const renderValue = () => {
    if (!animatedNumber || !Number.isFinite(animatedNumber.end)) return value

    return (
      <CountUp
        end={animatedNumber.end}
        duration={animatedNumber.duration ?? 0.9}
        separator={animatedNumber.separator ?? "."}
        decimal={animatedNumber.decimal ?? ","}
        decimals={animatedNumber.decimals ?? (Number.isInteger(animatedNumber.end) ? 0 : 2)}
        prefix={animatedNumber.prefix}
        suffix={animatedNumber.suffix}
        enableScrollSpy
        scrollSpyOnce
        scrollSpyDelay={120}
      />
    )
  }

  return (
    <Card className={cn("relative overflow-hidden", variantStyles[variant], className)}>
      <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-1">
          <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-primary">
            {renderValue()}
          </div>
          {subtitle && <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">{subtitle}</p>}
          {trend && trendValue && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
