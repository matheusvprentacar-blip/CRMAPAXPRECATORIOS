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
    <Card>
      <CardHeader>
        <CardTitle>Upload e Extração de Dados</CardTitle>
        <CardDescription>
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
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
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
