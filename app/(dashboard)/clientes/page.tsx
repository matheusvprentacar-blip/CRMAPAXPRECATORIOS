"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, User, MapPin, Phone, Mail, FileText, ChevronRight, Calculator, Clock } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { CredorView, Precatorio } from "@/lib/types/database"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"

type PrecatorioResumo = Precatorio & {
  status_kanban?: string | null
  localizacao_kanban?: string | null
  dono_usuario_id?: string | null
  responsavel?: string | null
}

type CredorResumo = CredorView & {
  valor_total_atualizado: number
  ultimo_status: string | null
  ultimo_precatorio_valor: number
}

export default function ClientsPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [credores, setCredores] = useState<CredorResumo[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // role pode vir como string ou array (evita includes quebrar)
  const roles = useMemo(() => {
    const r: any = profile?.role
    return Array.isArray(r) ? r : r ? [r] : []
  }, [profile?.role])

  const isAdmin = roles.includes("admin")

  // Modal states
  const [selectedCredor, setSelectedCredor] = useState<CredorResumo | null>(null)
  const [credorForm, setCredorForm] = useState<Partial<CredorResumo>>({})
  const [credorPrecatorios, setCredorPrecatorios] = useState<Precatorio[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCredor, setEditingCredor] = useState(false)
  const [savingCredor, setSavingCredor] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    loadCredores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isAdmin])

  function aggregateCredores(items: PrecatorioResumo[]): CredorResumo[] {
    const map = new Map<string, CredorResumo>()

    items.forEach((precatorio) => {
      const cpf = precatorio.credor_cpf_cnpj?.trim() || null
      const nome = (precatorio.credor_nome || "Credor sem nome").trim()
      const cidade = precatorio.credor_cidade || null
      const uf = precatorio.credor_uf || null
      const telefone = precatorio.credor_telefone || null
      const email = precatorio.credor_email || null

      const key =
        cpf && !cpf.startsWith("SEM_CPF") ? `cpf:${cpf}` : `nome:${nome}|${cidade || ""}|${uf || ""}`

      const valorPrincipal = Number(precatorio.valor_principal || 0)
      const valorAtualizado = Number(precatorio.valor_atualizado || precatorio.valor_principal || 0)
      const dataUltimo = precatorio.updated_at || precatorio.created_at || null
      const statusAtual = precatorio.status_kanban || precatorio.localizacao_kanban || precatorio.status || null

      if (!map.has(key)) {
        map.set(key, {
          id_unico: key,
          credor_nome: nome,
          credor_cpf_cnpj: cpf,
          cidade,
          uf,
          telefone,
          email,
          total_precatorios: 0,
          valor_total_principal: 0,
          valor_total_atualizado: 0,
          ultimo_precatorio_data: null,
          ultimo_status: null,
          ultimo_precatorio_valor: 0,
        })
      }

      const entry = map.get(key)!
      entry.total_precatorios += 1
      entry.valor_total_principal += valorPrincipal
      entry.valor_total_atualizado += valorAtualizado

      if (!entry.telefone && telefone) entry.telefone = telefone
      if (!entry.email && email) entry.email = email
      if (!entry.cidade && cidade) entry.cidade = cidade
      if (!entry.uf && uf) entry.uf = uf

      if (!entry.ultimo_precatorio_data || (dataUltimo && new Date(dataUltimo) > new Date(entry.ultimo_precatorio_data))) {
        entry.ultimo_precatorio_data = dataUltimo
        entry.ultimo_precatorio_valor = valorAtualizado
        entry.ultimo_status = statusAtual
      }
    })

    return Array.from(map.values()).sort((a, b) => b.valor_total_atualizado - a.valor_total_atualizado)
  }

  async function loadCredores() {
    setLoading(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        setLoading(false)
        return
      }

      let query = supabase
        .from("precatorios")
        .select(
          "id, credor_nome, credor_cpf_cnpj, credor_cidade, credor_uf, credor_telefone, credor_email, valor_principal, valor_atualizado, status, status_kanban, localizacao_kanban, created_at, updated_at, dono_usuario_id, responsavel"
        )
        .order("updated_at", { ascending: false })

      if (!isAdmin && profile?.id) {
        query = query.or(`dono_usuario_id.eq.${profile.id},responsavel.eq.${profile.id}`)
      }

      const { data, error } = await query

      if (error) {
        console.error("Erro ao carregar credores:", error)
        setCredores([])
        return
      }

      setCredores(aggregateCredores((data || []) as PrecatorioResumo[]))
    } catch (error) {
      console.error("Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  async function openCredorDetails(credor: CredorResumo) {
    setSelectedCredor(credor)
    setCredorForm({
      credor_nome: credor.credor_nome,
      credor_cpf_cnpj: credor.credor_cpf_cnpj,
      telefone: credor.telefone,
      email: credor.email,
      cidade: credor.cidade,
      uf: credor.uf,
    })
    setEditingCredor(false)
    setModalOpen(true)
    setLoadingDetails(true)

    try {
      const supabase = getSupabase()
      if (!supabase) {
        setLoadingDetails(false)
        return
      }

      let query = supabase.from("precatorios").select("*").order("created_at", { ascending: false })

      if (!isAdmin && profile?.id) {
        query = query.or(`dono_usuario_id.eq.${profile.id},responsavel.eq.${profile.id}`)
      }

      if (credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith("SEM_CPF")) {
        query = query.eq("credor_cpf_cnpj", credor.credor_cpf_cnpj)
      } else {
        query = query.eq("credor_nome", credor.credor_nome)
      }

      const { data, error } = await query
      if (error) throw error

      setCredorPrecatorios(data || [])
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error)
    } finally {
      setLoadingDetails(false)
    }
  }

  async function handleSaveCredor() {
    if (!selectedCredor) return
    const nome = (credorForm.credor_nome || "").trim()
    if (!nome) {
      toast.error("Informe o nome do cliente.")
      return
    }

    const payload = {
      credor_nome: nome,
      credor_cpf_cnpj: credorForm.credor_cpf_cnpj || null,
      credor_telefone: credorForm.telefone || null,
      credor_email: credorForm.email || null,
      credor_cidade: credorForm.cidade || null,
      credor_uf: credorForm.uf || null,
      updated_at: new Date().toISOString(),
    }

    setSavingCredor(true)
    try {
      const supabase = getSupabase()
      if (!supabase) return

      let query = supabase.from("precatorios").update(payload)

      if (selectedCredor.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")) {
        query = query.eq("credor_cpf_cnpj", selectedCredor.credor_cpf_cnpj)
      } else {
        query = query.eq("credor_nome", selectedCredor.credor_nome)
        if (selectedCredor.cidade) query = query.eq("credor_cidade", selectedCredor.cidade)
        if (selectedCredor.uf) query = query.eq("credor_uf", selectedCredor.uf)
      }

      const { error } = await query
      if (error) throw error

      toast.success("Dados do cliente atualizados.")
      setEditingCredor(false)
      await loadCredores()

      const updatedCredor: CredorResumo = {
        ...selectedCredor,
        credor_nome: payload.credor_nome,
        credor_cpf_cnpj: payload.credor_cpf_cnpj,
        telefone: payload.credor_telefone,
        email: payload.credor_email,
        cidade: payload.credor_cidade,
        uf: payload.credor_uf,
      }
      await openCredorDetails(updatedCredor)
    } catch (error: any) {
      console.error("Erro ao atualizar cliente:", error)
      toast.error(error?.message || "Erro ao atualizar cliente.")
    } finally {
      setSavingCredor(false)
    }
  }

  const filteredCredores = credores.filter((c) => {
    const term = searchTerm.toLowerCase()
    return (
      c.credor_nome?.toLowerCase().includes(term) ||
      c.credor_cpf_cnpj?.includes(searchTerm) ||
      c.cidade?.toLowerCase().includes(term) ||
      c.ultimo_status?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.telefone?.toLowerCase().includes(term)
    )
  })

  const resumo = useMemo(() => {
    let totalCarteira = 0
    let totalPrecatorios = 0
    let ultimaAtualizacao: string | null = null

    credores.forEach((credor) => {
      totalCarteira += credor.valor_total_atualizado || credor.valor_total_principal || 0
      totalPrecatorios += credor.total_precatorios || 0
      if (credor.ultimo_precatorio_data) {
        if (!ultimaAtualizacao || new Date(credor.ultimo_precatorio_data) > new Date(ultimaAtualizacao)) {
          ultimaAtualizacao = credor.ultimo_precatorio_data
        }
      }
    })

    return { totalCarteira, totalPrecatorios, ultimaAtualizacao }
  }, [credores])

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })

  const formatStatus = (value?: string | null) => {
    if (!value) return "N/I"
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const statusClass = (value?: string | null) => {
    switch (value) {
      case "proposta_negociacao":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30"
      case "proposta_aceita":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30"
      case "calculo_andamento":
      case "em_calculo":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/30"
      case "analise_processual_inicial":
        return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-500/30"
      default:
        return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-700/25 dark:text-zinc-200 dark:border-zinc-700/40"
    }
  }

  return (
    <div className="w-full max-w-[100vw] px-4 lg:px-6 py-6 space-y-8">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
          <p className="text-muted-foreground">Base consolidada de credores e histórico de processos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 px-4 py-3 rounded-xl dark:bg-zinc-900/70 dark:border-zinc-800/60">
            <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase">Total de Clientes</span>
              <span className="text-xl font-bold text-orange-700 dark:text-orange-300">{credores.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 px-4 py-3 rounded-xl dark:bg-zinc-900/70 dark:border-zinc-800/60">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Total de Precatórios</span>
              <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{resumo.totalPrecatorios}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl dark:bg-zinc-900/70 dark:border-zinc-800/60">
            <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Carteira Atualizada</span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                R$ {formatCurrency(resumo.totalCarteira)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card className="border border-zinc-200/70 dark:border-zinc-800/60 bg-white/90 dark:bg-zinc-900/70 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ, cidade ou status..."
                className="pl-9 w-full bg-white/80 dark:bg-zinc-900/70"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="text-xs text-muted-foreground md:ml-auto">
              {resumo.ultimaAtualizacao ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Última atualização: {new Date(resumo.ultimaAtualizacao).toLocaleDateString("pt-BR")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Última atualização: —
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="border-t border-zinc-200/60 dark:border-zinc-800/60">
              {/* ✅ aqui está o “fix” principal: scroll horizontal para não cortar colunas */}
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <TableRow className="border-b border-zinc-200/60 dark:border-zinc-800/60">
                      <TableHead className="whitespace-nowrap">Credor</TableHead>
                      <TableHead className="whitespace-nowrap">Status atual</TableHead>
                      <TableHead className="hidden md:table-cell whitespace-nowrap">Contatos</TableHead>
                      <TableHead className="hidden lg:table-cell whitespace-nowrap">Última mov.</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Qtd. Precatórios</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Carteira atualizada</TableHead>
                      <TableHead className="w-[70px]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredCredores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          Nenhum cliente encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCredores.map((credor) => (
                        <TableRow
                          key={credor.id_unico}
                          className="cursor-pointer hover:bg-muted/40 dark:hover:bg-zinc-800/30 transition-colors"
                          onClick={() => openCredorDetails(credor)}
                        >
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-0.5 max-w-[420px]">
                              <span className="font-medium truncate">{credor.credor_nome}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith("SEM_CPF")
                                  ? credor.credor_cpf_cnpj
                                  : "CPF não informado"}
                              </span>
                              {credor.cidade && (
                                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3" /> {credor.cidade}/{credor.uf}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`whitespace-nowrap ${statusClass(credor.ultimo_status)}`}>
                              {formatStatus(credor.ultimo_status)}
                            </Badge>
                          </TableCell>

                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col gap-1 min-w-[220px]">
                              {credor.telefone ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" /> <span className="truncate">{credor.telefone}</span>
                                </div>
                              ) : null}
                              {credor.email ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" /> <span className="truncate">{credor.email}</span>
                                </div>
                              ) : null}
                              {!credor.telefone && !credor.email ? <span className="text-muted-foreground">-</span> : null}
                            </div>
                          </TableCell>

                          <TableCell className="hidden lg:table-cell">
                            {credor.ultimo_precatorio_data ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                {new Date(credor.ultimo_precatorio_data).toLocaleDateString("pt-BR")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono whitespace-nowrap">
                              {credor.total_precatorios}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="min-w-[220px]">
                              <div className="font-semibold text-emerald-600 whitespace-nowrap">
                                {credor.valor_total_atualizado ? `R$ ${formatCurrency(credor.valor_total_atualizado)}` : "R$ 0,00"}
                              </div>
                              {credor.ultimo_precatorio_valor ? (
                                <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                                  Último: R$ {formatCurrency(credor.ultimo_precatorio_valor)}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                openCredorDetails(credor)
                              }}
                              aria-label="Abrir detalhes do cliente"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* dica visual de scroll (só aparece quando precisa) */}
              <div className="px-4 py-2 text-[11px] text-muted-foreground border-t border-zinc-200/60 dark:border-zinc-800/60">
                Dica: se a tabela ficar maior que a tela, role horizontalmente para ver todas as colunas.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditingCredor(false)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCredor?.credor_nome}</DialogTitle>
            <DialogDescription>
              CPF/CNPJ:{" "}
              {selectedCredor?.credor_cpf_cnpj && !selectedCredor?.credor_cpf_cnpj.startsWith("SEM_CPF")
                ? selectedCredor.credor_cpf_cnpj
                : "Não informado"}
            </DialogDescription>

            <div className="flex items-center gap-2 pt-2">
              {!editingCredor ? (
                <Button variant="outline" size="sm" onClick={() => setEditingCredor(true)}>
                  Editar dados
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditingCredor(false)} disabled={savingCredor}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveCredor} disabled={savingCredor}>
                    {savingCredor ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Dados do cliente</CardDescription>
                <CardTitle className="text-lg">Informações gerais</CardTitle>
              </CardHeader>

              <CardContent className="p-4 pt-0">
                {editingCredor ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Nome</Label>
                      <Input
                        value={credorForm.credor_nome || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, credor_nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>CPF/CNPJ</Label>
                      <Input
                        value={credorForm.credor_cpf_cnpj || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, credor_cpf_cnpj: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={credorForm.telefone || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, telefone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={credorForm.email || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={credorForm.cidade || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, cidade: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>UF</Label>
                      <Input value={credorForm.uf || ""} onChange={(e) => setCredorForm({ ...credorForm, uf: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{selectedCredor?.credor_nome || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-medium">
                        {selectedCredor?.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")
                          ? selectedCredor.credor_cpf_cnpj
                          : "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{selectedCredor?.telefone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedCredor?.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cidade</p>
                      <p className="font-medium">{selectedCredor?.cidade || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">UF</p>
                      <p className="font-medium">{selectedCredor?.uf || "—"}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardDescription>Total Processos</CardDescription>
                  <CardTitle className="text-2xl">{selectedCredor?.total_precatorios}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardDescription>Carteira Atualizada</CardDescription>
                  <CardTitle className="text-2xl text-emerald-600">
                    {(selectedCredor?.valor_total_atualizado || selectedCredor?.valor_total_principal)
                      ? `R$ ${(selectedCredor!.valor_total_atualizado || selectedCredor!.valor_total_principal).toLocaleString("pt-BR", {
                          notation: "compact",
                        })}`
                      : "R$ 0"}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardDescription>Último status</CardDescription>
                  <CardTitle className="text-lg">
                    <Badge variant="outline" className={statusClass(selectedCredor?.ultimo_status)}>
                      {formatStatus(selectedCredor?.ultimo_status)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-2">
                    {selectedCredor?.ultimo_precatorio_data
                      ? new Date(selectedCredor.ultimo_precatorio_data).toLocaleDateString("pt-BR")
                      : "Sem movimentação"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Histórico de Processos
              </h3>

              {loadingDetails ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {credorPrecatorios.map((precatorio, index) => (
                    <Card
                      key={precatorio.id}
                      className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500/40 group relative overflow-hidden"
                      onClick={() => {
                        setModalOpen(false)
                        router.push(`/precatorios/detalhes?id=${precatorio.id}`)
                      }}
                    >
                      <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors" />

                      <CardContent className="p-5 relative z-10 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="flex flex-col items-center justify-center min-w-[2.5rem]">
                              <span className="text-3xl font-black text-muted-foreground/20 group-hover:text-orange-500/40 transition-colors">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Processo
                                  </span>
                                  <Badge
                                    variant={precatorio.status === "concluido" ? "default" : "outline"}
                                    className="text-[10px] h-4 px-1 rounded-sm"
                                  >
                                    {(precatorio.status || "N/I").replace("_", " ")}
                                  </Badge>
                                </div>
                                <p className="font-medium text-sm font-mono truncate" title={precatorio.numero_processo || ""}>
                                  {precatorio.numero_processo || "N/A"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{precatorio.numero_precatorio || "Prec. N/A"}</p>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                  <Calculator className="w-3 h-3" /> Valor
                                </label>
                                <span className="font-bold text-lg text-emerald-600">
                                  {precatorio.valor_atualizado || precatorio.valor_principal
                                    ? `R$ ${(precatorio.valor_atualizado || precatorio.valor_principal).toLocaleString("pt-BR", {
                                        minimumFractionDigits: 2,
                                      })}`
                                    : "R$ 0,00"}
                                </span>
                              </div>

                              <div className="md:col-span-2 flex items-center justify-between pt-2 border-t border-border/50 mt-1">
                                <div className="text-xs text-muted-foreground">
                                  Criado em: {new Date(precatorio.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-xs font-medium text-orange-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Ver detalhes <ChevronRight className="w-3 h-3" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
