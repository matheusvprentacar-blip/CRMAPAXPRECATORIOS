"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, AlertCircle } from "@/components/icons"

// Types
type IndiceEconomico = {
    id: number
    type: string
    reference_date: string
    value: number // or string, depending on DB. Assuming number or string parsable to float
}

export default function AuditoriaIRPFPage() {
    // Estado do Banco de Dados
    const [loadingDB, setLoadingDB] = useState(true)
    const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "error">("connecting")
    const [dbMessage, setDbMessage] = useState("Conectando ao Supabase...")
    const [indicesSelic, setIndicesSelic] = useState<IndiceEconomico[]>([])
    const [indicesIpca, setIndicesIpca] = useState<IndiceEconomico[]>([])

    // Estado do Formulário
    const [principal, setPrincipal] = useState("100000.00")
    const [juros, setJuros] = useState("0.00")
    const [dataBase, setDataBase] = useState("2021-01-01")
    const [dataFinal, setDataFinal] = useState("2025-12-31")
    const [mesesRRA, setMesesRRA] = useState("60")
    const [deducoes, setDeducoes] = useState("0.00")

    // Estado do Resultado
    const [resultado, setResultado] = useState<{
        original: number
        correcao: number
        jurosPre22: number
        selic: number
        totalBruto: number
        irpf: number
        liquido: number
    } | null>(null)

    const [logs, setLogs] = useState<string[]>([])

    // --- CARREGAR DADOS ---
    useEffect(() => {
        async function init() {
            try {
                const supabase = getSupabase()
                if (!supabase) throw new Error("Cliente Supabase não inicializado")

                // 1. Buscar SELIC
                const { data: selicData, error: errSelic } = await supabase
                    .from('economic_indices')
                    .select('*')
                    .eq('type', 'selic')
                    .order('reference_date', { ascending: true })

                if (errSelic) throw errSelic

                // 2. Buscar IPCA
                const { data: ipcaData, error: errIpca } = await supabase
                    .from('economic_indices')
                    .select('*')
                    .eq('type', 'ipca_mensal')

                if (errIpca) throw errIpca

                setIndicesSelic(selicData || [])
                setIndicesIpca(ipcaData || [])

                setDbStatus("connected")
                setDbMessage(`âœ… Conectado! ${selicData?.length || 0} taxas SELIC e ${ipcaData?.length || 0} fatores IPCA carregados.`)
            } catch (error: any) {
                console.error(error)
                setDbStatus("error")
                setDbMessage(`âŒ Erro: ${error.message || "Falha na conexão"}`)
            } finally {
                setLoadingDB(false)
            }
        }

        init()
    }, [])

    // --- HELPER LOG ---
    const log = (msg: string) => {
        setLogs(prev => [...prev, msg])
    }

    // --- MOTOR DE CÁLCULO ---
    const executarAuditoria = () => {
        setLogs([])
        log(">>> INICIANDO AUDITORIA COM DADOS REAIS DO SUPABASE")

        const valPrincipal = parseFloat(principal) || 0
        const valJuros = parseFloat(juros) || 0
        const valDeducoes = parseFloat(deducoes) || 0
        const dtBase = new Date(dataBase)
        const dtFinal = new Date(dataFinal)
        const numMeses = parseInt(mesesRRA) || 1

        // Normalização de datas para comparação YYYY-MM
        // Para simplificar, usamos strings YYYY-MM-01 como no snippet original se a logica assim pedir
        // Mas note que new Date('2021-01-01') cria em UTC ou local, cuidado. 
        // Vamos usar a mesma logica do snippet user provided.

        const dataCorte = new Date('2022-01-01T00:00:00') // Ajustado para evitar timezone mess, assuming input is YYYY-MM-DD
        // O input type="date" retorna YYYY-MM-DD string. new Date(string) é UTC no browser geralmente? Não, YYYY-MM-DD é tratado como UTC.
        // Vamos tratar tudo como UTC para simplificar ou usar .toISOString().slice(0,10)

        // A logica do snippet original:
        const dtBaseLocal = new Date(dataBase + "T00:00:00") // Force local midnight
        const dtFinalLocal = new Date(dataFinal + "T00:00:00")
        const dtCorteLocal = new Date("2022-01-01T00:00:00")

        // 1. Lógica IPCA (Pré-2022)
        let val_IPCA = valPrincipal
        let val_JurosPre22 = 0

        if (dtBaseLocal < dtCorteLocal) {
            let fatorAcumulado = 1.0;

            // Filtrar todos os índices MENSAIS entre a Data Base e Dez/2021
            // A data de referência no banco é YYYY-MM-01.
            const indicesPeriodo = indicesIpca.filter(i => {
                const d = new Date(i.reference_date + "T00:00:00") // Force local
                // Queremos índices >= Data Base E < Data Corte (Jan 22)
                // Se a data base for 15/07/2009, o índice de 01/07/2009 deve entrar?
                // Regra padrão: índice do mês incide sobre o saldo. Se a data base é no meio do mês, normalmente aplica proporcional ou cheio?
                // Pela lógica simplificada do "Golden Master" fornecido: "d >= dataBase && d < dataCorte"
                // Se dataBase = 2009-07-01, então 2009-07-01 >= 2009-07-01 (True).
                return d >= dtBaseLocal && d < dtCorteLocal;
            });

            if (indicesPeriodo.length > 0) {
                // Multiplica: (1 + taxa/100) * (1 + taxa/100)...
                indicesPeriodo.forEach(idx => {
                    const taxa = Number(idx.value);
                    fatorAcumulado = fatorAcumulado * (1 + (taxa / 100));
                });

                log(`Acumulei ${indicesPeriodo.length} meses de IPCA. Fator Final: ${fatorAcumulado.toFixed(6)}`);
                val_IPCA = valPrincipal * fatorAcumulado;
            } else {
                log("Nenhum índice IPCA encontrado para o período. Mantendo valor original.");
                val_IPCA = valPrincipal;
            }

            // Juros Simples (ex: 0.5% ao mês até Dez/21)
            // Calculando diferença de meses
            const diffTime = Math.abs(dtCorteLocal.getTime() - dtBaseLocal.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            const mesesPre22 = Math.floor(diffDays / 30)

            val_JurosPre22 = val_IPCA * (mesesPre22 * 0.005)
            log(`Juros Pré-22 (${mesesPre22} meses x 0.5%): ${fmt(val_JurosPre22)}`)
        } else {
            log("Data base é posterior a 2022. Sem correção IPCA prévia.")
        }

        const baseParaSelic = val_IPCA

        // 2. Lógica SELIC (Pós-2022) - Somando as taxas do banco
        let selicAcumulada = 0
        let countSelic = 0

        if (dtFinalLocal >= dtCorteLocal) {
            // Filtra as taxas SELIC que estão entre Jan/22 e Data Final
            // A logica do snippet considera "Reference Date".
            // Vamos ser fiéis ao snippet:
            const taxasFiltradas = indicesSelic.filter(i => {
                const d = new Date(i.reference_date + "T00:00:00")
                // Ajuste: Considera a partir da data de corte ou da data base (o que for maior)
                const inicioReal = dtBaseLocal > dtCorteLocal ? dtBaseLocal : dtCorteLocal
                return d >= inicioReal && d <= dtFinalLocal
            })

            taxasFiltradas.forEach(t => {
                selicAcumulada += Number(t.value)
                countSelic++
            })
            log(`Somei ${countSelic} taxas SELIC do banco. Total: ${selicAcumulada.toFixed(2)}%`)
        }

        const val_Selic = baseParaSelic * (selicAcumulada / 100)
        const totalBruto = baseParaSelic + val_JurosPre22 + val_Selic + valJuros
        // Note: Snippet original somava jurosOrig no totalBruto.

        // 3. Lógica Fiscal (RRA)
        // Ajuste: Juros Pre-22 (Moratórios) e Juros Originais não compõem a base
        const baseIR = Math.max(0, totalBruto - valDeducoes - val_JurosPre22 - valJuros)
        const resIR = calcularIRPF_RRA(baseIR, numMeses)
        log(`RRA Calculado. Base Ajustada: Total (${fmt(totalBruto)}) - Deduções (${fmt(valDeducoes)}) - Juros Pre22 (${fmt(val_JurosPre22)}) - Juros Orig (${fmt(valJuros)}) = ${fmt(baseIR)}`)

        const liquido = totalBruto - valDeducoes - resIR

        setResultado({
            original: valPrincipal,
            correcao: val_IPCA - valPrincipal,
            jurosPre22: val_JurosPre22,
            selic: val_Selic,
            totalBruto,
            irpf: resIR,
            liquido
        })
    }

    const calcularIRPF_RRA = (base: number, meses: number) => {
        if (meses <= 0 || base <= 0) return 0
        const baseMensal = base / meses

        let deducao = 0
        let aliquota = 0

        if (baseMensal <= 2428.80) { aliquota = 0 }
        else if (baseMensal <= 2826.65) { aliquota = 0.075; deducao = 182.16 }
        else if (baseMensal <= 3751.05) { aliquota = 0.15; deducao = 394.16 }
        else if (baseMensal <= 4664.68) { aliquota = 0.225; deducao = 675.49 }
        else { aliquota = 0.275; deducao = 908.73 }

        const impostoTotal = ((baseMensal * aliquota) - deducao) * meses
        return Math.max(0, impostoTotal)
    }

    const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    return (
        <div className="container max-w-5xl mx-auto py-8 space-y-8">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-muted-foreground tracking-tight">ðŸ›ï¸ Golden Master: Auditor Conectado</h1>
                    <p className="text-muted-foreground mt-1">Simulação oficial de IRPF RRA com dados em tempo real</p>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${dbStatus === 'connected' ? 'bg-primary/15 text-primary border-primary/40' :
                    dbStatus === 'error' ? 'bg-destructive/15 text-destructive border-destructive/40' :
                        'bg-primary/15 text-primary border-primary/40'
                    }`}>
                    {dbStatus === 'connecting' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {dbStatus === 'connected' && <CheckCircle2 className="w-4 h-4" />}
                    {dbStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                    <span>{dbMessage}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* INPUTS */}
                <Card className="shadow-lg border-border">
                    <CardHeader className="bg-muted border-b">
                        <CardTitle className="text-lg text-muted-foreground">Parâmetros de Entrada</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Valor Principal (R$)</Label>
                                <Input
                                    type="number"
                                    value={principal}
                                    onChange={e => setPrincipal(e.target.value)}
                                    className="font-mono text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Juros Originais (R$)</Label>
                                <Input
                                    type="number"
                                    value={juros}
                                    onChange={e => setJuros(e.target.value)}
                                    className="font-mono text-lg"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Data Base (Início)</Label>
                                <Input
                                    type="date"
                                    value={dataBase}
                                    onChange={e => setDataBase(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Data Final (Cálculo)</Label>
                                <Input
                                    type="date"
                                    value={dataFinal}
                                    onChange={e => setDataFinal(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Meses (RRA)</Label>
                                <Input
                                    type="number"
                                    value={mesesRRA}
                                    onChange={e => setMesesRRA(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Honorários + PSS (R$)</Label>
                                <Input
                                    type="number"
                                    value={deducoes}
                                    onChange={e => setDeducoes(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="w-full bg-primary/15 hover:bg-primary/15 text-white font-bold h-12 text-lg shadow-md transition-all"
                            onClick={executarAuditoria}
                            disabled={loadingDB || dbStatus === 'error'}
                        >
                            {loadingDB ? "Carregando Dados..." : "AUDITAR CÁLCULO AGORA"}
                        </Button>

                    </CardContent>
                </Card>

                {/* OUTPUTS */}
                <div className="space-y-6">

                    {resultado && (
                        <Card className="shadow-lg border-primary/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardHeader className="bg-primary/15 border-b border-primary/40">
                                <CardTitle className="text-primary flex items-center gap-2">
                                    ðŸ“Š Resultado Oficial
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    <div className="flex justify-between p-4 px-6 hover:bg-muted transition-colors">
                                        <span className="text-muted-foreground">Valor Original</span>
                                        <span className="font-mono font-medium">{fmt(resultado.original)}</span>
                                    </div>
                                    <div className="flex justify-between p-4 px-6 hover:bg-muted transition-colors">
                                        <span className="text-muted-foreground">Correção (IPCA-E)</span>
                                        <span className="font-mono font-bold text-primary">{fmt(resultado.correcao)}</span>
                                    </div>
                                    <div className="flex justify-between p-4 px-6 hover:bg-muted transition-colors">
                                        <span className="text-muted-foreground">Juros Pré-22</span>
                                        <span className="font-mono font-medium">{fmt(resultado.jurosPre22)}</span>
                                    </div>
                                    <div className="flex justify-between p-4 px-6 hover:bg-muted transition-colors">
                                        <span className="text-muted-foreground">SELIC (Pós-22)</span>
                                        <span className="font-mono font-bold text-primary">{fmt(resultado.selic)}</span>
                                    </div>

                                    <div className="flex justify-between p-4 px-6 bg-muted border-b border-border">
                                        <span className="font-medium text-muted-foreground">Valor Atualizado (Base)</span>
                                        <span className="font-mono font-medium text-muted-foreground">{fmt(resultado.original + resultado.correcao)}</span>
                                    </div>

                                    <div className="flex justify-between p-4 px-6 bg-primary/15">
                                        <span className="font-bold text-muted-foreground">TOTAL BRUTO</span>
                                        <span className="font-mono font-bold text-lg text-muted-foreground">{fmt(resultado.totalBruto)}</span>
                                    </div>

                                    {/* Deduções Visuais */}
                                    <div className="bg-muted px-6 py-2 text-xs text-muted-foreground uppercase font-semibold tracking-wider border-t border-border">
                                        Exclusões da Base
                                    </div>
                                    {resultado.jurosPre22 > 0 && (
                                        <div className="flex justify-between p-2 px-6 hover:bg-destructive/15 transition-colors text-sm">
                                            <span className="text-muted-foreground">(-) Juros Pré-22</span>
                                            <span className="font-mono text-destructive">({fmt(resultado.jurosPre22)})</span>
                                        </div>
                                    )}
                                    {/* Need to pass juros originais to resultado if not there, but page state has 'juros' input defined as state */}
                                    {(parseFloat(juros) > 0) && (
                                        <div className="flex justify-between p-2 px-6 hover:bg-destructive/15 transition-colors text-sm">
                                            <span className="text-muted-foreground">(-) Juros Originais</span>
                                            <span className="font-mono text-destructive">({fmt(parseFloat(juros))})</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between p-4 px-6 hover:bg-destructive/15 transition-colors border-t border-border">
                                        <span className="text-muted-foreground">IRPF (RRA Calculado)</span>
                                        <span className="font-mono font-bold text-destructive">- {fmt(resultado.irpf)}</span>
                                    </div>

                                    <div className="flex justify-between p-6 bg-primary/15 border-t border-primary/40">
                                        <span className="font-bold text-primary text-lg">LÍQUIDO A RECEBER</span>
                                        <span className="font-mono font-bold text-2xl text-primary">{fmt(resultado.liquido)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* LOGS */}
                    <Card className="shadow overflow-hidden bg-muted text-muted-foreground border-none">
                        <CardHeader className="bg-muted p-4 border-b border-border">
                            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                                ðŸ” Log de Execução
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 font-mono text-xs max-h-[300px] overflow-y-auto space-y-1">
                            {logs.length === 0 ? (
                                <span className="text-muted-foreground italic">Aguardando execução...</span>
                            ) : (
                                logs.map((l, i) => (
                                    <div key={i} className="border-b border-border pb-1 mb-1 last:border-0">
                                        <span className="text-primary mr-2">{">"}</span>
                                        {l}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    )
}
