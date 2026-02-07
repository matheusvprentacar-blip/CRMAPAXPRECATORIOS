import type { Dispatch, SetStateAction } from "react"

export interface StepPropsBase {
  dados: any
  setDados: Dispatch<SetStateAction<any>>
  onCompletar: (resultado?: any) => void

  voltar: () => void

  pdfUrl: string | null
  setPdfUrl: Dispatch<SetStateAction<string | null>>

  resultadosEtapas: any[]
  setResultadosEtapas: Dispatch<SetStateAction<any[]>>
}
