"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Send } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface FormSolicitarJuridicoProps {
  precatorioId: string
  onUpdate: () => void
}

const MOTIVOS = [
  { value: "PENHORA", label: "Penhora" },
  { value: "CESSAO", label: "Cessão" },
  { value: "HONORARIOS", label: "Honorários" },
  { value: "HABILITACAO", label: "Habilitação" },
  { value: "DUVIDA_BASE_INDICE", label: "Dúvida sobre Base/Índice" },
  { value: "OUTROS", label: "Outros" },
]

export function FormSolicitarJuridico({ precatorioId, onUpdate }: FormSolicitarJuridicoProps) {
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    motivo: "",
    descricao_bloqueio: "",
  })

  async function handleSolicitar() {
    if (!formData.motivo) {
      toast({ title: "Erro", description: "Selecione o motivo da solicitação.", variant: "destructive" })
      return
    }
    if (!formData.descricao_bloqueio.trim()) {
      toast({ title: "Erro", description: "Descreva o bloqueio/dúvida.", variant: "destructive" })
      return
    }

    try {
      setSending(true)
      const supabase = createBrowserClient()
      if (!supabase) return

      // Validate status (optional, but good)
      // Assuming UI prevents usage if not in correct state, sticking to Update

      const { error } = await supabase.from('precatorios').update({
        status_kanban: 'analise_juridica',
        juridico_motivo: formData.motivo,
        juridico_descricao_bloqueio: formData.descricao_bloqueio,
        juridico_parecer_status: null,
        juridico_parecer_texto: null,
        updated_at: new Date().toISOString()
      }).eq('id', precatorioId)

      if (error) throw error

      toast({
        title: "Solicitação enviada",
        description: "O precatório foi enviado para análise jurídica.",
      })

      setFormData({ motivo: "", descricao_bloqueio: "" })
      onUpdate()
    } catch (error: any) {
      console.error("[Form Solicitar Jurídico] Erro:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Informação */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-900">⚖️ Análise Jurídica</p>
        <p className="text-xs text-blue-700 mt-2">
          Use este formulário quando houver dúvidas jurídicas ou bloqueios que impeçam o cálculo de prosseguir.
          O precatório será movido para a coluna "Análise Jurídica" e aguardará parecer do setor jurídico.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo da Solicitação *</Label>
          <Select value={formData.motivo} onValueChange={(value) => setFormData({ ...formData, motivo: value })}>
            <SelectTrigger id="motivo">
              <SelectValue placeholder="Selecione o motivo" />
            </SelectTrigger>
            <SelectContent>
              {MOTIVOS.map((motivo) => (
                <SelectItem key={motivo.value} value={motivo.value}>
                  {motivo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao_bloqueio">Descrição do Bloqueio/Dúvida *</Label>
          <Textarea
            id="descricao_bloqueio"
            value={formData.descricao_bloqueio}
            onChange={(e) => setFormData({ ...formData, descricao_bloqueio: e.target.value })}
            placeholder="Descreva detalhadamente o bloqueio ou dúvida jurídica..."
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Seja o mais específico possível para facilitar a análise do setor jurídico.
          </p>
        </div>
      </div>

      {/* Exemplos */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">💡 Exemplos de Situações</p>
        <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
          <li><strong>Penhora:</strong> Precatório possui penhora que afeta o cálculo</li>
          <li><strong>Cessão:</strong> Houve cessão de direitos que precisa ser validada</li>
          <li><strong>Honorários:</strong> Dúvida sobre percentual ou incidência de honorários</li>
          <li><strong>Habilitação:</strong> Questões sobre habilitação de herdeiros</li>
          <li><strong>Base/Índice:</strong> Dúvida sobre qual índice ou base de cálculo aplicar</li>
        </ul>
      </div>

      {/* Botão Solicitar */}
      <div className="flex justify-end">
        <Button onClick={handleSolicitar} disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Solicitar Análise Jurídica
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
