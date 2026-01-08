'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

interface UploadExcelButtonProps {
  onSuccess?: (data: any) => void
}

export function UploadExcelButton({ onSuccess }: UploadExcelButtonProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      // Criar FormData
      const formData = new FormData()
      formData.append('file', file)

      // Enviar para API de análise
      const response = await fetch('/api/import/excel/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao analisar planilha')
      }

      toast.success('Planilha analisada!', {
        description: `${data.analise?.total_precatorios || 0} precatórios detectados`
      })

      if (onSuccess) {
        onSuccess(data)
      }

    } catch (error) {
      console.error('[Upload Excel] Erro:', error)
      toast.error('Erro ao processar', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setUploading(false)
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4" />
            Importar Excel
          </>
        )}
      </Button>
    </>
  )
}
