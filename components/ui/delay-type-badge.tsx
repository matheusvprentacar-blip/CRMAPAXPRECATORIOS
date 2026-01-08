import { Badge } from "@/components/ui/badge"
import { UserX, AlertTriangle, FileX, HelpCircle, Clock, Users, MoreHorizontal } from "lucide-react"

interface DelayTypeBadgeProps {
  tipo: "titular_falecido" | "penhora" | "cessao_parcial" | "doc_incompleta" | "duvida_juridica" | "aguardando_cliente" | "outro"
  size?: "sm" | "md" | "lg"
}

export function DelayTypeBadge({ tipo, size = "md" }: DelayTypeBadgeProps) {
  const config = {
    titular_falecido: {
      color: "bg-purple-500 hover:bg-purple-600 text-white",
      label: "Titular Falecido",
      icon: UserX,
      description: "Requer documentação de espólio",
    },
    penhora: {
      color: "bg-red-500 hover:bg-red-600 text-white",
      label: "Penhora",
      icon: AlertTriangle,
      description: "Penhora identificada no precatório",
    },
    cessao_parcial: {
      color: "bg-orange-500 hover:bg-orange-600 text-white",
      label: "Cessão Parcial",
      icon: Users,
      description: "Cessão parcial de crédito",
    },
    doc_incompleta: {
      color: "bg-yellow-500 hover:bg-yellow-600 text-white",
      label: "Doc. Incompleta",
      icon: FileX,
      description: "Documentação incompleta",
    },
    duvida_juridica: {
      color: "bg-blue-500 hover:bg-blue-600 text-white",
      label: "Dúvida Jurídica",
      icon: HelpCircle,
      description: "Requer análise jurídica",
    },
    aguardando_cliente: {
      color: "bg-cyan-500 hover:bg-cyan-600 text-white",
      label: "Aguardando Cliente",
      icon: Clock,
      description: "Aguardando informações do cliente",
    },
    outro: {
      color: "bg-gray-500 hover:bg-gray-600 text-white",
      label: "Outro",
      icon: MoreHorizontal,
      description: "Outro motivo",
    },
  }

  const { color, label, icon: Icon, description } = config[tipo]

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
    <Badge className={`${color} ${sizeClasses[size]} flex items-center gap-1.5`} title={description}>
      <Icon className={iconSizes[size]} />
      <span className="font-medium">{label}</span>
    </Badge>
  )
}

// Função helper para obter label do tipo
export function getDelayTypeLabel(tipo: string): string {
  const labels: Record<string, string> = {
    titular_falecido: "Titular Falecido",
    penhora: "Penhora",
    cessao_parcial: "Cessão Parcial",
    doc_incompleta: "Doc. Incompleta",
    duvida_juridica: "Dúvida Jurídica",
    aguardando_cliente: "Aguardando Cliente",
    outro: "Outro",
  }
  return labels[tipo] || tipo
}
