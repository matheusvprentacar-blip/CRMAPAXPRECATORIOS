'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BotaoProcessarProps {
  precatorioId: string
  onSuccess?: (extracaoId: string) => void
}

export function BotaoProcessar({ precatorioId, onSuccess }: BotaoProcessarProps) {
  const [processando, setProcessando] = useState(false)

  async function handleProcessar() {
    setProcessando(true)

    try {
      const response = await fetch('/api/extract/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          precatorio_id: precatorioId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar documentos')
      }

      toast.success('Processamento iniciado!', {
        description: `${data.total_documentos} documento(s) sendo processado(s) pela IA`
      })

      if (onSuccess) {
        onSuccess(data.extracao_id)
      }

      // Recarregar página após 3 segundos para mostrar resultado
      setTimeout(() => {
        window.location.reload()
      }, 3000)

    } catch (error) {
      console.error('[Processar] Erro:', error)
      toast.error('Erro ao processar', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Button
      onClick={handleProcessar}
      disabled={processando}
      className="gap-2"
    >
      {processando ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processando...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Processar com IA
        </>
      )}
    </Button>
  )
}
