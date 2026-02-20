"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, Minus, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  variant?: "default" | "success" | "warning" | "danger"
  className?: string
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
}: MetricCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-primary/40 bg-primary/15 dark:bg-primary/15",
    warning: "border-primary/40 bg-primary/15 dark:bg-primary/15",
    danger: "border-destructive/40 bg-destructive/15 dark:bg-destructive/15",
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

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-primary">
            {value}
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
