"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Loader2, Printer, CheckCircle2, Percent, Save, Edit, User, Scale } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Textarea } from "@/components/ui/textarea"
import { ProposalConfigModal } from "./proposal-config-modal"
import { Settings } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"

interface AbaPropostaProps {
    precatorioId: string
    precatorio: any
    onUpdate: () => void
    userRole: string[] | string | null
    currentUserId?: string | null
}

type Herdeiro = {
    id: string
    nome_completo: string
    cpf?: string | null
    percentual_participacao?: number | null
}

export function AbaProposta({
    precatorioId,
    precatorio,
    onUpdate,
    userRole,
    currentUserId,
}: AbaPropostaProps) {
    const { user, profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [savingProposta, setSavingProposta] = useState(false)
    const [savingAceite, setSavingAceite] = useState(false)
    const [propostaAceita, setPropostaAceita] = useState<boolean>(!!precatorio?.proposta_aceita)
    const [dataAceite, setDataAceite] = useState<string>(precatorio?.data_aceite_proposta ? String(precatorio.data_aceite_proposta).slice(0, 10) : "")
    const [propostaAceitaId, setPropostaAceitaId] = useState<string>(precatorio?.proposta_aceita_id || "")
    const [propostasList, setPropostasList] = useState<any[]>([])
    const [herdeiros, setHerdeiros] = useState<Herdeiro[]>([])
    const [herdeirosLoading, setHerdeirosLoading] = useState(false)

    // Estados separados para Credor e Advogado
    const [percentualCredor, setPercentualCredor] = useState<number | string>(
        precatorio.dados_calculo?.proposta_escolhida_percentual
            ? adjustPercent(precatorio.dados_calculo.proposta_escolhida_percentual)
            : ""
    )
    const [percentualAdvogado, setPercentualAdvogado] = useState<number | string>(
        precatorio.dados_calculo?.proposta_advogado_percentual
            ? adjustPercent(precatorio.dados_calculo.proposta_advogado_percentual)
            : ""
    )

    const [isEditing, setIsEditing] = useState(false)
    const [showPrintDialog, setShowPrintDialog] = useState(false)

    // Estado para edição da descrição
    const [showDescriptionModal, setShowDescriptionModal] = useState(false)
    const [descriptionText, setDescriptionText] = useState("A presente proposta visa a cessão total e definitiva dos direitos creditórios oriundos do processo judicial acima identificado.")
    const [pendingPrintType, setPendingPrintType] = useState<"credor" | "honorarios" | null>(null)

    // Estado para configuração do modelo
    const [showConfigModal, setShowConfigModal] = useState(false)

    useEffect(() => {
        setPropostaAceita(!!precatorio?.proposta_aceita)
        setDataAceite(precatorio?.data_aceite_proposta ? String(precatorio.data_aceite_proposta).slice(0, 10) : "")
        setPropostaAceitaId(precatorio?.proposta_aceita_id || "")
    }, [precatorio?.proposta_aceita, precatorio?.data_aceite_proposta, precatorio?.proposta_aceita_id])

    useEffect(() => {
        async function loadHerdeiros() {
            if (!precatorioId) return
            setHerdeirosLoading(true)
            try {
                const supabase = createBrowserClient()
                if (!supabase) return

                const { data, error } = await supabase
                    .from("precatorio_herdeiros")
                    .select("id, nome_completo, cpf, percentual_participacao")
                    .eq("precatorio_id", precatorioId)
                    .order("created_at", { ascending: true })

                if (error) throw error
                setHerdeiros(data || [])
            } catch (error: any) {
                console.error("[AbaProposta] Erro ao carregar herdeiros:", error)
                toast({
                    title: "Erro ao carregar herdeiros",
                    description: error.message || "Nao foi possivel carregar os herdeiros.",
                    variant: "destructive",
                })
            } finally {
                setHerdeirosLoading(false)
            }
        }

        loadHerdeiros()
    }, [precatorioId])

    useEffect(() => {
        async function loadPropostas() {
            try {
                const supabase = createBrowserClient()
                if (!supabase) return
                const { data, error } = await supabase
                    .from("propostas")
                    .select("id, valor_proposta, percentual_desconto, status, created_at")
                    .eq("precatorio_id", precatorioId)
                    .order("created_at", { ascending: false })

                if (error) {
                    console.error("[Propostas] Erro ao carregar lista:", error)
                    return
                }

                setPropostasList(data || [])
            } catch (err) {
                console.error("[Propostas] Erro ao buscar propostas:", err)
            }
        }

        if (precatorioId) {
            loadPropostas()
        }
    }, [precatorioId])

    // Valores Base
    const saldoLiquidoCredor = precatorio.saldo_liquido || 0
    const honorariosValor = precatorio.honorarios_valor || 0
    const hasHerdeiros = herdeiros.length > 0
    const totalCotas = herdeiros.reduce((sum, h) => sum + Number(h.percentual_participacao || 0), 0)
    const cotasOk = Math.abs(totalCotas - 100) <= 0.01

    const tetoPercentual = adjustPercent(precatorio.proposta_maior_percentual || 0)
    const tetoMaximoCredor = tetoPercentual > 0 ? tetoPercentual : 100

    const clampCredorPercentual = (valor: number) => {
        if (!Number.isFinite(valor)) return valor
        return Math.min(Math.max(valor, 0), tetoMaximoCredor)
    }

    const handlePercentualCredorChange = (valor: string) => {
        if (valor === "") {
            setPercentualCredor("")
            return
        }
        const numeric = Number(valor)
        if (Number.isNaN(numeric)) {
            setPercentualCredor(valor)
            return
        }
        const clamped = clampCredorPercentual(numeric)
        setPercentualCredor(clamped === numeric ? valor : clamped.toString())
    }

    // Cálculos em tempo real
    const valorPropostaCredor = saldoLiquidoCredor * (Number(percentualCredor) / 100)
    const valorPropostaAdvogado = honorariosValor * (Number(percentualAdvogado) / 100)

    const valorPropostaCredorFmt = formatCurrency(valorPropostaCredor)
    const valorPropostaAdvogadoFmt = formatCurrency(valorPropostaAdvogado)

    // Handlers de Negociacao
    async function saveNegociacao() {
        if (propostaAceita) {
            toast({
                title: "Proposta bloqueada",
                description: "A proposta foi aceita e nao pode mais ser alterada.",
                variant: "destructive",
            })
            return
        }
        if (!isOperadorComercial || !isResponsavelComercial) {
            toast({
                title: "Sem permissao",
                description: "A proposta so pode ser ajustada pelo operador comercial responsavel.",
                variant: "destructive",
            })
            return
        }
        const pCredor = Number(percentualCredor)
        const pAdvogado = Number(percentualAdvogado)

        if (hasHerdeiros && !cotasOk) {
            toast({
                title: "Cotas dos herdeiros incompletas",
                description: "As cotas dos herdeiros devem somar 100% para gerar propostas.",
                variant: "destructive",
            })
            return
        }

        if (tetoPercentual > 0 && pCredor > tetoPercentual + 0.01) {
            toast({
                title: "Valor Credor acima do permitido",
                description: `A proposta do credor nao pode exceder o teto de ${tetoPercentual.toFixed(2)}%.`,
                variant: "destructive",
            })
            return
        }

        if (pCredor <= 0 && !percentualAdvogado) {
            if (pAdvogado <= 0) {
                toast({
                    title: "Valores invalidos",
                    description: "Defina pelo menos uma proposta valida.",
                    variant: "destructive",
                })
                return
            }
        }

        setSavingProposta(true)
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            const { data: { user } } = await supabase.auth.getUser()

            const novosDadosCalculo = {
                ...precatorio.dados_calculo,
                proposta_escolhida_percentual: pCredor > 0 ? pCredor : null,
                proposta_advogado_percentual: pAdvogado > 0 ? pAdvogado : null
            }

            const { error: updateError } = await supabase
                .from("precatorios")
                .update({
                    dados_calculo: novosDadosCalculo,
                    status_kanban: "proposta_negociacao",
                    localizacao_kanban: "proposta_negociacao",
                    updated_at: new Date().toISOString()
                })
                .eq("id", precatorioId)

            if (updateError) throw updateError

            const alvoCredor = hasHerdeiros ? "Herdeiros" : "Credor"
            if (pCredor > 0) {
                await supabase.from("atividades").insert({
                    precatorio_id: precatorioId,
                    usuario_id: user?.id,
                    tipo: "negociacao" as any,
                    descricao: `Proposta (${alvoCredor}) definida: ${pCredor}% (Valor: ${valorPropostaCredorFmt})`,
                    dados_novos: { percentual: pCredor, alvo: hasHerdeiros ? 'herdeiros' : 'credor' }
                })
            }

            if (pAdvogado > 0) {
                await supabase.from("atividades").insert({
                    precatorio_id: precatorioId,
                    usuario_id: user?.id,
                    tipo: "negociacao" as any,
                    descricao: `Proposta (Advogado) definida: ${pAdvogado}% (Valor: ${valorPropostaAdvogadoFmt})`,
                    dados_novos: { percentual: pAdvogado, alvo: 'advogado' }
                })
            }

            toast({
                title: "Negociacao registrada",
                description: "As propostas foram salvas com sucesso.",
            })
            setIsEditing(false)
            setShowPrintDialog(true)
            onUpdate()
        } catch (error: any) {
            console.error("[Negociacao] Erro:", error)
            toast({
                title: "Erro ao salvar negociacao",
                description: error.message || "Ocorreu um erro inesperado.",
                variant: "destructive",
            })
        } finally {
            setSavingProposta(false)
        }
    }

    async function saveAceiteProposta() {
        if (!((isOperadorComercial && isResponsavelComercial) || isAdminLike)) {
            toast({
                title: "Sem permissao",
                description: "Somente o operador comercial responsavel ou o admin pode registrar o aceite.",
                variant: "destructive",
            })
            return
        }
        if (!propostaAceita && !precatorio?.proposta_aceita) {
            toast({
                title: "Ative o aceite",
                description: "Marque o aceite do credor antes de salvar.",
                variant: "destructive",
            })
            return
        }
        if (propostaAceita) {
            if (!dataAceite) {
                toast({
                    title: "Data do aceite obrigatoria",
                    description: "Informe a data em que o credor aceitou a proposta.",
                    variant: "destructive",
                })
                return
            }
            if (!propostaAceitaId) {
                toast({
                    title: "Proposta aceita obrigatoria",
                    description: "Selecione a proposta aceita para continuar.",
                    variant: "destructive",
                })
                return
            }

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(propostaAceitaId)) {
                toast({
                    title: "ID invalido",
                    description: "O ID da proposta aceita precisa ser um UUID valido.",
                    variant: "destructive",
                })
                return
            }
        }

        setSavingAceite(true)
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            const { data, error } = await supabase.rpc("registrar_aceite_proposta", {
                p_precatorio_id: precatorioId,
                p_proposta_aceita: propostaAceita,
                p_data_aceite: propostaAceita ? dataAceite : null,
                p_proposta_aceita_id: propostaAceita ? propostaAceitaId : null,
            })

            if (error) {
                const msg = (error.message || "").toLowerCase()
                if (msg.includes("function") || msg.includes("does not exist")) {
                    toast({
                        title: "RPC nao instalada",
                        description: "Execute o script 181-rpc-aceite-proposta.sql no Supabase.",
                        variant: "destructive",
                    })
                    return
                }
                if (msg.includes("sem_permissao")) {
                    toast({
                        title: "Sem permissao",
                        description: "Usuario sem permissao para registrar o aceite.",
                        variant: "destructive",
                    })
                    return
                }
                if (msg.includes("not_authenticated")) {
                    toast({
                        title: "Sessao expirada",
                        description: "Faca login novamente para salvar o aceite.",
                        variant: "destructive",
                    })
                    return
                }
                throw error
            }

            const updated = Array.isArray(data) ? data[0] : data
            if (!updated) {
                toast({
                    title: "Sem permissao para salvar",
                    description: "Nao foi possivel atualizar este precatorio. Verifique as permissoes do operador.",
                    variant: "destructive",
                })
                return
            }

            toast({
                title: "Aceite atualizado",
                description: propostaAceita ? "Proposta marcada como aceita." : "Aceite removido.",
            })
            onUpdate()
        } catch (error: any) {
            console.error("[Proposta Aceita] Erro:", error)
            toast({
                title: "Erro ao salvar aceite",
                description: error.message || "Nao foi possivel salvar o aceite.",
                variant: "destructive",
            })
        } finally {
            setSavingAceite(false)
        }
    }

    const resolvedRole = userRole ?? profile?.role ?? user?.app_metadata?.role ?? null
    const resolvedUserId = currentUserId ?? profile?.id ?? user?.id ?? null

    const normalizeRoleTokens = (value: unknown): string[] => {
        if (!value) return []
        if (Array.isArray(value)) return value.map((item) => String(item))
        if (typeof value === "string") {
            const trimmed = value.trim()
            if (!trimmed) return []
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                try {
                    const parsed = JSON.parse(trimmed)
                    if (Array.isArray(parsed)) {
                        return parsed.map((item) => String(item))
                    }
                } catch {
                    // fallback to comma split
                }
            }
            const normalized = trimmed.startsWith("{") && trimmed.endsWith("}")
                ? trimmed.slice(1, -1)
                : trimmed
            return normalized
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
        }
        return [String(value)]
    }

    const roles = normalizeRoleTokens(resolvedRole)
    const normalizedRoles = roles
        .map((r) => (r ?? "").toString().trim().toLowerCase().replace(/\s+/g, "_"))
        .filter(Boolean)
    const isOperadorComercial = normalizedRoles.some((role) => role === "operador_comercial" || role === "operador")
    const isAdminLike = normalizedRoles.some(
        (role) => role === "admin" || role === "gestor" || role.startsWith("gestor_") || role.includes("admin"),
    )
    const responsavelComercialId = precatorio?.responsavel || precatorio?.dono_usuario_id || precatorio?.criado_por || null
    const isResponsavelComercial = responsavelComercialId ? responsavelComercialId === resolvedUserId : true

    const canEditProposta = isOperadorComercial && isResponsavelComercial && !propostaAceita
    const canEditAceite = isAdminLike || (isOperadorComercial && isResponsavelComercial)
    const isRemovingAceite = !propostaAceita && !!precatorio?.proposta_aceita
    const canSubmitAceite =
        canEditAceite &&
        (isRemovingAceite || (propostaAceita && !!dataAceite && !!propostaAceitaId))
    const hasPropostaDefined = !!precatorio.dados_calculo?.proposta_escolhida_percentual || !!precatorio.dados_calculo?.proposta_advogado_percentual

    // Função intermediária para abrir o modal de edição
    function initiatePrint(tipo: "credor" | "honorarios") {
        setPendingPrintType(tipo)
        setShowDescriptionModal(true)
    }

    // Função real de impressão
    async function handleFinalPrint() {
        if (!pendingPrintType) return

        const tipo = pendingPrintType
        setShowDescriptionModal(false)

        setLoading(true)
        try {
            const supabase = createBrowserClient()
            if (!supabase) return
            const { data: { user } } = await supabase.auth.getUser()

            const { antigravityPrint } = await import("@/lib/antigravity/antigravity-print")

            if (tipo === "credor" && hasHerdeiros) {
                if (!cotasOk) {
                    toast({
                        title: "Cotas dos herdeiros incompletas",
                        description: "As cotas dos herdeiros devem somar 100% antes de imprimir.",
                        variant: "destructive",
                    })
                    return
                }

                const herdeirosValidos = herdeiros.filter((h) => Number(h.percentual_participacao || 0) > 0)
                if (!herdeirosValidos.length) {
                    toast({
                        title: "Nenhuma cota informada",
                        description: "Informe a porcentagem de cada herdeiro para gerar as propostas.",
                        variant: "destructive",
                    })
                    return
                }

                for (const herdeiro of herdeirosValidos) {
                    const pct = Number(herdeiro.percentual_participacao || 0)
                    const valorHerdeiro = valorPropostaCredor * (pct / 100)
                    const valorFmt = formatCurrency(valorHerdeiro)

                    if (user) {
                        await supabase.from("atividades").insert({
                            precatorio_id: precatorioId,
                            usuario_id: user.id,
                            tipo: "proposta" as any,
                            descricao: `Proposta (herdeiro: ${herdeiro.nome_completo}) baixada/enviada: ${pct.toFixed(2)}% (Valor: ${valorFmt})`,
                            dados_novos: {
                                percentual: pct,
                                valor: valorHerdeiro,
                                tipo_documento: "herdeiro",
                                herdeiro_id: herdeiro.id,
                            },
                        })
                    }

                    const printData = {
                        ...precatorio,
                        credor_nome: herdeiro.nome_completo,
                        credor_cpf_cnpj: herdeiro.cpf,
                        proposta_maior_valor: valorHerdeiro,
                        proposta_menor_valor: valorHerdeiro,
                        proposta_advogado_valor: valorPropostaAdvogado,
                        proposta_maior_percentual: Number(percentualCredor),
                        honorarios_valor: honorariosValor,
                        titulo_documento: "Proposta de Aquisição de Crédito (Herdeiro)",
                        credor_label: "Herdeiro",
                    }

                    await antigravityPrint({
                        tipo,
                        data: printData,
                        validacao: {
                            calculo_ok: true,
                            juridico_ok: true,
                            comercial_ok: true,
                            admin_ok: true,
                        },
                        customTexts: {
                            objeto: descriptionText,
                        },
                        proposalConfig: precatorio.dados_calculo?.proposal_config,
                    })
                }

                onUpdate()
                return
            }

            const valorFmt = tipo === "credor" ? valorPropostaCredorFmt : valorPropostaAdvogadoFmt
            const percentual = tipo === "credor" ? percentualCredor : percentualAdvogado

            if (user) {
                await supabase.from("atividades").insert({
                    precatorio_id: precatorioId,
                    usuario_id: user.id,
                    tipo: "proposta" as any,
                    descricao: `Proposta (${tipo}) baixada/enviada: ${percentual}% (Valor: ${valorFmt})`,
                    dados_novos: {
                        percentual: percentual,
                        valor: tipo === "credor" ? valorPropostaCredor : valorPropostaAdvogado,
                        tipo_documento: tipo,
                    },
                })
                onUpdate()
            }

            const printData = {
                ...precatorio,
                // Injeção direta para o template usar
                proposta_maior_valor: valorPropostaCredor, // A maioria dos campos no template usa esses fallbacks
                proposta_menor_valor: valorPropostaCredor,
                proposta_advogado_valor: valorPropostaAdvogado,
                // Mantemos histórico
                proposta_maior_percentual: Number(percentualCredor),
                honorarios_valor: honorariosValor // Base dos honorários
            }

            await antigravityPrint({
                tipo,
                data: printData,
                validacao: {
                    calculo_ok: true,
                    juridico_ok: true,
                    comercial_ok: true,
                    admin_ok: true,
                },
                customTexts: {
                    objeto: descriptionText
                },
                proposalConfig: precatorio.dados_calculo?.proposal_config
            })
        } catch (error: any) {
            console.error("Erro ao imprimir/registrar:", error)
            toast({
                title: "Erro na Impressão",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const showViewMode = hasPropostaDefined && !isEditing

    return (
        <div className="space-y-6">
            {/* Header: Faixa de Informações + Botão Configurar */}
            <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Resumo Financeiro
                </div>
                {canEditProposta && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConfigModal(true)}
                        className="gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        Configurar Modelo
                    </Button>
                )}
            </div>

            {/* Faixa de Informações - Teto apenas para Credor por enquanto (ou geral?) */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-muted/30 border-border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Base de Cálculo (Líquido Credor)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(saldoLiquidoCredor)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Teto Sugerido: {tetoPercentual.toFixed(2)}%
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Faixa de Proposta (Sugestão)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {(() => {
                            const pMenorVal = precatorio.proposta_menor_valor ?? precatorio.dados_calculo?.proposta_menor_valor
                            const pMenorPct = precatorio.proposta_menor_percentual ?? precatorio.dados_calculo?.proposta_menor_percentual
                            const pMaiorVal = precatorio.proposta_maior_valor ?? precatorio.dados_calculo?.proposta_maior_valor
                            const pMaiorPct = precatorio.proposta_maior_percentual ?? precatorio.dados_calculo?.proposta_maior_percentual

                            if (!pMenorVal && !pMaiorVal) {
                                return <p className="text-sm text-muted-foreground">Não calculado</p>
                            }

                            return (
                                <>
                                    <div className="flex justify-between items-center bg-card p-1.5 rounded border border-border/50">
                                        <span className="text-xs text-muted-foreground font-semibold uppercase">Mínima ({adjustPercent(pMenorPct || 0).toFixed(2)}%)</span>
                                        <span className="text-sm font-bold text-foreground">{formatCurrency(pMenorVal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-card p-1.5 rounded border border-border/50">
                                        <span className="text-xs text-muted-foreground font-semibold uppercase">Máxima ({adjustPercent(pMaiorPct || 0).toFixed(2)}%)</span>
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pMaiorVal)}</span>
                                    </div>
                                </>
                            )
                        })()}
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 border-border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Base de Cálculo (Honorários)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(honorariosValor)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Valor total contratual
                        </p>
                    </CardContent>
                </Card>
            </div >

            {/* View Mode: Proposta Definida */}
            {
                showViewMode ? (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex flex-col space-y-1.5">
                                <CardTitle className="flex items-center gap-2 text-primary">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Propostas Definidas
                                </CardTitle>
                                <CardDescription>
                                    As propostas foram geradas e estão prontas para impressão.
                                </CardDescription>
                            </div>
                            {canEditProposta && (
                                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Credor / Herdeiros */}
                            {hasHerdeiros ? (
                                <div className="space-y-3 rounded-lg border bg-white p-4 mt-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Propostas por herdeiro</p>
                                            <p className="text-xs text-muted-foreground">Base total: {valorPropostaCredorFmt}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-muted-foreground">Percentual</p>
                                            <p className="text-lg font-bold">{percentualCredor}%</p>
                                        </div>
                                    </div>
                                    {herdeirosLoading ? (
                                        <p className="text-xs text-muted-foreground">Carregando herdeiros...</p>
                                    ) : (
                                        <div className="border rounded-lg divide-y">
                                            {herdeiros.map((h) => {
                                                const pct = Number(h.percentual_participacao || 0)
                                                const valor = valorPropostaCredor * (pct / 100)
                                                return (
                                                    <div key={h.id} className="flex items-center justify-between p-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{h.nome_completo}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{h.cpf || "CPF N/I"}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-muted-foreground">{pct.toFixed(2)}%</p>
                                                            <p className="text-sm font-semibold">{formatCurrency(valor)}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Total de cotas: {totalCotas.toFixed(2)}%</span>
                                        {cotasOk ? (
                                            <span className="text-emerald-600">Cotas OK</span>
                                        ) : (
                                            <span className="text-red-600">Deve somar 100%</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border mt-2">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Proposta Credor</p>
                                        <p className="text-2xl font-bold text-primary">{valorPropostaCredorFmt}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-muted-foreground">Percentual</p>
                                        <p className="text-lg font-bold text-foreground">{percentualCredor}%</p>
                                    </div>
                                </div>
                            )}

                            {/* Advogado */}
                            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Proposta Honorários</p>
                                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{valorPropostaAdvogadoFmt}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground">Percentual</p>
                                    <p className="text-lg font-bold text-foreground">{percentualAdvogado}%</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button
                                    size="lg"
                                    onClick={() => initiatePrint("credor")}
                                    className="w-full bg-black hover:bg-black/90 text-white"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    {hasHerdeiros ? "Baixar Propostas dos Herdeiros (PDF)" : "Baixar Proposta do Credor (PDF)"}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => initiatePrint("honorarios")}
                                    className="w-full bg-white hover:bg-gray-100 text-black border-gray-200"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Baixar Proposta de Honorários (PDF)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Edit Mode: Definir Proposta */
                    <Card className="border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Percent className="h-5 w-5" />
                                Definir Propostas
                            </CardTitle>
                            <CardDescription>
                                {hasHerdeiros ? "Defina as porcentagens para os herdeiros e/ou advogado." : "Defina as porcentagens para o credor e/ou advogado."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Input Credor */}
                            <div className="space-y-4 border-b pb-6">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">{hasHerdeiros ? "Proposta aos herdeiros" : "Proposta ao Credor"}</Label>
                                    <span className="text-xs text-muted-foreground">Base: {formatCurrency(saldoLiquidoCredor)}</span>
                                </div>

                                {/* Sugestões de Proposta (Cálculo) */}
                                {(() => {
                                    // Lógica de extração segura dos dados calculados, similar ao ResumoCalculoDetalhado
                                    const resultados = precatorio.dados_calculo?.resultadosEtapas || []
                                    const propostas = resultados[5] || {} // O passo 5 geralmente contém as propostas

                                    // Prioridades: 1. resultadosEtapas[5], 2. dados_calculo direto
                                    const pMenorPct = adjustPercent(propostas.percentual_menor ?? precatorio.dados_calculo?.proposta_menor_percentual)
                                    const pMenorVal = propostas.menor_proposta ?? precatorio.dados_calculo?.proposta_menor_valor

                                    const pMaiorPct = adjustPercent(propostas.percentual_maior ?? precatorio.dados_calculo?.proposta_maior_percentual)
                                    const pMaiorVal = propostas.maior_proposta ?? precatorio.dados_calculo?.proposta_maior_valor

                                    // Se não tiver dados, não exibe
                                    if (!pMenorVal && !pMaiorVal) return null

                                    return (
                                        <div className="grid grid-cols-2 gap-3 mb-2">
                                            <button
                                                onClick={() => setPercentualCredor(clampCredorPercentual(pMenorPct))}
                                                disabled={!canEditProposta}
                                                className="flex flex-col items-start p-3 border rounded-md hover:bg-slate-50 transition-colors text-left group border-slate-200"
                                            >
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-slate-700">
                                                    Proposta Menor ({pMenorPct || 0}%)
                                                </span>
                                                <span className="text-sm font-bold text-slate-900 mt-1">
                                                    {formatCurrency(pMenorVal)}
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => setPercentualCredor(clampCredorPercentual(pMaiorPct))}
                                                disabled={!canEditProposta}
                                                className="flex flex-col items-start p-3 border rounded-md hover:bg-slate-50 transition-colors text-left group border-slate-200"
                                            >
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-slate-700">
                                                    Proposta Maior ({pMaiorPct || 0}%)
                                                </span>
                                                <span className="text-sm font-bold text-slate-900 mt-1">
                                                    {formatCurrency(pMaiorVal)}
                                                </span>
                                            </button>
                                        </div>
                                    )
                                })()}

                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="grid gap-2 flex-1 relative">
                                        <Label htmlFor="percentualCredor" className="text-xs font-bold">Porcentagem Definida (%)</Label>
                                        <div className="relative">
                                            <Input
                                                id="percentualCredor"
                                                type="number"
                                                min="0"
                                                max={tetoMaximoCredor}
                                                step="0.01"
                                                value={percentualCredor}
                                                onChange={(e: any) => handlePercentualCredorChange(e.target.value)}
                                                className="bg-background pr-8 font-medium"
                                                placeholder="Ex: 60.00"
                                                disabled={!canEditProposta}
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {"M\u00e1ximo permitido: "} {tetoMaximoCredor.toFixed(2)}%
                                        </p>
                                    </div>
                                    <div className="grid gap-2 flex-1">
                                        <Label className="text-xs font-bold">Valor Final Calculado</Label>
                                        <div className="h-10 flex items-center px-3 bg-muted border rounded-md font-bold text-primary text-lg">
                                            {valorPropostaCredorFmt}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {hasHerdeiros && (
                                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">Propostas por herdeiro</p>
                                            <p className="text-xs text-muted-foreground">Base total: {valorPropostaCredorFmt}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Percentual</p>
                                            <p className="text-sm font-semibold">{percentualCredor || 0}%</p>
                                        </div>
                                    </div>
                                    {herdeirosLoading ? (
                                        <p className="text-xs text-muted-foreground">Carregando herdeiros...</p>
                                    ) : (
                                        <div className="border rounded-lg divide-y bg-background">
                                            {herdeiros.map((h) => {
                                                const pct = Number(h.percentual_participacao || 0)
                                                const valor = valorPropostaCredor * (pct / 100)
                                                return (
                                                    <div key={h.id} className="flex items-center justify-between p-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{h.nome_completo}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{h.cpf || "CPF N/I"}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-muted-foreground">{pct.toFixed(2)}%</p>
                                                            <p className="text-sm font-semibold">{formatCurrency(valor)}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Total de cotas: {totalCotas.toFixed(2)}%</span>
                                        {cotasOk ? (
                                            <span className="text-emerald-600">Cotas OK</span>
                                        ) : (
                                            <span className="text-red-600">Deve somar 100%</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Input Advogado */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Proposta Honorários (Advogado)</Label>
                                    <span className="text-xs text-muted-foreground">Base: {formatCurrency(honorariosValor)}</span>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="grid gap-2 flex-1 relative">
                                        <Label htmlFor="percentualAdvogado" className="text-xs font-bold">Porcentagem (%)</Label>
                                        <div className="relative">
                                            <Input
                                                id="percentualAdvogado"
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={percentualAdvogado}
                                                onChange={(e: any) => setPercentualAdvogado(e.target.value)}
                                                className="bg-background pr-8"
                                                placeholder="Ex: 80.00"
                                                disabled={!canEditProposta}
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="grid gap-2 flex-1">
                                        <Label className="text-xs font-bold">Valor Calculado</Label>
                                        <div className="h-10 flex items-center px-3 bg-muted border rounded-md font-bold text-orange-600">
                                            {valorPropostaAdvogadoFmt}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4">
                                {isEditing && (
                                    <Button variant="ghost" onClick={() => setIsEditing(false)}>
                                        Cancelar
                                    </Button>
                                )}
                                <Button
                                    onClick={saveNegociacao}
                                    disabled={savingProposta || !canEditProposta}
                                    className="w-full md:w-auto"
                                >
                                    {savingProposta ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Salvar Propostas
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            <Card className="border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/30 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="h-5 w-5" />
                        Aceite da Proposta
                    </CardTitle>
                    <CardDescription className="text-emerald-900/70 dark:text-emerald-200/70">
                        Marque o aceite do credor para liberar as certidões e o fechamento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 bg-white/70 dark:bg-zinc-900/40 px-4 py-3">
                        <div className="space-y-1">
                            <Label className="text-sm font-semibold">Credor aceitou a proposta?</Label>
                            <p className="text-xs text-muted-foreground">
                                Necessário para avançar para a etapa de certidões.
                            </p>
                        </div>
                        <Switch
                            checked={propostaAceita}
                            onCheckedChange={setPropostaAceita}
                            disabled={!canEditAceite}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dataAceite">Data do aceite</Label>
                            <Input
                                id="dataAceite"
                                type="date"
                                value={dataAceite}
                                onChange={(e) => setDataAceite(e.target.value)}
                                disabled={!canEditAceite || !propostaAceita}
                                className="bg-white/80 dark:bg-zinc-900/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Proposta aceita</Label>
                            {propostasList.length > 0 ? (
                                <Select
                                    value={propostaAceitaId}
                                    onValueChange={setPropostaAceitaId}
                                    disabled={!canEditAceite || !propostaAceita}
                                >
                                    <SelectTrigger className="bg-white/80 dark:bg-zinc-900/50">
                                        <SelectValue placeholder="Selecione a proposta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {propostasList.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {formatCurrency(p.valor_proposta || 0)} • {p.status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={propostaAceitaId}
                                    onChange={(e) => setPropostaAceitaId(e.target.value)}
                                    placeholder="UUID da proposta aceita"
                                    disabled={!canEditAceite || !propostaAceita}
                                    className="bg-white/80 dark:bg-zinc-900/50"
                                />
                            )}
                        </div>
                    </div>

                    {!canSubmitAceite && (
                        <p className="text-xs text-emerald-900/70 dark:text-emerald-200/70">
                            {canEditAceite
                                ? propostaAceita
                                    ? "Preencha a data e selecione a proposta para habilitar o salvamento."
                                    : isRemovingAceite
                                        ? "Desativar o aceite liberará o salvamento."
                                        : "Ative o aceite do credor para continuar."
                                : "Sem permissão para registrar o aceite."}
                        </p>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={saveAceiteProposta}
                            disabled={savingAceite || !canSubmitAceite}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                        >
                            {savingAceite ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Salvar Aceite
                        </Button>
                    </div>
                </CardContent>
            </Card>


            {/* Modal de Sucesso + Escolha de Impressão */}
            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Propostas Salvas</DialogTitle>
                        <DialogDescription>
                            As propostas foram registradas. Escolha qual documento deseja imprimir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Button
                            onClick={() => {
                                setShowPrintDialog(false)
                                initiatePrint("credor")
                            }}
                            className="h-24 flex flex-col gap-3 bg-black hover:bg-black/90"
                        >
                            <User className="h-8 w-8" />
                            <span className="font-semibold">{hasHerdeiros ? "Herdeiros" : "Credor"}</span>
                        </Button>
                        <Button
                            onClick={() => {
                                setShowPrintDialog(false)
                                initiatePrint("honorarios")
                            }}
                            variant="outline"
                            className="h-24 flex flex-col gap-3 border-2"
                        >
                            <Scale className="h-8 w-8" />
                            <span className="font-semibold">Advogado</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Novo Modal: Editar Descrição */}
            <Dialog open={showDescriptionModal} onOpenChange={setShowDescriptionModal}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Editar Descrição da Proposta</DialogTitle>
                        <DialogDescription>
                            Revise ou edite o texto do objeto da proposta antes de gerar o documento.
                            O valor financeiro não será alterado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Objeto da Proposta</Label>
                            <Textarea
                                value={descriptionText}
                                onChange={(e) => setDescriptionText(e.target.value)}
                                className="h-32 resize-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowDescriptionModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleFinalPrint} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
                            Gerar e Baixar PDF
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Configuração do Modelo */}
            <ProposalConfigModal
                open={showConfigModal}
                onOpenChange={setShowConfigModal}
                precatorioId={precatorioId}
                currentData={precatorio}
                onSave={onUpdate}
            />
        </div >
    )
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value || 0)
}

function adjustPercent(val: number) {
    // Se vier 0.65 -> 65. Se vier 65 -> 65
    return (val > 0 && val <= 1) ? val * 100 : val
}
