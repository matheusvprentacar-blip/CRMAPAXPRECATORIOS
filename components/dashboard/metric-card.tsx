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
    success: "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
    warning: "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
    danger: "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
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
        return "text-green-600 dark:text-green-400"
      case "down":
        return "text-red-600 dark:text-red-400"
      case "neutral":
        return "text-gray-600 dark:text-gray-400"
      default:
        return ""
    }
  }

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide uppercase text-zinc-500">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-zinc-400" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
            {value}
          </div>
          {subtitle && <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{subtitle}</p>}
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
