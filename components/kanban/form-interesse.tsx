"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"

interface FormInteresseProps {
  precatorioId: string
  precatorio: any
  onUpdate: () => void
}

const INTERESSE_STATUS = [
  { value: "SEM_CONTATO", label: "Sem Contato", color: "text-gray-500" },
  { value: "CONTATO_EM_ANDAMENTO", label: "Contato em Andamento", color: "text-blue-500" },
  { value: "PEDIR_RETORNO", label: "Pedir Retorno", color: "text-yellow-500" },
  { value: "SEM_INTERESSE", label: "Sem Interesse", color: "text-red-500" },
  { value: "TEM_INTERESSE", label: "Tem Interesse", color: "text-green-500" },
]

export function FormInteresse({ precatorioId, precatorio, onUpdate }: FormInteresseProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    interesse_status: precatorio.interesse_status || "SEM_CONTATO",
    interesse_observacao: precatorio.interesse_observacao || "",
  })

  async function handleSave() {
    try {
      setSaving(true)
      const supabase = createBrowserClient()
      if (!supabase) return

      const { error } = await supabase
        .from("precatorios")
        .update({
          interesse_status: formData.interesse_status,
          interesse_observacao: formData.interesse_observacao,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) throw error

      toast({
        title: "Interesse atualizado",
        description: "As informações de triagem foram salvas com sucesso.",
      })

      onUpdate()
    } catch (error) {
      console.error("[Form Interesse] Erro:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as informações.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const statusAtual = INTERESSE_STATUS.find((s) => s.value === formData.interesse_status)

  return (
    <div className="space-y-6">
      {/* Status Atual */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">Status Atual</p>
        <p className={`text-lg font-semibold mt-1 ${statusAtual?.color}`}>
          {statusAtual?.label || "Não definido"}
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="interesse_status">Status do Interesse *</Label>
          <Select value={formData.interesse_status} onValueChange={(value) => setFormData({ ...formData, interesse_status: value })}>
            <SelectTrigger id="interesse_status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERESSE_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <span className={status.color}>{status.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Triagem
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
