"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"

interface ModalAtrasoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  precatorioId: string
  precatorioTitulo: string
  onSuccess: () => void
}

const TIPOS_ATRASO = [
  { value: "titular_falecido", label: "Titular Falecido" },
  { value: "penhora", label: "Penhora Identificada" },
  { value: "cessao_parcial", label: "Cessão Parcial de Crédito" },
  { value: "doc_incompleta", label: "Documentação Incompleta" },
  { value: "duvida_juridica", label: "Dúvida Jurídica" },
  { value: "aguardando_cliente", label: "Aguardando Informações do Cliente" },
  { value: "outro", label: "Outro" },
]

const IMPACTOS = [
  { value: "baixo", label: "Baixo (até 24h)" },
  { value: "medio", label: "Médio (2-5 dias)" },
  { value: "alto", label: "Alto (>5 dias)" },
]

const SUGESTOES_POR_TIPO: Record<string, string[]> = {
  titular_falecido: [
    "Aguardando certidão de óbito",
    "Aguardando documentação de espólio",
    "Necessário inventário judicial",
  ],
  penhora: [
    "Penhora identificada - necessário análise jurídica",
    "Aguardando liberação judicial da penhora",
  ],
  cessao_parcial: [
    "Cessão parcial de crédito - aguardando documentação",
    "Necessário contrato de cessão atualizado",
  ],
  doc_incompleta: [
    "Documentação incompleta - solicitado ao cliente",
    "Faltam comprovantes de pagamento",
    "Necessário atualização cadastral",
  ],
  duvida_juridica: [
    "Dúvida sobre cálculo de juros - consultando jurídico",
    "Necessário parecer jurídico sobre descontos",
  ],
  aguardando_cliente: [
    "Aguardando informações adicionais do cliente",
    "Cliente não respondeu contato",
  ],
  outro: [
    "Processo sem número - impossível validar",
    "Múltiplos descontos - necessário esclarecimento",
  ],
}

export function ModalAtraso({ open, onOpenChange, precatorioId, precatorioTitulo, onSuccess }: ModalAtrasoProps) {
  const [tipoAtraso, setTipoAtraso] = useState<string>("")
  const [impacto, setImpacto] = useState<string>("")
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const sugestoesAtuais = tipoAtraso ? SUGESTOES_POR_TIPO[tipoAtraso] || [] : []

  const handleSubmit = async () => {
    // Validações
    if (!tipoAtraso) {
      setError("Por favor, selecione o tipo do atraso")
      return
    }

    if (!impacto) {
      setError("Por favor, selecione o impacto estimado")
      return
    }

    if (!motivo.trim()) {
      setError("O motivo do atraso é obrigatório")
      return
    }

    if (motivo.trim().length < 10) {
      setError("O motivo deve ter pelo menos 10 caracteres")
      return
    }

    setLoading(true)
    setError("")

    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase não disponível")

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      // Atualizar precatório com motivo do atraso estruturado
      const { error: updateError } = await supabase
        .from("precatorios")
        .update({
          tipo_atraso: tipoAtraso,
          impacto_atraso: impacto,
          motivo_atraso_calculo: motivo.trim(),
          data_atraso_calculo: new Date().toISOString(),
          registrado_atraso_por: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (updateError) throw updateError

      // Registrar atividade (o trigger já registra na timeline, mas vamos adicionar detalhes)
      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        usuario_id: user.id,
        tipo: "atualizacao",
        descricao: `Atraso reportado: ${TIPOS_ATRASO.find((t) => t.value === tipoAtraso)?.label}`,
        dados_novos: {
          tipo_atraso: tipoAtraso,
          impacto_atraso: impacto,
          motivo: motivo.trim(),
        },
      })

      console.log("[MODAL ATRASO] Atraso estruturado registrado com sucesso")

      // Limpar e fechar
      setTipoAtraso("")
      setImpacto("")
      setMotivo("")
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error("[MODAL ATRASO] Erro ao registrar atraso:", err)
      setError(err.message || "Erro ao registrar atraso")
    } finally {
      setLoading(false)
    }
  }

  const handleSugestaoClick = (sugestao: string) => {
    setMotivo(sugestao)
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Reportar Atraso no Cálculo
          </DialogTitle>
          <DialogDescription>
            Precatório: <span className="font-medium">{precatorioTitulo}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo do Atraso */}
          <div className="space-y-2">
            <Label htmlFor="tipo">
              Tipo do Atraso <span className="text-red-500">*</span>
            </Label>
            <Select value={tipoAtraso} onValueChange={(value) => {
              setTipoAtraso(value)
              setError("")
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo do atraso" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ATRASO.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Impacto Estimado */}
          <div className="space-y-2">
            <Label htmlFor="impacto">
              Impacto Estimado <span className="text-red-500">*</span>
            </Label>
            <Select value={impacto} onValueChange={(value) => {
              setImpacto(value)
              setError("")
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o impacto estimado" />
              </SelectTrigger>
              <SelectContent>
                {IMPACTOS.map((imp) => (
                  <SelectItem key={imp.value} value={imp.value}>
                    {imp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição do Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Descrição do Motivo <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="motivo"
              placeholder="Descreva detalhadamente o motivo do atraso (mínimo 10 caracteres)..."
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value)
                setError("")
              }}
              rows={4}
              className={error ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground">{motivo.length} caracteres</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Sugestões Rápidas */}
          {sugestoesAtuais.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Sugestões Rápidas (clique para usar):</Label>
              <div className="flex flex-wrap gap-2">
                {sugestoesAtuais.map((sugestao) => (
                  <Button
                    key={sugestao}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSugestaoClick(sugestao)}
                    className="text-xs"
                  >
                    {sugestao}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-3 text-sm">
            <p className="text-orange-800 dark:text-orange-200">
              <strong>Importante:</strong> O precatório permanecerá na fila mantendo sua posição original. Você poderá
              processá-lo posteriormente.
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
            disabled={loading || !tipoAtraso || !impacto || !motivo.trim() || motivo.trim().length < 10}
          >
            {loading ? "Registrando..." : "Registrar Atraso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
