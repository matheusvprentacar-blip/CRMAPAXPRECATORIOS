"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Scale } from "@/components/icons"
import { getSupabase } from "@/lib/supabase/client"
import { ensureOpenLegalOpinionForPrecatorio } from "@/features/legal-opinion/request-from-precatorio"

interface ModalEnviarJuridicoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  precatorioId: string
  precatorioTitulo: string
  onSuccess: () => void
}

const MOTIVOS_JURIDICOS = [
  { value: "PENHORA", label: "Penhora Identificada" },
  { value: "CESSAO", label: "Cessao de Credito" },
  { value: "HONORARIOS", label: "Honorarios Contratuais" },
  { value: "HABILITACAO", label: "Habilitacao de Herdeiros" },
  { value: "DUVIDA_BASE_INDICE", label: "Duvida Base/Indice" },
  { value: "OUTROS", label: "Outros" },
]

export function ModalEnviarJuridico({
  open,
  onOpenChange,
  precatorioId,
  precatorioTitulo,
  onSuccess,
}: ModalEnviarJuridicoProps) {
  const [motivo, setMotivo] = useState<string>("")
  const [descricao, setDescricao] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!motivo) {
      setError("Por favor, selecione o motivo do envio")
      return
    }

    if (!descricao.trim()) {
      setError("A descricao do motivo e obrigatoria")
      return
    }

    if (descricao.trim().length < 10) {
      setError("A descricao deve ter pelo menos 10 caracteres")
      return
    }

    setLoading(true)
    setError("")

    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase nao disponivel")

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario nao autenticado")

      const motivoSelecionado = MOTIVOS_JURIDICOS.find((item) => item.value === motivo)
      await ensureOpenLegalOpinionForPrecatorio({
        precatorioId,
        motivo,
        motivoLabel: motivoSelecionado?.label,
        descricao: descricao.trim(),
        origemSolicitacao: "calculo",
      })

      const { error: updateError } = await supabase
        .from("precatorios")
        .update({
          status_kanban: "juridico",
          localizacao_kanban: "juridico",
          juridico_motivo: motivo,
          juridico_descricao_bloqueio: descricao.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (updateError) throw updateError

      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        usuario_id: user.id,
        tipo: "mudanca_status",
        descricao: `Enviado para Juridico: ${motivoSelecionado?.label || motivo}`,
        dados_novos: {
          motivo,
          descricao: descricao.trim(),
          origem: "fila_calculo",
        },
      })

      setMotivo("")
      setDescricao("")
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao registrar envio"
      console.error("[MODAL JURIDICO] Erro ao enviar:", err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Enviar para Juridico
          </DialogTitle>
          <DialogDescription>
            Isso movera o precatorio <span className="font-medium">{precatorioTitulo}</span> para a fila do Juridico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo Principal <span className="text-destructive">*</span>
            </Label>
            <Select
              value={motivo}
              onValueChange={(value) => {
                setMotivo(value)
                setError("")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_JURIDICOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descricao Detalhada <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="descricao"
              placeholder="Descreva o impedimento ou duvida juridica..."
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value)
                setError("")
              }}
              rows={4}
              className={error ? "border-destructive/40" : ""}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="rounded-lg bg-primary/15 dark:bg-primary/15 p-3 text-sm">
            <p className="text-primary dark:text-primary">
              <strong>Atencao:</strong> O precatorio saira da sua fila de calculo e ficara bloqueado ate o retorno do setor juridico.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !motivo || !descricao.trim() || descricao.trim().length < 10}
            className="bg-primary/15 hover:bg-primary/15 text-white"
          >
            {loading ? "Enviando..." : "Enviar para Juridico"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
