"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"

interface ModalNovaTentativaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  precatorioId: string
  credorNome: string
  onSuccess: () => void
}

type Tipo = "ligacao" | "whatsapp" | "email"
type Resultado = "atendeu" | "nao_atendeu" | "interessado" | "sem_interesse"

const TIPO_LABELS: Record<Tipo, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
}

const RESULTADO_LABELS: Record<Resultado, string> = {
  atendeu: "Atendeu",
  nao_atendeu: "Não atendeu",
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
}

export function ModalNovaTentativa({
  open,
  onOpenChange,
  precatorioId,
  credorNome,
  onSuccess,
}: ModalNovaTentativaProps) {
  const { profile } = useAuth()
  const [tipo, setTipo] = useState<Tipo | "">("")
  const [resultado, setResultado] = useState<Resultado | "">("")
  const [observacoes, setObservacoes] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!tipo || !resultado) {
      toast.error("Preencha o tipo e o resultado da tentativa.")
      return
    }
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não inicializado")

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const { error: insertError } = await supabase
        .from("atendimento_tentativas")
        .insert({
          precatorio_id: precatorioId,
          agente_id: user.id,
          agente_nome: profile?.nome ?? user.email ?? "Agente",
          tipo,
          resultado,
          observacoes: observacoes.trim() || null,
        })

      if (insertError) throw new Error(insertError.message)

      const novoStatus =
        resultado === "interessado"
          ? "interessado"
          : resultado === "sem_interesse"
          ? "sem_interesse"
          : "em_contato"

      const { error: updateError } = await supabase
        .from("precatorios")
        .update({ status_atendimento: novoStatus })
        .eq("id", precatorioId)

      if (updateError) throw new Error(updateError.message)

      toast.success("Tentativa registrada com sucesso.")
      setTipo("")
      setResultado("")
      setObservacoes("")
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar tentativa")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Tentativa de Contato</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{credorNome}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Canal de contato</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o canal..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABELS) as Tipo[]).map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Resultado</Label>
            <Select value={resultado} onValueChange={(v) => setResultado(v as Resultado)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o resultado..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RESULTADO_LABELS) as Resultado[]).map((r) => (
                  <SelectItem key={r} value={r}>{RESULTADO_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Notas sobre a tentativa de contato..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
