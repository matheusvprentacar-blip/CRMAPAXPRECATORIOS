import type { Dispatch, SetStateAction } from "react"

export interface StepPropsBase {
  dados: Record<string, unknown>
  setDados: Dispatch<SetStateAction<Record<string, unknown>>>
  onCompletar: (resultado?: Record<string, unknown>) => void

  voltar: () => void

  pdfUrl: string | null
  setPdfUrl: Dispatch<SetStateAction<string | null>>

  resultadosEtapas: Record<string, unknown>[]
  setResultadosEtapas: Dispatch<SetStateAction<Record<string, unknown>[]>>
}
