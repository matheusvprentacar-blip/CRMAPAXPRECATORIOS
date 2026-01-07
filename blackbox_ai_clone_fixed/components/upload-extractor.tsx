"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileUp, Loader2 } from "lucide-react"
import { extrairDadosDeTexto } from "@/lib/extrair-dados"

interface UploadExtractorProps {
  dados: any
  setDados: (dados: any) => void
  pdfUrl?: string | null
  setPdfUrl?: (url: string | null) => void
  isUploading: boolean
  setIsUploading: (value: boolean) => void
  onCompleteExtraction: (dadosExtraidos: any) => void
}

export function UploadExtractor({
  dados,
  setDados,
  pdfUrl,
  setPdfUrl,
  isUploading,
  setIsUploading,
  onCompleteExtraction,
}: UploadExtractorProps) {
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setFileName(file.name)

    try {
      if (file.type === "application/pdf") {
        const url = URL.createObjectURL(file)
        setPdfUrl?.(url)
      }

      const text = await file.text()
      const extraidos = extrairDadosDeTexto(text)

      const novosDados = {
        ...dados,
        ...extraidos,
      }

      setDados(novosDados)
      onCompleteExtraction(extraidos)
    } catch (error) {
      console.error("Erro ao processar arquivo:", error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-1">
        <Label className="text-sm font-medium">Upload de sentença ou planilha</Label>
        <p className="text-xs text-muted-foreground">
          Se você enviar um PDF ou arquivo de texto com os dados do precatório, tentaremos extrair automaticamente
          informações como número do processo, valor principal, juros, etc.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer text-xs hover:bg-accent">
          <FileUp className="h-4 w-4" />
          <span>Selecionar arquivo</span>
          <Input type="file" className="hidden" accept=".pdf,.txt,.csv,.doc,.docx" onChange={handleFileChange} />
        </label>

        {fileName && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</span>}

        {isUploading && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processando...
          </div>
        )}
      </div>

      {pdfUrl && (
        <p className="text-xs text-muted-foreground">
          Um PDF foi carregado. Ele será exibido ao lado da calculadora na aba apropriada.
        </p>
      )}
    </Card>
  )
}
