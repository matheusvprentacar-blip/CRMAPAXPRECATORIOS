"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, ScrollText } from "@/components/icons"

const ESCRITURAS_STATUS_LABELS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  pendente_assinatura: "Pendente de assinatura",
  concluido: "Concluído",
}

interface AbaEscriturasProps {
  precatorioId: string
  canEdit: boolean
  onUpdate: () => void
  initialStatus?: string | null
  initialObservacoes?: string | null
}

export function AbaEscrituras({
  precatorioId,
  canEdit,
  onUpdate,
  initialStatus,
  initialObservacoes,
}: AbaEscriturasProps) {
  const [statusEscrituras, setStatusEscrituras] = useState(initialStatus || "nao_iniciado")
  const [observacoes, setObservacoes] = useState(initialObservacoes || "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatusEscrituras(initialStatus || "nao_iniciado")
  }, [initialStatus])

  useEffect(() => {
    setObservacoes(initialObservacoes || "")
  }, [initialObservacoes])

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const { error } = await supabase
        .from("precatorios")
        .update({
          status_escrituras: statusEscrituras,
          observacoes_escrituras: observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) throw error

      toast({
        title: "Escrituras atualizadas",
        description: "Dados de escrituras salvos com sucesso.",
      })
      onUpdate()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Não foi possível salvar os dados de escrituras."
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Escrituras
        </CardTitle>
        <CardDescription>
          Controle da fase de escrituras antes do fechamento final do crédito.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Status das escrituras</Label>
          <Select value={statusEscrituras} onValueChange={setStatusEscrituras} disabled={!canEdit || saving}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ESCRITURAS_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            rows={6}
            placeholder="Registre detalhes de assinatura, cartório, pendências e validações."
            disabled={!canEdit || saving}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!canEdit || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar escrituras
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
