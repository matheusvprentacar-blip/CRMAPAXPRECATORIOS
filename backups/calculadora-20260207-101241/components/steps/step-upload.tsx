"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { UploadExtractor } from "@/components/upload-extractor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface StepUploadProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  pdfUrl: string | null
  setPdfUrl: (url: string | null) => void
  precatorioId?: string
}

export function StepUpload({ dados, setDados, onCompletar, pdfUrl, setPdfUrl }: StepUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [extracted, setExtracted] = useState(false)

  const handleCompleteExtraction = (dadosExtraidos: any) => {
    setExtracted(true)
    onCompletar(dadosExtraidos)
  }

  const handleAvancar = () => {
    onCompletar({ pdfUrl, extracted })
  }

  return (
    <Card className="calc-card">
      <CardHeader>
        <CardTitle className="calc-title">Upload e Extração de Dados</CardTitle>
        <CardDescription className="calc-subtitle">
          Faça upload do PDF ou documento do precatório para extração automática de dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UploadExtractor
          dados={dados}
          setDados={setDados}
          pdfUrl={pdfUrl}
          setPdfUrl={setPdfUrl}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          onCompleteExtraction={handleCompleteExtraction}
        />

        {extracted && (
          <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              ✓ Dados extraídos com sucesso! Você pode revisar e editar nas próximas etapas.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={handleAvancar} disabled={isUploading}>
            Avançar
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
