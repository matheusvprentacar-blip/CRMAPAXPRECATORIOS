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
      const { createBrowserClient } = await import('@/lib/supabase/client')
      const supabase = createBrowserClient()
      if (!supabase) throw new Error('Cliente Supabase não inicializado')

      const { data, error } = await supabase.functions.invoke('ai-extract', {
        body: { precatorio_id: precatorioId },
      })

      if (error) {
        throw new Error(error.message || 'Erro ao processar documentos')
      }

      if (data.error) {
        throw new Error(data.error)
      }

      toast.success('Processamento iniciado!', {
        description: `${data.total_documentos || 0} documento(s) sendo processado(s) pela IA`
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
