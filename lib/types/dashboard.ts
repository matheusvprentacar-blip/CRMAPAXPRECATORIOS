// ============================================
// TYPES - DASHBOARD ESTRATÉGICO (FASE 3)
// ============================================

export interface ComplexityMetrics {
  baixa: number
  media: number
  alta: number
  total: number
  percentuais: {
    baixa: number
    media: number
    alta: number
  }
}

export interface BottleneckItem {
  tipo_atraso: string
  total: number
  com_sla_estourado: number
  percentual: number
}

export interface PerformanceMetrics {
  tempo_medio_fila: number // horas
  tempo_medio_finalizar: number // horas
  sla_estourado: number
  total_em_calculo: number
  total_finalizados: number
}

export interface OperatorMetrics {
  operador_id: string
  operador_nome: string
  em_calculo: number
  finalizados: number
  com_atraso: number
  sla_estourado: number
}

export interface CriticalPrecatorio {
  id: string
  titulo: string
  numero_precatorio: string
  status: string
  responsavel_nome: string | null
  nivel_complexidade: 'baixa' | 'media' | 'alta' | null
  score_complexidade: number | null
  sla_status: string | null
  sla_horas: number | null
  tipo_atraso?: string | null
  impacto_atraso?: 'baixo' | 'medio' | 'alto' | null
  motivo_atraso_calculo?: string | null
  horas_em_fila: number | null
  score_criticidade: number
}

export interface DashboardMetrics {
  complexity: ComplexityMetrics
  bottlenecks: BottleneckItem[]
  performance: PerformanceMetrics
  operators: OperatorMetrics[]
  critical: CriticalPrecatorio[]
}
