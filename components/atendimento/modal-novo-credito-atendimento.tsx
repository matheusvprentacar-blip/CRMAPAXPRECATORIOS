"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { maskProcesso } from "@/lib/masks"
import { toast } from "sonner"
import { useUsuariosCache } from "@/hooks/use-usuarios-cache"
import { OPERATOR_TAG_OPTIONS, isAtendimentoOperatorRole, normalizeOperatorTag, type OperatorTag } from "@/lib/users/operator-tag"

interface ModalNovoCreditoAtendimentoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ModalNovoCreditoAtendimento({
  open,
  onOpenChange,
  onSuccess,
}: ModalNovoCreditoAtendimentoProps) {
  const [credor, setCredor] = useState("")
  const [cpf, setCpf] = useState("")
  const [telefone, setTelefone] = useState("")
  const [processo, setProcesso] = useState("")
  const [numero, setNumero] = useState("")
  const [numeroOficio, setNumeroOficio] = useState("")
  const [tribunal, setTribunal] = useState("")
  const [devedor, setDevedor] = useState("")
  const [advogado, setAdvogado] = useState("")
  const [natureza, setNatureza] = useState("")
  const [dataExpedicao, setDataExpedicao] = useState("")
  const [valorPrincipal, setValorPrincipal] = useState("")
  const [operatorTagFilter, setOperatorTagFilter] = useState<OperatorTag | "todos">("todos")
  const [responsavelId, setResponsavelId] = useState("")
  const [saving, setSaving] = useState(false)
  const { usuarios, loading: loadingUsuarios } = useUsuariosCache()

  const operadores = useMemo(
    () =>
      usuarios.filter((usuario) => {
        if (!isAtendimentoOperatorRole(usuario.role)) return false
        if (operatorTagFilter === "todos") return true
        return normalizeOperatorTag(usuario.operator_tag) === operatorTagFilter
      }),
    [operatorTagFilter, usuarios]
  )

  const reset = () => {
    setCredor("")
    setCpf("")
    setTelefone("")
    setProcesso("")
    setNumero("")
    setNumeroOficio("")
    setTribunal("")
    setDevedor("")
    setAdvogado("")
    setNatureza("")
    setDataExpedicao("")
    setValorPrincipal("")
    setOperatorTagFilter("todos")
    setResponsavelId("")
  }

  const handleSave = async () => {
    if (!credor.trim()) {
      toast.error("Nome do credor é obrigatório.")
      return
    }
    if (!responsavelId) {
      toast.error("Selecione o operador que receberá este crédito.")
      return
    }
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não inicializado")

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const payload = {
        criado_por: user.id,
        credor_nome: credor.trim(),
        credor_cpf_cnpj: cpf.trim() || null,
        credor_telefone: telefone.trim() || null,
        numero_processo: processo.trim() || null,
        numero_precatorio: numero.trim() || null,
        numero_oficio: numeroOficio.trim() || null,
        tribunal: tribunal.trim() || null,
        devedor: devedor.trim() || null,
        advogado_nome: advogado.trim() || null,
        natureza: natureza.trim() || null,
        data_expedicao: dataExpedicao || null,
        valor_principal: valorPrincipal ? Number(valorPrincipal) : 0,
        status: "novo",
        status_kanban: "triagem_interesse",
        localizacao_kanban: "triagem_interesse",
        titulo: numero.trim()
          ? `Precatório ${numero.trim()} - ${credor.trim()}`
          : `Lead - ${credor.trim()}`,
        origem: "atendimento",
        status_atendimento: "na_fila",
        responsavel: responsavelId,
        dono_usuario_id: responsavelId,
        distribuido_por_admin: true,
        distribuido_por_admin_id: user.id,
        distribuido_por_admin_em: new Date().toISOString(),
      }

      const { error } = await supabase.from("precatorios").insert([payload] as never)
      if (error) {
        if (error.code === "23505") throw new Error("Número de precatório já cadastrado.")
        throw new Error(error.message)
      }

      toast.success("Crédito criado e enviado para a fila de atendimento.")
      reset()
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar crédito")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Crédito — Setor de Atendimento</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Nome do Credor <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Nome completo do credor"
              value={credor}
              onChange={(e) => setCredor(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>CPF / CNPJ</Label>
            <Input
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Número do Processo</Label>
            <Input
              placeholder="0000000-00.0000.0.00.0000"
              value={processo}
              onChange={(e) => setProcesso(maskProcesso(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label>Número do Precatório</Label>
            <Input
              placeholder="Ex: 0001234-56.2020"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Número do Ofício</Label>
            <Input
              placeholder="Número do ofício"
              value={numeroOficio}
              onChange={(e) => setNumeroOficio(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Tribunal</Label>
            <Input
              placeholder="Ex: TRF1, TJ-SP"
              value={tribunal}
              onChange={(e) => setTribunal(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Devedor (Ente Público)</Label>
            <Input
              placeholder="Ex: União Federal"
              value={devedor}
              onChange={(e) => setDevedor(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Advogado</Label>
            <Input
              placeholder="Nome do advogado"
              value={advogado}
              onChange={(e) => setAdvogado(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Natureza</Label>
            <Input
              placeholder="Ex: Alimentar, Comum"
              value={natureza}
              onChange={(e) => setNatureza(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Data de Expedição</Label>
            <Input
              type="date"
              value={dataExpedicao}
              onChange={(e) => setDataExpedicao(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Valor Principal (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={valorPrincipal}
              onChange={(e) => setValorPrincipal(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Tag Operacional</Label>
            <select
              value={operatorTagFilter}
              onChange={(e) => {
                setOperatorTagFilter(e.target.value as OperatorTag | "todos")
                setResponsavelId("")
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="todos">Todos os operadores</option>
              {OPERATOR_TAG_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Distribuir para Operador <span className="text-destructive">*</span></Label>
            <select
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={loadingUsuarios}
            >
              <option value="">
                {loadingUsuarios ? "Carregando operadores..." : "Selecione um operador"}
              </option>
              {operadores.map((operador) => (
                <option key={operador.id} value={operador.id}>
                  {operador.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              O crédito já entra no atendimento com responsável definido, sem sair desta área.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar e Enviar para Fila
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
