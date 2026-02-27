"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Send } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { ensureOpenLegalOpinionForPrecatorio } from "@/features/legal-opinion/request-from-precatorio"

interface FormSolicitarJuridicoProps {
  precatorioId: string
  onUpdate: () => void
}

const MOTIVOS = [
  { value: "PENHORA", label: "Penhora" },
  { value: "CESSAO", label: "Cessao" },
  { value: "HONORARIOS", label: "Honorarios" },
  { value: "HABILITACAO", label: "Habilitacao" },
  { value: "DUVIDA_BASE_INDICE", label: "Duvida sobre Base/Indice" },
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
      toast({ title: "Erro", description: "Selecione o motivo da solicitacao.", variant: "destructive" })
      return
    }
    if (!formData.descricao_bloqueio.trim()) {
      toast({ title: "Erro", description: "Descreva o bloqueio/duvida.", variant: "destructive" })
      return
    }

    try {
      setSending(true)
      const supabase = createBrowserClient()
      if (!supabase) return

      const motivoSelecionado = MOTIVOS.find((item) => item.value === formData.motivo)
      const { created } = await ensureOpenLegalOpinionForPrecatorio({
        precatorioId,
        motivo: formData.motivo,
        motivoLabel: motivoSelecionado?.label,
        descricao: formData.descricao_bloqueio,
      })

      const { error } = await supabase
        .from("precatorios")
        .update({
          status_kanban: "juridico",
          localizacao_kanban: "juridico",
          juridico_motivo: formData.motivo,
          juridico_descricao_bloqueio: formData.descricao_bloqueio,
          juridico_parecer_status: null,
          juridico_parecer_texto: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) throw error

      toast({
        title: "Solicitacao enviada",
        description: created
          ? "O precatorio foi enviado para analise juridica e registrado no painel de pareceres."
          : "O precatorio foi enviado para analise juridica. Ja existia um parecer juridico em aberto para este credito.",
      })

      setFormData({ motivo: "", descricao_bloqueio: "" })
      onUpdate()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nao foi possivel enviar a solicitacao."
      console.error("[Form Solicitar Juridico] Erro:", error)
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-900">Juridico</p>
        <p className="text-xs text-blue-700 mt-2">
          Use este formulario quando houver duvidas juridicas ou bloqueios que impecam o calculo de prosseguir.
          O precatorio sera movido para a coluna &quot;Juridico&quot; e aguardara parecer do setor juridico.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo da Solicitacao *</Label>
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
          <Label htmlFor="descricao_bloqueio">Descricao do Bloqueio/Duvida *</Label>
          <Textarea
            id="descricao_bloqueio"
            value={formData.descricao_bloqueio}
            onChange={(e) => setFormData({ ...formData, descricao_bloqueio: e.target.value })}
            placeholder="Descreva detalhadamente o bloqueio ou duvida juridica..."
            rows={6}
          />
          <p className="text-xs text-muted-foreground">Seja o mais especifico possivel para facilitar a analise.</p>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">Exemplos de situacoes</p>
        <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
          <li><strong>Penhora:</strong> Precatório possui penhora que afeta o cálculo</li>
          <li><strong>Cessao:</strong> Houve cessão de direitos que precisa ser validada</li>
          <li><strong>Honorarios:</strong> Duvida sobre percentual ou incidencia de honorarios</li>
          <li><strong>Habilitacao:</strong> Questoes sobre habilitacao de herdeiros</li>
          <li><strong>Base/Indice:</strong> Duvida sobre indice ou base de calculo</li>
        </ul>
      </div>

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
              Solicitar Juridico
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
