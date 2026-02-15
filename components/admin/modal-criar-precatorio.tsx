import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createBrowserClient } from "@/lib/supabase/client"
import { maskProcesso } from "@/lib/masks"

interface PrecatorioData {
  credor_nome?: string
  advogado_nome?: string
  valor_principal?: number
  numero_precatorio?: string
  numero_oficio?: string
  tribunal?: string
  credor_cpf_cnpj?: string
  credor_telefone?: string
  numero_processo?: string
  natureza?: string
  data_expedicao?: string
  file_url?: string
  raw_text?: string
}

interface ModalCriarPrecatorioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: PrecatorioData | null
  onSuccess?: () => void
}

export function ModalCriarPrecatorio({
  open,
  onOpenChange,
  data,
  onSuccess,
}: ModalCriarPrecatorioProps) {
  const safeData: PrecatorioData = data ?? {}

  const [credor, setCredor] = useState("")
  const [advogado, setAdvogado] = useState("")
  const [valor, setValor] = useState("")
  const [numero, setNumero] = useState("")
  const [numeroOficio, setNumeroOficio] = useState("")
  const [tribunal, setTribunal] = useState("")
  const [cpf, setCpf] = useState("")
  const [telefone, setTelefone] = useState("")
  const [processo, setProcesso] = useState("")
  const [dataExpedicao, setDataExpedicao] = useState("")
  const [natureza, setNatureza] = useState("")
  const [extractAccepted, setExtractAccepted] = useState(false)
  const [saving, setSaving] = useState(false)

  const hasExtractedSnapshot = Boolean(
    safeData.credor_nome ||
      safeData.advogado_nome ||
      safeData.valor_principal ||
      safeData.numero_precatorio ||
      safeData.numero_oficio ||
      safeData.tribunal ||
      safeData.credor_cpf_cnpj ||
      safeData.numero_processo ||
      safeData.natureza ||
      safeData.data_expedicao ||
      safeData.raw_text
  )

  useEffect(() => {
    setCredor("")
    setAdvogado("")
    setValor("")
    setNumero("")
    setNumeroOficio("")
    setTribunal("")
    setCpf("")
    setTelefone("")
    setProcesso("")
    setDataExpedicao("")
    setNatureza("")
    setExtractAccepted(false)
  }, [data, open])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) {
        throw new Error("Cliente Supabase nao inicializado")
      }

      if (!credor || !numero) {
        throw new Error("Preencha os campos obrigatorios: Credor e Numero do Precatorio.")
      }
      if (hasExtractedSnapshot && !extractAccepted) {
        throw new Error("Confirme a leitura dos dados OCR antes de finalizar a importacao.")
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Usuario nao autenticado")
      }

      const payload = {
        criado_por: user.id,
        credor_nome: credor,
        advogado_nome: advogado || null,
        valor_principal: Number(valor) || 0,
        numero_precatorio: numero,
        numero_oficio: numeroOficio || null,
        tribunal,
        credor_cpf_cnpj: cpf || null,
        credor_telefone: telefone || null,
        numero_processo: processo || null,
        data_expedicao: dataExpedicao || null,
        natureza: natureza || null,
        status: "novo",
        titulo: `Precatorio ${numero} - ${credor}`,
        raw_text: safeData.raw_text || null,
        file_url: safeData.file_url || null,
      }

      const { error } = await supabase.from("precatorios").insert([payload])
      if (error) {
        if (error.code === "23505") {
          throw new Error("Numero de precatorio ja cadastrado")
        }
        throw new Error(error.message)
      }

      toast.success("Precatorio criado com sucesso")
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar precatorio"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Precatorio a partir da extracao OCR</DialogTitle>
          <DialogDescription>
            Revise os dados extraidos e o documento original antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden min-h-0">
          <div className="space-y-4 py-4 overflow-y-auto pr-2">
            {hasExtractedSnapshot && (
              <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                <div className="text-sm font-medium">Dados encontrados no OCR (somente leitura)</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Credor: {safeData.credor_nome || "Nao identificado"}</p>
                  <p>Advogado: {safeData.advogado_nome || "Nao identificado"}</p>
                  <p>CPF/CNPJ: {safeData.credor_cpf_cnpj || "Nao identificado"}</p>
                  <p>Valor principal: {safeData.valor_principal ?? "Nao identificado"}</p>
                  <p>Numero do precatorio: {safeData.numero_precatorio || "Nao identificado"}</p>
                  <p>Processo de origem: {safeData.numero_processo || "Nao identificado"}</p>
                  <p>Numero do oficio: {safeData.numero_oficio || "Nao identificado"}</p>
                  <p>Tribunal: {safeData.tribunal || "Nao identificado"}</p>
                  <p>Natureza: {safeData.natureza || "Nao identificado"}</p>
                  <p>Data de expedicao: {safeData.data_expedicao || "Nao identificado"}</p>
                </div>
                <label className="flex items-center gap-2 text-xs pt-2">
                  <input
                    type="checkbox"
                    checked={extractAccepted}
                    onChange={(e) => setExtractAccepted(e.target.checked)}
                  />
                  Confirmo que revisei os dados do OCR e vou preencher manualmente os campos abaixo.
                </label>
              </div>
            )}

            <div className="space-y-2">
              <Label>Credor</Label>
              <Input value={credor} onChange={(e) => setCredor(e.target.value)} placeholder="Nome do Credor" />
            </div>
            <div className="space-y-2">
              <Label>Advogado</Label>
              <Input
                value={advogado}
                onChange={(e) => setAdvogado(e.target.value)}
                placeholder="Nome do Advogado"
              />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ do Credor</Label>
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label>Telefone do Credor</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Valor Principal</Label>
              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Numero do Precatorio</Label>
              <Input
                value={numero}
                onChange={(e) => setNumero(maskProcesso(e.target.value))}
                placeholder="0000000-00.0000.0.00.0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Numero do Processo (Originario)</Label>
              <Input
                value={processo}
                onChange={(e) => setProcesso(maskProcesso(e.target.value))}
                placeholder="Numeracao unica"
              />
            </div>
            <div className="space-y-2">
              <Label>Numero do Oficio</Label>
              <Input
                value={numeroOficio}
                onChange={(e) => setNumeroOficio(e.target.value)}
                placeholder="12345/2025"
              />
            </div>
            <div className="space-y-2">
              <Label>Data da Expedicao</Label>
              <Input
                type="date"
                value={dataExpedicao}
                onChange={(e) => setDataExpedicao(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tribunal</Label>
              <Input value={tribunal} onChange={(e) => setTribunal(e.target.value)} placeholder="TJSP" />
            </div>
            <div className="space-y-2">
              <Label>Natureza</Label>
              <Input value={natureza} onChange={(e) => setNatureza(e.target.value)} placeholder="Alimentar ou Comum" />
            </div>

            {safeData.raw_text && (
              <div className="mt-6 pt-4 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Texto extraido (debug)</Label>
                <textarea
                  className="w-full text-xs p-2 border rounded h-32 bg-muted text-muted-foreground"
                  readOnly
                  value={safeData.raw_text}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/50 overflow-hidden flex flex-col">
            <div className="bg-muted p-2 border-b text-xs font-medium text-center">Visualizacao do Documento</div>
            <div className="flex-1 relative">
              {safeData.file_url ? (
                <iframe
                  src={safeData.file_url}
                  className="absolute inset-0 w-full h-full"
                  scrolling="yes"
                  title="Document Viewer"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                  Nenhum arquivo visualizavel disponivel.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || (hasExtractedSnapshot && !extractAccepted)}>
            {saving ? "Salvando..." : "Salvar Precatorio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
