"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Send } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"

interface FormParecerJuridicoProps {
  precatorioId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  precatorio: any
  onUpdate: () => void
}

const STATUS_PARECER = [
  { value: "APROVADO", label: "Aprovado", description: "Sem impedimentos, pode prosseguir" },
  { value: "AJUSTAR_DADOS", label: "Ajustar Dados", description: "Necessário ajustar informações antes de prosseguir" },
  { value: "IMPEDIMENTO", label: "Impedimento", description: "Há impedimento legal que bloqueia o precatório" },
  { value: "RISCO_ALTO", label: "Risco Alto", description: "Pode prosseguir mas com risco elevado" },
]

export function FormParecerJuridico({ precatorioId, precatorio, onUpdate }: FormParecerJuridicoProps) {
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    parecer_status: "",
    parecer_texto: "",
  })
  const [resultadoFinal, setResultadoFinal] = useState("reprovado")

  async function handleEnviarParecer() {
    if (!formData.parecer_status) {
      toast({ title: "Erro", description: "Selecione o status do parecer.", variant: "destructive" })
      return
    }
    if (!formData.parecer_texto.trim()) {
      toast({ title: "Erro", description: "Escreva o parecer jurídico.", variant: "destructive" })
      return
    }

    try {
      setSending(true)
      const supabase = createBrowserClient()
      if (!supabase) return

      let proximaColuna = 'pronto_calculo'
      if (formData.parecer_status === 'IMPEDIMENTO') {
        proximaColuna = 'reprovado'
      }

      const { error } = await supabase.from('precatorios').update({
        juridico_parecer_status: formData.parecer_status,
        juridico_parecer_texto: formData.parecer_texto,
        juridico_resultado_final: formData.parecer_status === 'IMPEDIMENTO' ? resultadoFinal : null,
        status_kanban: proximaColuna,
        localizacao_kanban: proximaColuna,
        updated_at: new Date().toISOString()
      }).eq('id', precatorioId)

      if (error) throw error

      toast({
        title: "Parecer enviado",
        description: "O parecer jurídico foi registrado com sucesso.",
      })

      setFormData({ parecer_status: "", parecer_texto: "" })
      setResultadoFinal("reprovado")
      onUpdate()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("[Form Parecer Jurídico] Erro:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o parecer.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Informação da Solicitação */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">Solicitação Recebida</p>
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Motivo:</p>
            <p className="text-sm font-medium">{precatorio.juridico_motivo || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Descrição:</p>
            <p className="text-sm">{precatorio.juridico_descricao_bloqueio || "-"}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="parecer_status">Status do Parecer *</Label>
          <Select
            value={formData.parecer_status}
            onValueChange={(value) => setFormData({ ...formData, parecer_status: value })}
          >
            <SelectTrigger id="parecer_status">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_PARECER.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <div>
                    <p className="font-medium">{status.label}</p>
                    <p className="text-xs text-muted-foreground">{status.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.parecer_status === "IMPEDIMENTO" && (
          <div className="space-y-2">
            <Label htmlFor="resultado_final">Resultado Final *</Label>
            <Select value={resultadoFinal} onValueChange={setResultadoFinal}>
              <SelectTrigger id="resultado_final">
                <SelectValue placeholder="Selecione o resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reprovado">Reprovado</SelectItem>
                <SelectItem value="nao_elegivel">Não elegível</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="parecer_texto">Parecer Jurídico *</Label>
          <Textarea
            id="parecer_texto"
            value={formData.parecer_texto}
            onChange={(e) => setFormData({ ...formData, parecer_texto: e.target.value })}
            placeholder="Escreva o parecer jurídico detalhado..."
            rows={8}
          />
          <p className="text-xs text-muted-foreground">
            Seja claro e objetivo. Inclua fundamentação legal se necessário.
          </p>
        </div>
      </div>

      {/* Orientações */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-900">📋 Orientações</p>
        <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li>
            <strong>Aprovado:</strong> O precatório retornará para &quot;Pronto para Cálculo&quot; e poderá prosseguir normalmente
          </li>
          <li>
            <strong>Ajustar Dados:</strong> Retorna para &quot;Pronto para Cálculo&quot; mas com observação de ajustes necessários
          </li>
          <li>
            <strong>Impedimento:</strong> O precatório irá para &quot;Reprovado&quot; ou &quot;Não elegível&quot;
          </li>
          <li>
            <strong>Risco Alto:</strong> Pode prosseguir mas com alerta de risco elevado
          </li>
        </ul>
      </div>

      {/* Exemplos */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">💡 Exemplo de Parecer</p>
        <p className="text-xs text-muted-foreground mt-2 italic">
          &quot;Após análise da documentação apresentada, verificou-se que a penhora incidente sobre o precatório foi
          devidamente registrada e homologada. O percentual de 30% deve ser destacado do valor líquido conforme
          determinação judicial de fls. 245. Não há impedimento para prosseguimento do cálculo, desde que observado
          o percentual mencionado. Parecer: APROVADO.&quot;
        </p>
      </div>

      {/* Botão Enviar */}
      <div className="flex justify-end">
        <Button onClick={handleEnviarParecer} disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Parecer
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
