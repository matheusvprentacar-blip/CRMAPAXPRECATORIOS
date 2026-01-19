"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

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
                setDbMessage(`✅ Conectado! ${selicData?.length || 0} taxas SELIC e ${ipcaData?.length || 0} fatores IPCA carregados.`)
            } catch (error: any) {
                console.error(error)
                setDbStatus("error")
                setDbMessage(`❌ Erro: ${error.message || "Falha na conexão"}`)
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

        if (baseMensal <= 2259.20) { aliquota = 0 }
        else if (baseMensal <= 2826.65) { aliquota = 0.075; deducao = 169.44 }
        else if (baseMensal <= 3751.05) { aliquota = 0.15; deducao = 381.44 }
        else if (baseMensal <= 4664.68) { aliquota = 0.225; deducao = 662.77 }
        else { aliquota = 0.275; deducao = 896.00 }

        const impostoTotal = ((baseMensal * aliquota) - deducao) * meses
        return Math.max(0, impostoTotal)
    }

    const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    return (
        <div className="container max-w-5xl mx-auto py-8 space-y-8">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">🏛️ Golden Master: Auditor Conectado</h1>
                    <p className="text-slate-500 mt-1">Simulação oficial de IRPF RRA com dados em tempo real</p>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${dbStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
                    dbStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                    {dbStatus === 'connecting' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {dbStatus === 'connected' && <CheckCircle2 className="w-4 h-4" />}
                    {dbStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                    <span>{dbMessage}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* INPUTS */}
                <Card className="shadow-lg border-slate-200">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-lg text-slate-700">Parâmetros de Entrada</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-600">Valor Principal (R$)</Label>
                                <Input
                                    type="number"
                                    value={principal}
                                    onChange={e => setPrincipal(e.target.value)}
                                    className="font-mono text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Juros Originais (R$)</Label>
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
                                <Label className="text-slate-600">Data Base (Início)</Label>
                                <Input
                                    type="date"
                                    value={dataBase}
                                    onChange={e => setDataBase(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Data Final (Cálculo)</Label>
                                <Input
                                    type="date"
                                    value={dataFinal}
                                    onChange={e => setDataFinal(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-600">Meses (RRA)</Label>
                                <Input
                                    type="number"
                                    value={mesesRRA}
                                    onChange={e => setMesesRRA(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Honorários + PSS (R$)</Label>
                                <Input
                                    type="number"
                                    value={deducoes}
                                    onChange={e => setDeducoes(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold h-12 text-lg shadow-md transition-all"
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
                        <Card className="shadow-lg border-blue-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardHeader className="bg-blue-50 border-b border-blue-100">
                                <CardTitle className="text-blue-800 flex items-center gap-2">
                                    📊 Resultado Oficial
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    <div className="flex justify-between p-4 px-6 hover:bg-slate-50 transition-colors">
                                        <span className="text-slate-600">Valor Original</span>
                                        <span className="font-mono font-medium">{fmt(resultado.original)}</span>
                                    </div>
                                    <div className="flex justify-between p-4 px-6 hover:bg-slate-50 transition-colors">
                                        <span className="text-slate-600">Correção (IPCA-E)</span>
                                        <span className="font-mono font-bold text-blue-600">{fmt(resultado.correcao)}</span>
                                    </div>
                                    <div className="flex justify-between p-4 px-6 hover:bg-slate-50 transition-colors">
                                        <span className="text-slate-600">Juros Pré-22</span>
                                        <span className="font-mono font-medium">{fmt(resultado.jurosPre22)}</span>
                                    </div>
                                    <div className="flex justify-between p-4 px-6 hover:bg-slate-50 transition-colors">
                                        <span className="text-slate-600">SELIC (Pós-22)</span>
                                        <span className="font-mono font-bold text-blue-600">{fmt(resultado.selic)}</span>
                                    </div>

                                    <div className="flex justify-between p-4 px-6 bg-slate-50/50 border-b border-slate-100">
                                        <span className="font-medium text-slate-700">Valor Atualizado (Base)</span>
                                        <span className="font-mono font-medium text-slate-900">{fmt(resultado.original + resultado.correcao)}</span>
                                    </div>

                                    <div className="flex justify-between p-4 px-6 bg-blue-50/50">
                                        <span className="font-bold text-slate-800">TOTAL BRUTO</span>
                                        <span className="font-mono font-bold text-lg text-slate-900">{fmt(resultado.totalBruto)}</span>
                                    </div>

                                    {/* Deduções Visuais */}
                                    <div className="bg-slate-50/50 px-6 py-2 text-xs text-slate-500 uppercase font-semibold tracking-wider border-t border-slate-100">
                                        Exclusões da Base
                                    </div>
                                    {resultado.jurosPre22 > 0 && (
                                        <div className="flex justify-between p-2 px-6 hover:bg-red-50/10 transition-colors text-sm">
                                            <span className="text-slate-500">(-) Juros Pré-22</span>
                                            <span className="font-mono text-red-400">({fmt(resultado.jurosPre22)})</span>
                                        </div>
                                    )}
                                    {/* Need to pass juros originais to resultado if not there, but page state has 'juros' input defined as state */}
                                    {(parseFloat(juros) > 0) && (
                                        <div className="flex justify-between p-2 px-6 hover:bg-red-50/10 transition-colors text-sm">
                                            <span className="text-slate-500">(-) Juros Originais</span>
                                            <span className="font-mono text-red-400">({fmt(parseFloat(juros))})</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between p-4 px-6 hover:bg-red-50/30 transition-colors border-t border-slate-100">
                                        <span className="text-slate-600">IRPF (RRA Calculado)</span>
                                        <span className="font-mono font-bold text-red-600">- {fmt(resultado.irpf)}</span>
                                    </div>

                                    <div className="flex justify-between p-6 bg-green-50 border-t border-green-100">
                                        <span className="font-bold text-green-800 text-lg">LÍQUIDO A RECEBER</span>
                                        <span className="font-mono font-bold text-2xl text-green-700">{fmt(resultado.liquido)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* LOGS */}
                    <Card className="shadow overflow-hidden bg-slate-900 text-slate-200 border-none">
                        <CardHeader className="bg-slate-950 p-4 border-b border-slate-800">
                            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                                🔍 Log de Execução
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 font-mono text-xs max-h-[300px] overflow-y-auto space-y-1">
                            {logs.length === 0 ? (
                                <span className="text-slate-600 italic">Aguardando execução...</span>
                            ) : (
                                logs.map((l, i) => (
                                    <div key={i} className="border-b border-slate-800/50 pb-1 mb-1 last:border-0">
                                        <span className="text-teal-400 mr-2">{">"}</span>
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
