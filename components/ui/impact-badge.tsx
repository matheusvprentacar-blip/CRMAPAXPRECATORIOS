import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, AlertCircle } from "lucide-react"

interface ImpactBadgeProps {
  impacto: "baixo" | "medio" | "alto"
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

export function ImpactBadge({ impacto, size = "md", showIcon = true }: ImpactBadgeProps) {
  const config = {
    baixo: {
      color: "bg-green-100 text-green-800 border-green-300",
      label: "Baixo",
      icon: TrendingDown,
      description: "Resolução em até 24h",
    },
    medio: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      label: "Médio",
      icon: AlertCircle,
      description: "Resolução em 2-5 dias",
    },
    alto: {
      color: "bg-red-100 text-red-800 border-red-300",
      label: "Alto",
      icon: TrendingUp,
      description: "Resolução > 5 dias",
    },
  }

  const { color, label, icon: Icon, description } = config[impacto]

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  }

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }

  return (
    <Badge 
      variant="outline" 
      className={`${color} ${sizeClasses[size]} flex items-center gap-1.5 font-medium`} 
      title={description}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>Impacto: {label}</span>
    </Badge>
  )
}

// Função helper para obter label do impacto
export function getImpactLabel(impacto: string): string {
  const labels: Record<string, string> = {
    baixo: "Baixo (até 24h)",
    medio: "Médio (2-5 dias)",
    alto: "Alto (>5 dias)",
  }
  return labels[impacto] || impacto
}

// Função helper para obter cor do impacto
export function getImpactColor(impacto: string): string {
  const colors: Record<string, string> = {
    baixo: "green",
    medio: "yellow",
    alto: "red",
  }
  return colors[impacto] || "gray"
}
