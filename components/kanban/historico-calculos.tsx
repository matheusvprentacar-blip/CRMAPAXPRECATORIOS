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

  return (
    <div className="space-y-4">
      {/* Informação */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-900">📊 Histórico de Versões</p>
        <p className="text-xs text-blue-700 mt-1">
          Total de {calculos.length} versão(ões) de cálculo. A mais recente é a versão {calculos[0]?.versao}.
        </p>
      </div>

      {/* Lista de Cálculos */}
      <div className="space-y-3">
        {calculos.map((calculo, index) => (
          <div
            key={calculo.id}
            className={`p-4 rounded-lg border ${index === 0 ? "bg-green-50 border-green-200" : "bg-muted border-border"
              }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    Versão {calculo.versao}
                  </Badge>
                  {index === 0 && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      Atual
                    </Badge>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Data Base</p>
                    <p className="text-sm font-medium">
                      {new Date(calculo.data_base).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Valor Atualizado</p>
                    <p className="text-sm font-semibold text-primary">
                      {formatBR(calculo.valor_atualizado)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                    <p className="text-sm font-semibold text-blue-600">
                      {formatBR(calculo.saldo_liquido)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-sm">
                      {new Date(calculo.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {calculo.premissas_resumo && (
                  <div className="mt-3 p-3 bg-background rounded border">
                    <p className="text-xs font-medium text-muted-foreground">Premissas:</p>
                    <p className="text-xs mt-1">{calculo.premissas_resumo}</p>
                  </div>
                )}

                {calculo.premissas_json && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Ver detalhes técnicos (JSON)
                    </summary>
                    <pre className="text-xs mt-2 p-2 bg-background rounded border overflow-x-auto">
                      {JSON.stringify(calculo.premissas_json, null, 2)}
                    </pre>
                  </details>
                )}

                {calculo.criador_nome && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Criado por: {calculo.criador_nome}
                  </p>
                )}
              </div>

              {calculo.arquivo_pdf_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(calculo.arquivo_pdf_url!, "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comparação */}
      {calculos.length > 1 && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">📈 Comparação com Versão Anterior</p>
          <div className="mt-2 space-y-1 text-xs">
            {(() => {
              const atual = calculos[0]
              const anterior = calculos[1]
              const diffValor = atual.valor_atualizado - anterior.valor_atualizado
              const diffSaldo = atual.saldo_liquido - anterior.saldo_liquido
              const percValor = ((diffValor / anterior.valor_atualizado) * 100).toFixed(2)
              const percSaldo = ((diffSaldo / anterior.saldo_liquido) * 100).toFixed(2)

              return (
                <>
                  <p>
                    <strong>Valor Atualizado:</strong>{" "}
                    <span className={diffValor >= 0 ? "text-green-600" : "text-red-600"}>
                      {diffValor >= 0 ? "+" : ""}
                      {formatBR(diffValor)} ({percValor}%)
                    </span>
                  </p>
                  <p>
                    <strong>Saldo Líquido:</strong>{" "}
                    <span className={diffSaldo >= 0 ? "text-green-600" : "text-red-600"}>
                      {diffSaldo >= 0 ? "+" : ""}
                      {formatBR(diffSaldo)} ({percSaldo}%)
                    </span>
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
