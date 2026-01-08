import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, AlertTriangle, AlertCircle, Circle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface SLAIndicatorProps {
  dataEntrada?: string
  slaHoras: number
  status: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"
  size?: "sm" | "md" | "lg"
  showDetails?: boolean
}

export function SLAIndicator({ dataEntrada, slaHoras, status, size = "md", showDetails = true }: SLAIndicatorProps) {
  const config = {
    nao_iniciado: {
      color: "bg-gray-400 hover:bg-gray-500 text-white",
      label: "Não Iniciado",
      icon: Circle,
      description: "Cálculo ainda não iniciado",
    },
    no_prazo: {
      color: "bg-green-500 hover:bg-green-600 text-white",
      label: "No Prazo",
      icon: CheckCircle,
      description: "Dentro do prazo (< 80% do SLA)",
    },
    atencao: {
      color: "bg-yellow-500 hover:bg-yellow-600 text-white",
      label: "Atenção",
      icon: AlertTriangle,
      description: "Próximo do limite (80-100% do SLA)",
    },
    atrasado: {
      color: "bg-red-500 hover:bg-red-600 text-white",
      label: "Atrasado",
      icon: AlertCircle,
      description: "SLA ultrapassado (> 100%)",
    },
    concluido: {
      color: "bg-blue-500 hover:bg-blue-600 text-white",
      label: "Concluído",
      icon: CheckCircle,
      description: "Cálculo finalizado",
    },
  }

  const { color, label, icon: Icon, description } = config[status]

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

  // Calcular tempo decorrido e percentual
  const calcularTempoDecorrido = () => {
    if (!dataEntrada) return { horas: 0, percentual: 0, tempoFormatado: "-" }

    const inicio = new Date(dataEntrada)
    const agora = new Date()
    const diferencaMs = agora.getTime() - inicio.getTime()
    const horas = diferencaMs / (1000 * 60 * 60)
    const percentual = (horas / slaHoras) * 100

    const tempoFormatado = formatDistanceToNow(inicio, {
      locale: ptBR,
      addSuffix: true,
    })

    return {
      horas: Math.floor(horas),
      percentual: Math.round(percentual),
      tempoFormatado,
    }
  }

  const { horas, percentual, tempoFormatado } = calcularTempoDecorrido()

  return (
    <div className="space-y-2">
      <Badge className={`${color} ${sizeClasses[size]} flex items-center gap-1.5`} title={description}>
        <Icon className={iconSizes[size]} />
        <span className="font-medium">{label}</span>
      </Badge>

      {showDetails && dataEntrada && status !== "nao_iniciado" && status !== "concluido" && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>
              {horas}h / {slaHoras}h ({percentual}%)
            </span>
          </div>
          <div className="text-xs italic">{tempoFormatado}</div>
        </div>
      )}
    </div>
  )
}

// Componente para exibir detalhes completos do SLA
interface SLADetailsProps {
  dataEntrada?: string
  slaHoras: number
  status: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"
  urgente: boolean
  nivelComplexidade: "baixa" | "media" | "alta"
}

export function SLADetails({ dataEntrada, slaHoras, status, urgente, nivelComplexidade }: SLADetailsProps) {
  const calcularTempoDecorrido = () => {
    if (!dataEntrada) return { horas: 0, minutos: 0, percentual: 0 }

    const inicio = new Date(dataEntrada)
    const agora = new Date()
    const diferencaMs = agora.getTime() - inicio.getTime()
    const horas = Math.floor(diferencaMs / (1000 * 60 * 60))
    const minutos = Math.floor((diferencaMs % (1000 * 60 * 60)) / (1000 * 60))
    const percentual = ((diferencaMs / (1000 * 60 * 60)) / slaHoras) * 100

    return { horas, minutos, percentual: Math.round(percentual) }
  }

  const { horas, minutos, percentual } = calcularTempoDecorrido()
  const horasRestantes = Math.max(0, slaHoras - horas)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Status do SLA</h4>
        <SLAIndicator dataEntrada={dataEntrada} slaHoras={slaHoras} status={status} showDetails={false} />
      </div>

      <div className="space-y-3">
        {/* Informações do SLA */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">SLA Definido:</p>
            <p className="font-medium">{slaHoras} horas</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tipo:</p>
            <p className="font-medium">
              {urgente ? "Urgente (24h)" : nivelComplexidade === "alta" ? "Alta Complexidade (72h)" : "Padrão (48h)"}
            </p>
          </div>
        </div>

        {dataEntrada && status !== "nao_iniciado" && (
          <>
            {/* Tempo decorrido */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tempo Decorrido:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      percentual < 80 ? "bg-green-500" : percentual < 100 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(percentual, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{percentual}%</span>
              </div>
              <p className="text-sm">
                {horas}h {minutos}m de {slaHoras}h
              </p>
            </div>

            {/* Tempo restante */}
            {status !== "concluido" && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Tempo Restante:</p>
                <p className={`text-lg font-bold ${horasRestantes === 0 ? "text-red-500" : "text-foreground"}`}>
                  {horasRestantes > 0 ? `${horasRestantes}h` : "SLA Ultrapassado"}
                </p>
              </div>
            )}
          </>
        )}

        {status === "nao_iniciado" && (
          <p className="text-sm text-muted-foreground italic">O cálculo ainda não foi iniciado</p>
        )}
      </div>
    </div>
  )
}
