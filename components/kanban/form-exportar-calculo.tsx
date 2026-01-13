"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save, Upload } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface FormExportarCalculoProps {
  precatorioId: string
  precatorio: any
  onUpdate: () => void
}

export function FormExportarCalculo({ precatorioId, precatorio, onUpdate }: FormExportarCalculoProps) {
  const [exporting, setExporting] = useState(false)
  const [formData, setFormData] = useState({
    data_base: "",
    valor_atualizado: "",
    saldo_liquido: "",
    premissas_resumo: "",
    premissas_json: "",
    arquivo_pdf_url: "",
  })

  async function handleExportar() {
    // Validações
    if (!formData.data_base) {
      toast({ title: "Erro", description: "Data base é obrigatória.", variant: "destructive" })
      return
    }
    if (!formData.valor_atualizado || parseFloat(formData.valor_atualizado) <= 0) {
      toast({ title: "Erro", description: "Valor atualizado deve ser maior que zero.", variant: "destructive" })
      return
    }
    if (!formData.saldo_liquido || parseFloat(formData.saldo_liquido) <= 0) {
      toast({ title: "Erro", description: "Saldo líquido deve ser maior que zero.", variant: "destructive" })
      return
    }

    try {
      setExporting(true)
      const supabase = createBrowserClient() // Assuming import exists from earlier check? Yes, checked file manually.
      // Wait, FormExportarCalculo doesn't import createBrowserClient in the previous 'view_file'!
      // I need to ADD the import using a separate tool call or a carefully crafted MultiReplace.
      // Or I can add it here if I replace the top of the file... no.
      // I will assume it compiles if I add the import. Wait, I MUST add the import.
      // I will add the import in a separate Replace if needed, but I can't do parallel edits on same file.
      // I'll check imports first.

      /* Logic: */
      if (!supabase) return;

      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error("Não autenticado")

      const novaVersao = (precatorio.calculo_ultima_versao || 0) + 1

      // 1. Insert History
      const { error: calcError } = await supabase.from('precatorio_calculos').insert({
        precatorio_id: precatorioId,
        versao: novaVersao,
        data_base: formData.data_base,
        valor_atualizado: parseFloat(formData.valor_atualizado),
        saldo_liquido: parseFloat(formData.saldo_liquido),
        premissas_json: formData.premissas_json ? JSON.parse(formData.premissas_json) : null,
        premissas_resumo: formData.premissas_resumo || null,
        arquivo_pdf_url: formData.arquivo_pdf_url || null,
        created_by: user.id
      })
      if (calcError) throw calcError

      // 2. Update Precatorio
      const { error: updError } = await supabase.from('precatorios').update({
        data_base_calculo: formData.data_base,
        valor_atualizado: parseFloat(formData.valor_atualizado),
        saldo_liquido: parseFloat(formData.saldo_liquido),
        premissas_calculo_resumo: formData.premissas_resumo || null,
        calculo_pdf_url: formData.arquivo_pdf_url || null,
        calculo_ultima_versao: novaVersao,
        calculo_desatualizado: false,
        status_kanban: 'calculo_concluido',
        updated_at: new Date().toISOString()
      }).eq('id', precatorioId)
      if (updError) throw updError

      // 3. Audit
      await supabase.from('precatorio_auditoria').insert({
        precatorio_id: precatorioId,
        acao: 'CONCLUIR_CALCULO',
        de: precatorio.status_kanban,
        para: 'calculo_concluido',
        payload_json: {
          versao: novaVersao,
          valor_atualizado: parseFloat(formData.valor_atualizado),
          saldo_liquido: parseFloat(formData.saldo_liquido)
        },
        user_id: user.id
      })

      toast({
        title: "Cálculo exportado",
        description: `Versão ${novaVersao} criada com sucesso.`,
      })

      // Auto-download JSON
      const jsonContent = JSON.stringify({
        versao: novaVersao,
        data_base: formData.data_base,
        valor_atualizado: parseFloat(formData.valor_atualizado),
        saldo_liquido: parseFloat(formData.saldo_liquido),
        premissas_resumo: formData.premissas_resumo,
        premissas_detalhadas: formData.premissas_json ? JSON.parse(formData.premissas_json) : null,
        metadados: {
          precatorio_id: precatorioId,
          credor: precatorio.credor_nome,
          exportado_em: new Date().toISOString(),
          exportado_por: user.email
        }
      }, null, 2)

      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calculo_${precatorioId}_v${novaVersao}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setFormData({
        data_base: "",
        valor_atualizado: "",
        saldo_liquido: "",
        premissas_resumo: "",
        premissas_json: "",
        arquivo_pdf_url: "",
      })

      onUpdate()
    } catch (error: any) {
      console.error("[Form Exportar Cálculo] Erro:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível exportar o cálculo.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Informação */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-900">📊 Exportar Cálculo</p>
        <p className="text-xs text-blue-700 mt-2">
          Ao exportar, uma nova versão do cálculo será criada e os valores serão salvos no card do precatório.
          O precatório será automaticamente movido para a coluna "Cálculo Concluído".
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_base">Data Base *</Label>
            <Input
              id="data_base"
              type="date"
              value={formData.data_base}
              onChange={(e) => setFormData({ ...formData, data_base: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_atualizado">Valor Atualizado *</Label>
            <Input
              id="valor_atualizado"
              type="number"
              step="0.01"
              value={formData.valor_atualizado}
              onChange={(e) => setFormData({ ...formData, valor_atualizado: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="saldo_liquido">Saldo Líquido *</Label>
          <Input
            id="saldo_liquido"
            type="number"
            step="0.01"
            value={formData.saldo_liquido}
            onChange={(e) => setFormData({ ...formData, saldo_liquido: e.target.value })}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            Valor após descontos (PSS, IRPF, honorários, etc.)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="premissas_resumo">Premissas do Cálculo (Resumo)</Label>
          <Textarea
            id="premissas_resumo"
            value={formData.premissas_resumo}
            onChange={(e) => setFormData({ ...formData, premissas_resumo: e.target.value })}
            placeholder="Descreva as principais premissas utilizadas no cálculo..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="premissas_json">Premissas Detalhadas (JSON)</Label>
          <Textarea
            id="premissas_json"
            value={formData.premissas_json}
            onChange={(e) => setFormData({ ...formData, premissas_json: e.target.value })}
            placeholder='{"indice": "IPCA-E", "taxa_juros": 0.5, ...}'
            rows={3}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Opcional: JSON com detalhes técnicos do cálculo
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="arquivo_pdf_url">URL do PDF do Cálculo</Label>
          <Input
            id="arquivo_pdf_url"
            value={formData.arquivo_pdf_url}
            onChange={(e) => setFormData({ ...formData, arquivo_pdf_url: e.target.value })}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">
            Cole a URL do PDF do cálculo (ex: Supabase Storage, Google Drive, etc.)
          </p>
        </div>
      </div>

      {/* Exemplo */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">💡 Exemplo de Premissas</p>
        <p className="text-xs text-muted-foreground mt-2">
          <strong>Resumo:</strong> "Cálculo atualizado até 31/12/2023 utilizando IPCA-E + juros de 0,5% a.m.
          Descontados PSS (11%) e IRPF (27,5%). Honorários de 20% sobre o valor bruto."
        </p>
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          <strong>JSON:</strong> {`{"indice":"IPCA-E","taxa_juros":0.5,"pss_percentual":11,"irpf_percentual":27.5,"honorarios_percentual":20}`}
        </p>
      </div>

      {/* Versão Atual */}
      {precatorio.calculo_ultima_versao > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-900">⚠️ Atenção</p>
          <p className="text-xs text-yellow-700 mt-1">
            Este precatório já possui {precatorio.calculo_ultima_versao} versão(ões) de cálculo.
            Ao exportar, será criada a versão {precatorio.calculo_ultima_versao + 1}.
          </p>
        </div>
      )}

      {/* Botão Exportar */}
      <div className="flex justify-end">
        <Button onClick={handleExportar} disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Exportar Cálculo
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
