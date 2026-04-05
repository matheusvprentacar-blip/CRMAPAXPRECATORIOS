"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2 } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export interface DuplicataInfo {
  id: string
  numero_precatorio: string | null
  numero_processo: string | null
  credor_nome: string
  status_kanban: string | null
  dono_usuario_id: string | null
  responsavel_nome: string | null
  updated_at: string | null
}

interface ModalDuplicataProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  duplicata: DuplicataInfo
  onPular: () => void
  onImportarMesmo: () => void
}

const DIAS_PARA_REDISTRIBUICAO = 90

function diasSemMovimentacao(updatedAt: string | null): number {
  if (!updatedAt) return 999
  const diff = Date.now() - new Date(updatedAt).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function ModalDuplicata({
  open,
  onOpenChange,
  duplicata,
  onPular,
  onImportarMesmo,
}: ModalDuplicataProps) {
  const dias = diasSemMovimentacao(duplicata.updated_at)
  const podeRedistribuir = dias >= DIAS_PARA_REDISTRIBUICAO

  const [operadores, setOperadores] = useState<{ id: string; nome: string }[]>([])
  const [novoResponsavel, setNovoResponsavel] = useState("")
  const [redistribuindo, setRedistribuindo] = useState(false)

  useEffect(() => {
    if (!open || !podeRedistribuir) return
    const fetchOperadores = async () => {
      const supabase = createBrowserClient()
      if (!supabase) return
      const { data } = await supabase
        .from("usuarios")
        .select("id, nome")
        .contains("role", ["operador_comercial"])
        .order("nome")
      setOperadores(data ?? [])
    }
    fetchOperadores()
  }, [open, podeRedistribuir])

  const handleRedistribuir = async () => {
    if (!novoResponsavel) {
      toast.error("Selecione um responsável.")
      return
    }
    setRedistribuindo(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não inicializado")

      const { error } = await supabase
        .from("precatorios")
        .update({
          dono_usuario_id: novoResponsavel,
          responsavel: novoResponsavel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", duplicata.id)

      if (error) throw new Error(error.message)
      toast.success("Precatório redistribuído com sucesso.")
      onPular()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redistribuir")
    } finally {
      setRedistribuindo(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Crédito Duplicado Detectado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <p className="font-semibold text-base">{duplicata.credor_nome}</p>
            {duplicata.numero_precatorio && (
              <p className="text-muted-foreground">Precatório: {duplicata.numero_precatorio}</p>
            )}
            {duplicata.numero_processo && (
              <p className="text-muted-foreground">Processo: {duplicata.numero_processo}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {duplicata.status_kanban ?? "—"}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Responsável</span>
                <p className="mt-0.5 font-medium">{duplicata.responsavel_nome ?? "Não distribuído"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Última movimentação</span>
                <p className={`mt-0.5 font-medium ${dias >= DIAS_PARA_REDISTRIBUICAO ? "text-red-600" : ""}`}>
                  há {dias} dias
                </p>
              </div>
            </div>
          </div>

          {podeRedistribuir && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Este crédito está há mais de {DIAS_PARA_REDISTRIBUICAO} dias sem movimentação.
                Você pode redistribuí-lo agora.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Novo responsável</Label>
                <Select value={novoResponsavel} onValueChange={setNovoResponsavel}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {operadores.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRedistribuir}
                disabled={redistribuindo || !novoResponsavel}
              >
                {redistribuindo && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Redistribuir e Pular Importação
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onPular}>
            Pular este registro
          </Button>
          <Button variant="default" onClick={onImportarMesmo}>
            Importar mesmo assim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
