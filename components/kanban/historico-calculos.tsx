"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, Download } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface HistoricoCalculosProps {
  precatorioId: string
}

interface Calculo {
  id: string
  versao: number
  data_base: string
  valor_atualizado: number
  saldo_liquido: number
  premissas_resumo: string | null
  premissas_json: any
  arquivo_pdf_url: string | null
  created_by: string
  created_at: string
  criador_nome?: string
}

export function HistoricoCalculos({ precatorioId }: HistoricoCalculosProps) {
  const [calculos, setCalculos] = useState<Calculo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCalculos()
  }, [precatorioId])

  async function loadCalculos() {
    try {
      setLoading(true)
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data: calculos, error } = await supabase
        .from('precatorio_calculos')
        .select(`
          id,
          versao,
          data_base,
          valor_atualizado,
          saldo_liquido,
          premissas_resumo,
          premissas_json,
          arquivo_pdf_url,
          created_by,
          created_at
        `)
        .eq('precatorio_id', precatorioId)
        .order('versao', { ascending: false })

      if (error) throw error

      setCalculos(calculos || [])
    } catch (error) {
      console.error("[Histórico Cálculos] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatBR = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (calculos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum cálculo exportado ainda.</p>
        <p className="text-xs mt-2">
          Os cálculos exportados aparecerão aqui com histórico de versões.
        </p>
      </div>
    )
  }

  const latest = calculos[0]

  return (
    <div className="space-y-4">
      {/* Informação */}
      <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900/60 dark:text-blue-100">
        <p className="text-sm font-medium">📊 Histórico de Versões</p>
        <p className="text-xs mt-1 text-blue-700 dark:text-blue-300">
          Total de {calculos.length} versão(ões) de cálculo. Exibindo somente a última (versão {latest?.versao}).
        </p>
      </div>

      {/* Última versão */}
      <div className="p-4 rounded-lg border bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="default">Versão {latest.versao}</Badge>
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800"
              >
                Atual
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Data Base</p>
                <p className="text-sm font-medium">
                  {new Date(latest.data_base).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Valor Atualizado</p>
                <p className="text-sm font-semibold text-primary">
                  {formatBR(latest.valor_atualizado)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                  {formatBR(latest.saldo_liquido)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm">
                  {new Date(latest.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            {latest.premissas_resumo && (
              <div className="mt-3 p-3 rounded border bg-background/80 dark:bg-background/40">
                <p className="text-xs font-medium text-muted-foreground">Premissas:</p>
                <p className="text-xs mt-1">{latest.premissas_resumo}</p>
              </div>
            )}

            {latest.premissas_json && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Ver detalhes técnicos (JSON)
                </summary>
                <pre className="text-xs mt-2 p-2 rounded border bg-background/80 dark:bg-background/40 overflow-x-auto">
                  {JSON.stringify(latest.premissas_json, null, 2)}
                </pre>
              </details>
            )}

            {latest.criador_nome && (
              <p className="text-xs text-muted-foreground mt-2">
                Criado por: {latest.criador_nome}
              </p>
            )}
          </div>

          {latest.arquivo_pdf_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(latest.arquivo_pdf_url!, "_blank")}
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
