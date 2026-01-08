import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"

interface ComplexityBadgeProps {
  nivel: "baixa" | "media" | "alta"
  score: number
  showScore?: boolean
  size?: "sm" | "md" | "lg"
}

export function ComplexityBadge({ nivel, score, showScore = false, size = "md" }: ComplexityBadgeProps) {
  const config = {
    baixa: {
      color: "bg-green-500 hover:bg-green-600 text-white",
      label: "Baixa",
      icon: CheckCircle,
      description: "Complexidade baixa (0-30 pontos)",
    },
    media: {
      color: "bg-yellow-500 hover:bg-yellow-600 text-white",
      label: "Média",
      icon: AlertTriangle,
      description: "Complexidade média (31-60 pontos)",
    },
    alta: {
      color: "bg-red-500 hover:bg-red-600 text-white",
      label: "Alta",
      icon: AlertCircle,
      description: "Complexidade alta (61+ pontos)",
    },
  }

  const { color, label, icon: Icon, description } = config[nivel]

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
      {showScore && <span className="font-bold">({score})</span>}
    </Badge>
  )
}

// Componente para exibir detalhes da complexidade
interface ComplexityDetailsProps {
  score: number
  nivel: "baixa" | "media" | "alta"
  precatorio: {
    titular_falecido: boolean
    valor_atualizado: number
    cessionario?: string
    pss_valor: number
    irpf_valor: number
    honorarios_percentual: number
    numero_processo?: string
    data_base?: string
  }
}

export function ComplexityDetails({ score, nivel, precatorio }: ComplexityDetailsProps) {
  const criterios = [
    {
      label: "Titular falecido",
      pontos: 30,
      ativo: precatorio.titular_falecido,
    },
    {
      label: "Valor muito alto (> R$ 1.000.000)",
      pontos: 25,
      ativo: precatorio.valor_atualizado > 1000000,
    },
    {
      label: "Valor alto (> R$ 500.000)",
      pontos: 15,
      ativo: precatorio.valor_atualizado > 500000 && precatorio.valor_atualizado <= 1000000,
    },
    {
      label: "Cessão de crédito",
      pontos: 20,
      ativo: !!precatorio.cessionario && precatorio.cessionario !== "",
    },
    {
      label: "Múltiplos descontos (PSS + IRPF)",
      pontos: 15,
      ativo: precatorio.pss_valor > 0 && precatorio.irpf_valor > 0,
    },
    {
      label: "Honorários altos (> 20%)",
      pontos: 10,
      ativo: precatorio.honorarios_percentual > 20,
    },
    {
      label: "Processo sem número",
      pontos: 10,
      ativo: !precatorio.numero_processo || precatorio.numero_processo === "",
    },
    {
      label: "Sem data base",
      pontos: 10,
      ativo: !precatorio.data_base,
    },
  ]

  const criteriosAtivos = criterios.filter((c) => c.ativo)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Análise de Complexidade</h4>
        <ComplexityBadge nivel={nivel} score={score} showScore />
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Critérios identificados:</p>
        {criteriosAtivos.length > 0 ? (
          <ul className="space-y-1.5">
            {criteriosAtivos.map((criterio, index) => (
              <li key={index} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {criterio.label}
                </span>
                <span className="font-medium text-muted-foreground">+{criterio.pontos} pts</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">Nenhum critério de complexidade identificado</p>
        )}
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Score Total:</span>
          <span>{score} pontos</span>
        </div>
      </div>
    </div>
  )
}
