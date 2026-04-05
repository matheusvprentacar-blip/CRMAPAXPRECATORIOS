"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Description, Label as FieldsetLabel } from "@/components/fieldset"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch, SwitchField } from "@/components/switch"

import { Loader2, Printer, CheckCircle2, Percent, Save, Edit, User, Scale } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Textarea } from "@/components/ui/textarea"
import { ProposalConfigModal } from "./proposal-config-modal"
import { Settings } from "@/components/icons"
import { useAuth } from "@/lib/auth/auth-context"
import { ensureOpenLegalOpinionForPrecatorio } from "@/features/legal-opinion/request-from-precatorio"

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
    const [showAceiteConfirmDialog, setShowAceiteConfirmDialog] = useState(false)
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
    const [valorCredorInput, setValorCredorInput] = useState("")
    const [valorAdvogadoInput, setValorAdvogadoInput] = useState("")
    const [isValorCredorFocused, setIsValorCredorFocused] = useState(false)
    const [isValorAdvogadoFocused, setIsValorAdvogadoFocused] = useState(false)

    const [isEditing, setIsEditing] = useState(false)
    const [showPrintDialog, setShowPrintDialog] = useState(false)

    // Estado para edição da descrição
    const [showDescriptionModal, setShowDescriptionModal] = useState(false)
    const [descriptionText, setDescriptionText] = useState("A presente proposta visa a cessão total e definitiva dos direitos creditórios oriundos do processo judicial acima identificado.")
    const [pendingPrintType, setPendingPrintType] = useState<"credor" | "honorarios" | null>(null)

    // Estado para configuração do modelo
    const [showConfigModal, setShowConfigModal] = useState(false)
    const proposalModalSurfaceClass =
        "border border-border/80 !bg-[#fbf6ef] !text-[#22160e] shadow-[0_24px_56px_-34px_rgba(15,23,42,0.58)] dark:border-[#4c3729] dark:!bg-[#17120f] dark:!text-[#f5eee4]"

    useEffect(() => {
        setPropostaAceita(!!precatorio?.proposta_aceita)
        setDataAceite(precatorio?.data_aceite_proposta ? String(precatorio.data_aceite_proposta).slice(0, 10) : "")
    }, [precatorio?.proposta_aceita, precatorio?.data_aceite_proposta])

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
                    description: error.message || "Não foi possível carregar os herdeiros.",
                    variant: "destructive",
                })
            } finally {
                setHerdeirosLoading(false)
            }
        }

        loadHerdeiros()
    }, [precatorioId])

    // Valores Base
    const saldoLiquidoCredor = precatorio.saldo_liquido || 0
    const honorariosValor = precatorio.honorarios_valor || 0
    const hasHerdeiros = herdeiros.length > 0
    const totalCotas = herdeiros.reduce((sum, h) => sum + Number(h.percentual_participacao || 0), 0)
    const cotasOk = Math.abs(totalCotas - 100) <= 0.01

    const tetoPercentual = adjustPercent(precatorio.proposta_maior_percentual || 0)
    const tetoMaximoCredor = tetoPercentual > 0 ? tetoPercentual : 100
    const valorMaximoCredor = Math.max(0, saldoLiquidoCredor * (tetoMaximoCredor / 100))
    const percentualMaximoAdvogado = 100
    const valorMaximoAdvogado = Math.max(0, honorariosValor)

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

    const clampAdvogadoPercentual = (valor: number) => {
        if (!Number.isFinite(valor)) return valor
        return Math.min(Math.max(valor, 0), 100)
    }

    const handlePercentualAdvogadoChange = (valor: string) => {
        if (valor === "") {
            setPercentualAdvogado("")
            return
        }
        const numeric = Number(valor)
        if (Number.isNaN(numeric)) {
            setPercentualAdvogado(valor)
            return
        }
        const clamped = clampAdvogadoPercentual(numeric)
        setPercentualAdvogado(clamped === numeric ? valor : clamped.toString())
    }

    const parseCurrencyInput = (valor: string) => {
        const raw = (valor || "").trim()
        if (!raw) return null

        const cleaned = raw.replace(/[^\d,.-]/g, "")
        if (!cleaned) return null

        const lastComma = cleaned.lastIndexOf(",")
        const lastDot = cleaned.lastIndexOf(".")

        let normalized = cleaned
        if (lastComma > lastDot) {
            normalized = cleaned.replace(/\./g, "").replace(",", ".")
        } else if (lastDot > lastComma) {
            normalized = cleaned.replace(/,/g, "")
        } else {
            normalized = cleaned.replace(",", ".")
        }

        const numeric = Number(normalized)
        return Number.isFinite(numeric) ? numeric : null
    }

    const parseCurrencyFromTyping = (valor: string) => {
        const digits = (valor || "").replace(/\D/g, "")
        if (!digits) return null

        const numeric = Number(digits)
        return Number.isFinite(numeric) ? numeric : null
    }

    const handleValorCredorChange = (valor: string) => {
        const numeric = parseCurrencyFromTyping(valor)
        if (numeric === null) {
            setValorCredorInput("")
            setPercentualCredor("")
            return
        }

        if (numeric < 0) return

        setValorCredorInput(formatCurrencyTyping(numeric))

        if (saldoLiquidoCredor <= 0) {
            setPercentualCredor("")
            return
        }

        const percentualCalculado = (numeric / saldoLiquidoCredor) * 100
        const clamped = clampCredorPercentual(percentualCalculado)
        setPercentualCredor(clamped.toFixed(6))
    }

    const handleValorAdvogadoChange = (valor: string) => {
        const numeric = parseCurrencyFromTyping(valor)
        if (numeric === null) {
            setValorAdvogadoInput("")
            setPercentualAdvogado("")
            return
        }

        if (numeric < 0) return

        setValorAdvogadoInput(formatCurrencyTyping(numeric))

        if (honorariosValor <= 0) {
            setPercentualAdvogado("")
            return
        }

        const percentualCalculado = (numeric / honorariosValor) * 100
        const clamped = clampAdvogadoPercentual(percentualCalculado)
        setPercentualAdvogado(clamped.toFixed(6))
    }

    // Cálculos em tempo real
    const percentualCredorNumerico = Number(percentualCredor)
    const percentualAdvogadoNumerico = Number(percentualAdvogado)
    const hasPercentualCredor = percentualCredor !== "" && Number.isFinite(percentualCredorNumerico)
    const hasPercentualAdvogado = percentualAdvogado !== "" && Number.isFinite(percentualAdvogadoNumerico)
    const percentualCredorCalculado = hasPercentualCredor ? percentualCredorNumerico : 0
    const percentualAdvogadoCalculado = hasPercentualAdvogado ? percentualAdvogadoNumerico : 0
    const valorPropostaCredor = saldoLiquidoCredor * (percentualCredorCalculado / 100)
    const valorPropostaAdvogado = honorariosValor * (percentualAdvogadoCalculado / 100)

    useEffect(() => {
        if (!isValorCredorFocused) {
            setValorCredorInput(hasPercentualCredor ? formatCurrency(valorPropostaCredor) : "")
        }
    }, [hasPercentualCredor, valorPropostaCredor, isValorCredorFocused])

    useEffect(() => {
        if (!isValorAdvogadoFocused) {
            setValorAdvogadoInput(hasPercentualAdvogado ? formatCurrency(valorPropostaAdvogado) : "")
        }
    }, [hasPercentualAdvogado, valorPropostaAdvogado, isValorAdvogadoFocused])

    const valorPropostaCredorFmt = formatCurrency(valorPropostaCredor)
    const valorPropostaAdvogadoFmt = formatCurrency(valorPropostaAdvogado)

    // Handlers de Negociação
    async function saveNegociacao() {
        if (hasRoleSignal && propostaAceita && !canOverrideAceiteLock) {
            toast({
                title: "Proposta bloqueada",
                description: "A proposta foi aceita e só pode ser ajustada por admin ou operador de cálculo responsável.",
                variant: "destructive",
            })
            return
        }
        if (hasRoleSignal && !canManagePropostaByRole) {
            toast({
                title: "Sem permissão",
                description: "A proposta só pode ser ajustada pelo operador comercial responsável, operador de cálculo responsável ou admin.",
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
                description: `A proposta do credor não pode exceder o teto de ${tetoPercentual.toFixed(2)}%.`,
                variant: "destructive",
            })
            return
        }

        if (pCredor <= 0 && !percentualAdvogado) {
            if (pAdvogado <= 0) {
                toast({
                    title: "Valores inválidos",
                    description: "Defina pelo menos uma proposta válida.",
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

            let savedWithRpc = false
            const { error: rpcError } = await supabase.rpc("registrar_negociacao_proposta", {
                p_precatorio_id: precatorioId,
                p_percentual_credor: pCredor > 0 ? pCredor : null,
                p_percentual_advogado: pAdvogado > 0 ? pAdvogado : null,
            })

            if (!rpcError) {
                savedWithRpc = true
            } else {
                const rpcMsg = String(rpcError?.message || "").toLowerCase()
                const functionMissing =
                    rpcMsg.includes("registrar_negociacao_proposta")
                    && (rpcMsg.includes("does not exist") || rpcMsg.includes("não existe"))

                if (!functionMissing) {
                    if (rpcMsg.includes("sem_permissao")) {
                        toast({
                            title: "Sem permissão",
                            description: "Seu usuário não tem permissão para alterar esta proposta.",
                            variant: "destructive",
                        })
                        return
                    }
                    if (rpcMsg.includes("proposta_bloqueada")) {
                        toast({
                            title: "Proposta bloqueada",
                            description: "A proposta foi aceita e não pode mais ser alterada.",
                            variant: "destructive",
                        })
                        return
                    }
                    if (rpcMsg.includes("not_authenticated")) {
                        toast({
                            title: "Sessão expirada",
                            description: "Faça login novamente para salvar a proposta.",
                            variant: "destructive",
                        })
                        return
                    }
                    throw rpcError
                }
            }

            if (!savedWithRpc) {
                const updatePayload: Record<string, unknown> = {
                    dados_calculo: novosDadosCalculo,
                    updated_at: new Date().toISOString(),
                }

                const etapaAtual = String(precatorio?.status_kanban || precatorio?.localizacao_kanban || "").trim().toLowerCase()
                if (!etapaAtual || etapaAtual === "calculo_concluido" || etapaAtual === "proposta_negociacao") {
                    updatePayload.status_kanban = "proposta_negociacao"
                    updatePayload.localizacao_kanban = "proposta_negociacao"
                }

                const { error: updateError } = await supabase
                    .from("precatorios")
                    .update(updatePayload)
                    .eq("id", precatorioId)

                if (updateError) {
                    const msg = String(updateError?.message || "").toLowerCase()
                    if (updateError?.code === "42501" || msg.includes("permission denied")) {
                        toast({
                            title: "Sem permissão",
                            description: "Seu usuário não tem permissão para alterar esta proposta.",
                            variant: "destructive",
                        })
                        return
                    }
                    throw updateError
                }
            }

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
                title: "Negociação registrada",
                description: "As propostas foram salvas com sucesso.",
            })
            setIsEditing(false)
            setShowPrintDialog(true)
            onUpdate()
        } catch (error: any) {
            console.error("[Negociação] Erro:", error)
            toast({
                title: "Erro ao salvar negociação",
                description: error.message || "Ocorreu um erro inesperado.",
                variant: "destructive",
            })
        } finally {
            setSavingProposta(false)
        }
    }

    async function saveAceiteProposta() {
        if (hasRoleSignal && !canEditAceiteByRole) {
            toast({
                title: "Sem permissão",
                description: "Somente o operador responsável (comercial/cálculo) ou admin pode registrar o aceite.",
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

        const dataAceiteEfetiva = propostaAceita
            ? (dataAceite || new Date().toISOString().slice(0, 10))
            : null
        const aceiteResponsavelId = propostaAceita
            ? (resolvedUserId || precatorio?.proposta_aceita_id || null)
            : null
        if (propostaAceita && !dataAceite) {
            setDataAceite(dataAceiteEfetiva || "")
        }

        setSavingAceite(true)
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            const fallbackAceiteAdmin = async () => {
                const fallbackPayload: Record<string, unknown> = {
                    proposta_aceita: propostaAceita,
                    data_aceite_proposta: dataAceiteEfetiva,
                    proposta_aceita_id: aceiteResponsavelId,
                    updated_at: new Date().toISOString(),
                }

                if (propostaAceita) {
                    fallbackPayload.status_kanban = "proposta_aceita"
                    fallbackPayload.localizacao_kanban = "proposta_aceita"
                }

                const { data: fallbackData, error: fallbackError } = await supabase
                    .from("precatorios")
                    .update(fallbackPayload)
                    .eq("id", precatorioId)
                    .select("id")

                if (fallbackError) throw fallbackError
                return Array.isArray(fallbackData) ? fallbackData[0] : fallbackData
            }

            const { data, error } = await supabase.rpc("registrar_aceite_proposta", {
                p_precatorio_id: precatorioId,
                p_proposta_aceita: propostaAceita,
                p_data_aceite: dataAceiteEfetiva,
                p_proposta_aceita_id: aceiteResponsavelId,
            })

            let updated: { id?: string } | null = null

            if (error) {
                const msg = (error.message || "").toLowerCase()
                if (msg.includes("function") || msg.includes("does not exist")) {
                    if (isAdminLike) {
                        updated = await fallbackAceiteAdmin()
                    } else {
                        toast({
                            title: "RPC não instalada",
                            description: "Execute o script 181-rpc-aceite-proposta.sql no Supabase.",
                            variant: "destructive",
                        })
                        return
                    }
                }
                else if (msg.includes("sem_permissao")) {
                    if (isAdminLike) {
                        updated = await fallbackAceiteAdmin()
                    } else {
                        toast({
                            title: "Sem permissão",
                            description: "Usuário sem permissão para registrar o aceite.",
                            variant: "destructive",
                        })
                        return
                    }
                }
                else if (msg.includes("not_authenticated")) {
                    toast({
                        title: "Sessão expirada",
                        description: "Faça login novamente para salvar o aceite.",
                        variant: "destructive",
                    })
                    return
                } else if (isAdminLike) {
                    updated = await fallbackAceiteAdmin()
                } else {
                    throw error
                }
            }
            else {
                updated = Array.isArray(data) ? data[0] : data
            }
            if (!updated) {
                toast({
                    title: "Sem permissão para salvar",
                    description: "Não foi possível atualizar este precatório. Verifique as permissões do operador.",
                    variant: "destructive",
                })
                return
            }

            const { data: persistedRow, error: persistedError } = await supabase
                .from("precatorios")
                .select("id, proposta_aceita, data_aceite_proposta, status_kanban, localizacao_kanban")
                .eq("id", precatorioId)
                .maybeSingle()

            if (persistedError) throw persistedError

            const persistedAceite = !!persistedRow?.proposta_aceita
            const persistedDataAceite = persistedRow?.data_aceite_proposta
                ? String(persistedRow.data_aceite_proposta).slice(0, 10)
                : null
            const expectedDataAceite = dataAceiteEfetiva ? String(dataAceiteEfetiva).slice(0, 10) : null
            const etapaAtualAntesAceite = String(precatorio?.status_kanban || precatorio?.localizacao_kanban || "")
                .trim()
                .toLowerCase()
            const deveMoverParaJuridicoFechamento =
                propostaAceita &&
                ["", "calculo_concluido", "proposta_negociacao", "proposta_aceita"].includes(etapaAtualAntesAceite)

            if (propostaAceita && (!persistedAceite || persistedDataAceite !== expectedDataAceite)) {
                toast({
                    title: "Aceite não persistido",
                    description: "O sistema não confirmou a gravação do aceite. Revise os dados e tente novamente.",
                    variant: "destructive",
                })
                return
            }

            if (!propostaAceita && persistedAceite) {
                toast({
                    title: "Aceite não removido",
                    description: "A remoção do aceite não foi confirmada. Tente novamente.",
                    variant: "destructive",
                })
                return
            }

            if (
                deveMoverParaJuridicoFechamento &&
                (persistedRow?.status_kanban !== "proposta_aceita" || persistedRow?.localizacao_kanban !== "proposta_aceita")
            ) {
                const { data: movedRows, error: moveError } = await supabase
                    .from("precatorios")
                    .update({
                        status_kanban: "proposta_aceita",
                        localizacao_kanban: "proposta_aceita",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", precatorioId)
                    .select("id, status_kanban, localizacao_kanban")
                    .limit(1)

                if (moveError) {
                    toast({
                        title: "Aceite salvo, mas sem encaminhamento",
                        description:
                            "A proposta foi aceita, porém não foi possível mover para Jurídico de fechamento. Verifique permissões/migrações e tente novamente.",
                        variant: "destructive",
                    })
                    return
                }

                const movedRow = Array.isArray(movedRows) ? movedRows[0] : movedRows
                if (
                    movedRow?.status_kanban !== "proposta_aceita" ||
                    movedRow?.localizacao_kanban !== "proposta_aceita"
                ) {
                    toast({
                        title: "Encaminhamento não confirmado",
                        description:
                            "O aceite foi salvo, mas o crédito ainda não entrou em Jurídico de fechamento.",
                        variant: "destructive",
                    })
                    return
                }
            }

            if (propostaAceita) {
                try {
                    await ensureOpenLegalOpinionForPrecatorio({
                        precatorioId,
                        motivo: "OUTROS",
                        motivoLabel: "Proposta aceita",
                        descricao:
                            "Crédito marcado como proposta aceita e encaminhado automaticamente para Jurídico de fechamento.",
                        origemSolicitacao: "kanban",
                    })
                } catch (legalOpinionError) {
                    console.error("[Proposta Aceita] Falha ao sincronizar parecer jurídico:", legalOpinionError)
                    toast({
                        title: "Aceite salvo, mas parecer não sincronizado",
                        description:
                            "O crédito foi para Jurídico de fechamento, porém não foi possível criar o registro no módulo de parecer. Tente atualizar a tela de Parecer Jurídico.",
                        variant: "destructive",
                    })
                }
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
                description: error.message || "Não foi possível salvar o aceite.",
                variant: "destructive",
            })
        } finally {
            setSavingAceite(false)
        }
    }

    const hasUserRoleProp =
        Array.isArray(userRole)
            ? userRole.length > 0
            : typeof userRole === "string"
                ? userRole.trim().length > 0
                : !!userRole
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
                .map((item) =>
                    item
                        .trim()
                        .replace(/^[\[\]{}"']+|[\[\]{}"']+$/g, "")
                        .replace(/^"+|"+$/g, "")
                        .replace(/^'+|'+$/g, ""),
                )
                .filter(Boolean)
        }
        return [String(value)]
    }

    const roleCandidates = [
        ...(hasUserRoleProp ? normalizeRoleTokens(userRole) : []),
        ...normalizeRoleTokens(profile?.role),
        ...normalizeRoleTokens(user?.app_metadata?.role),
    ]
    const roles = Array.from(new Set(roleCandidates.map((role) => role.trim()).filter(Boolean)))
    const normalizedRoles = roles
        .map((r) =>
            (r ?? "")
                .toString()
                .trim()
                .replace(/^[\[\]{}"']+|[\[\]{}"']+$/g, "")
                .replace(/^"+|"+$/g, "")
                .replace(/^'+|'+$/g, "")
                .toLowerCase()
                .replace(/\s+/g, "_"),
        )
        .filter(Boolean)
    const isOperadorComercial = normalizedRoles.some((role) => role === "operador_comercial" || role === "operador")
    const isOperadorCalculo = normalizedRoles.some((role) => role === "operador_calculo")
    const isAdminLike = normalizedRoles.some(
        (role) => role === "admin" || role === "gestor" || role.startsWith("gestor_") || role.includes("admin"),
    )
    const hasRoleSignal = normalizedRoles.length > 0
    const responsavelComercialId = precatorio?.responsavel || precatorio?.dono_usuario_id || precatorio?.criado_por || null
    const isResponsavelComercial = responsavelComercialId ? responsavelComercialId === resolvedUserId : true
    const responsavelCalculoId = precatorio?.responsavel_calculo_id || precatorio?.operador_calculo || null
    const isResponsavelCalculo = responsavelCalculoId ? responsavelCalculoId === resolvedUserId : true
    const canOverrideAceiteLock = isAdminLike || (isOperadorCalculo && isResponsavelCalculo)
    const canManagePropostaByRole =
        isAdminLike
        || (isOperadorComercial && isResponsavelComercial)
        || (isOperadorCalculo && isResponsavelCalculo)
    const canEditAceiteByRole =
        isAdminLike
        || (isOperadorComercial && isResponsavelComercial)
        || (isOperadorCalculo && isResponsavelCalculo)

    const canEditProposta = (!propostaAceita || canOverrideAceiteLock) && (
        !hasRoleSignal
            ? !!resolvedUserId
            : canManagePropostaByRole
    )
    const canEditAceite = !hasRoleSignal
        ? !!resolvedUserId
        : canEditAceiteByRole
    const isRemovingAceite = !propostaAceita && !!precatorio?.proposta_aceita
    const canSubmitAceite =
        canEditAceite &&
        (isRemovingAceite || propostaAceita)
    const hasPropostaDefined = !!precatorio.dados_calculo?.proposta_escolhida_percentual || !!precatorio.dados_calculo?.proposta_advogado_percentual

    // Função intermediária para abrir o modal de edição
    function initiatePrint(tipo: "credor" | "honorarios") {
        setPendingPrintType(tipo)
        setShowDescriptionModal(true)
    }

    function handleSaveAceiteClick() {
        if (propostaAceita && !isRemovingAceite) {
            setShowAceiteConfirmDialog(true)
            return
        }
        void saveAceiteProposta()
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
                                                placeholder={`Máx permitido: ${formatPercent(tetoMaximoCredor)}%`}
                                                disabled={!canEditProposta}
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="grid gap-2 flex-1">
                                        <Label htmlFor="valorCredor" className="text-xs font-bold">Valor Final (R$)</Label>
                                        <Input
                                            id="valorCredor"
                                            type="text"
                                            inputMode="decimal"
                                            value={valorCredorInput}
                                            onChange={(e) => handleValorCredorChange(e.target.value)}
                                            onFocus={() => {
                                                setIsValorCredorFocused(true)
                                                const numeric = parseCurrencyInput(valorCredorInput)
                                                setValorCredorInput(numeric !== null ? formatCurrencyTyping(numeric) : "")
                                            }}
                                            onBlur={() => {
                                                setIsValorCredorFocused(false)
                                                const numeric = parseCurrencyInput(valorCredorInput)
                                                setValorCredorInput(numeric !== null ? formatCurrency(numeric) : "")
                                            }}
                                            className="bg-background font-medium text-primary"
                                            placeholder={`Máx permitido: ${formatCurrency(valorMaximoCredor)}`}
                                            disabled={!canEditProposta}
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Ao informar percentual ou valor fechado, o outro campo é recalculado automaticamente.
                                </p>
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
                                                onChange={(e: any) => handlePercentualAdvogadoChange(e.target.value)}
                                                className="bg-background pr-8"
                                                placeholder={`Máx permitido: ${formatPercent(percentualMaximoAdvogado)}%`}
                                                disabled={!canEditProposta}
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="grid gap-2 flex-1">
                                        <Label htmlFor="valorAdvogado" className="text-xs font-bold">Valor (R$)</Label>
                                        <Input
                                            id="valorAdvogado"
                                            type="text"
                                            inputMode="decimal"
                                            value={valorAdvogadoInput}
                                            onChange={(e) => handleValorAdvogadoChange(e.target.value)}
                                            onFocus={() => {
                                                setIsValorAdvogadoFocused(true)
                                                const numeric = parseCurrencyInput(valorAdvogadoInput)
                                                setValorAdvogadoInput(numeric !== null ? formatCurrencyTyping(numeric) : "")
                                            }}
                                            onBlur={() => {
                                                setIsValorAdvogadoFocused(false)
                                                const numeric = parseCurrencyInput(valorAdvogadoInput)
                                                setValorAdvogadoInput(numeric !== null ? formatCurrency(numeric) : "")
                                            }}
                                            className="bg-background text-orange-600 dark:text-orange-400 font-medium"
                                            placeholder={`Máx permitido: ${formatCurrency(valorMaximoAdvogado)}`}
                                            disabled={!canEditProposta}
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Regra de três automática: valor informado gera percentual exato sobre a base de honorários.
                                </p>
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
                    <SwitchField className="border-emerald-200/60 bg-white/70 dark:border-emerald-900/50 dark:bg-zinc-900/40">
                        <FieldsetLabel className="text-sm font-semibold">Credor aceitou a proposta?</FieldsetLabel>
                        <Description className="text-xs text-muted-foreground">
                            Necessário para avançar para a etapa de certidões.
                        </Description>
                        <Switch
                            name="proposta_aceita"
                            checked={propostaAceita}
                            onCheckedChange={setPropostaAceita}
                            disabled={!canEditAceite}
                        />
                    </SwitchField>

                    {propostaAceita && (
                        <p className="text-xs text-emerald-900/70 dark:text-emerald-200/70">
                            Ao confirmar o aceite, a edição fica bloqueada para operador comercial. Admin e operador de cálculo responsável ainda podem ajustar.
                        </p>
                    )}

                    {!canSubmitAceite && (
                        <p className="text-xs text-emerald-900/70 dark:text-emerald-200/70">
                            {canEditAceite
                                ? propostaAceita
                                    ? "Confirme o aceite para finalizar e bloquear a edição."
                                    : isRemovingAceite
                                        ? "Desativar o aceite liberará o salvamento."
                                        : "Ative o aceite do credor para continuar."
                                : "Sem permissão para registrar o aceite."}
                        </p>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSaveAceiteClick}
                            disabled={savingAceite || !canSubmitAceite}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                        >
                            {savingAceite ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {isRemovingAceite ? "Remover Aceite" : "Confirmar Aceite"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showAceiteConfirmDialog} onOpenChange={setShowAceiteConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar aceite da proposta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ao confirmar, a proposta será marcada como aceita e ficará bloqueada para edição comercial.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                                setShowAceiteConfirmDialog(false)
                                void saveAceiteProposta()
                            }}
                        >
                            Confirmar aceite
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* Modal de Sucesso + Escolha de Impressão */}
            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
                <DialogContent className={`sm:max-w-md ${proposalModalSurfaceClass}`}>
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
                <DialogContent className={`max-w-xl ${proposalModalSurfaceClass}`}>
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

function formatCurrencyTyping(value: number) {
    return `R$ ${new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 0,
    }).format(Math.max(0, Number.isFinite(value) ? value : 0))}`
}

function formatPercent(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0)
}

function adjustPercent(val: number) {
    // Se vier 0.65 -> 65. Se vier 65 -> 65
    return (val > 0 && val <= 1) ? val * 100 : val
}
