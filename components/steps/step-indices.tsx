/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, type CSSProperties } from "react"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { TABELA_IPCA_FATORES_EC113, TABELA_SELIC_PERCENTUAL_EC113, FATOR_TETO_DEZ21 } from "@/lib/calculos/dados-ec113"
import { IPCA_E_MENSAL, TABELA_INDICES_COMPLETA } from "@/lib/calculos/indices"

const IPCA_TABELA_COMPLETA_MAP = new Map<string, number>()
for (const item of TABELA_INDICES_COMPLETA) {
  if (item.periodo.startsWith("IPCA")) {
    IPCA_TABELA_COMPLETA_MAP.set(item.dataRef.slice(0, 7), item.indice)
  }
}

const formatMesAno = (data: Date) => data.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })
const inicioMes = (data: Date) => new Date(data.getFullYear(), data.getMonth(), 1)

const getIndiceIpcaE = (mesAno: string): number => {
  const mapa = IPCA_E_MENSAL as Record<string, number>
  if (Object.prototype.hasOwnProperty.call(mapa, mesAno)) return mapa[mesAno]
  return IPCA_TABELA_COMPLETA_MAP.get(mesAno) ?? 0
}

// ─── Clay input ───────────────────────────────────────────────────────────────
const inputStyle: CSSProperties = {
  width: "100%", height: "38px", borderRadius: "11px",
  border: "1px solid rgba(0,0,0,0.09)", background: "#fff",
  padding: "0 12px", fontSize: "13px", color: "#0b0c10", outline: "none",
  boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.04),inset -2px -2px 4px rgba(255,255,255,0.8)",
}
const labelStyle: CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "6px",
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)
const ICTrending = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
)
const ICPercent = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-2.063-4.125 2.063L7.125 19.688l-4.125 2.062V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
)
const ICTable = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375z" />
  </svg>
)

interface StepIndicesProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  resultadosEtapas: any[]
  precatorioId?: string
}

export function StepIndices({ dados, setDados, onCompletar, voltar }: StepIndicesProps) {
  const [dataBase, setDataBase] = useState<string>(dados.data_base || new Date().toISOString().split("T")[0])
  const [dataFinal, setDataFinal] = useState<string>(dados.data_calculo || new Date().toISOString().split("T")[0])
  const [dadosIpca, setDadosIpca] = useState<{ fatorNaData: number; fatorTeto: number; multiplicador: number } | null>(null)
  const [dadosSelic, setDadosSelic] = useState<{ taxaAcumulada: number; inicioPeriodo: string; fimPeriodo: string; regra: string } | null>(null)
  const [dadosIpca2025, setDadosIpca2025] = useState<{ percentualAcumulado: number; inicioPeriodo: string; fimPeriodo: string; regra: string } | null>(null)

  useEffect(() => { consultarIndices(dataBase, dataFinal) }, [dataBase, dataFinal])

  const getSumSELIC = (start: Date, end: Date): number => {
    let sum = 0
    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    const endDate = new Date(end.getFullYear(), end.getMonth(), 1)
    while (current <= endDate) {
      const anoStr = current.getFullYear().toString()
      const mesIndex = current.getMonth()
      if (TABELA_SELIC_PERCENTUAL_EC113[anoStr]) sum += TABELA_SELIC_PERCENTUAL_EC113[anoStr][mesIndex] || 0
      current.setMonth(current.getMonth() + 1)
    }
    return sum
  }

  const consultarIndices = (dtBase: string, dtFinal: string) => {
    if (!dtBase || !dtFinal) return
    const [anoStr, mesStr] = dtBase.split("-")
    const ano = parseInt(anoStr)
    const mes = parseInt(mesStr) - 1
    const dataObj = new Date(ano, mes, 1)
    const dataCorteIpcaFator = new Date(2021, 11, 1)
    const dataInicioIpca2025 = new Date(2025, 0, 1)
    const [anoFim, mesFim] = dtFinal.split("-").map(Number)
    const dataFinalObj = new Date(anoFim, mesFim - 1, 1)

    if (dataObj < dataCorteIpcaFator) {
      const tabelaIpca = TABELA_IPCA_FATORES_EC113[anoStr]
      const fator = tabelaIpca ? tabelaIpca[mes] : 0
      const fatorTetoNov21 = TABELA_IPCA_FATORES_EC113["2021"]?.[10] ?? FATOR_TETO_DEZ21
      setDadosIpca({ fatorNaData: fator, fatorTeto: fatorTetoNov21, multiplicador: fator > 0 ? fatorTetoNov21 / fator : 0 })
    } else { setDadosIpca(null) }

    const selicReferenciaInicio = new Date(2022, 0, 1)
    const selicReferenciaFim = new Date(2024, 11, 1)
    const selicInicio = dataObj > selicReferenciaInicio ? inicioMes(dataObj) : selicReferenciaInicio
    const selicFim = dataFinalObj < selicReferenciaFim ? dataFinalObj : selicReferenciaFim

    if (selicInicio <= selicFim) {
      const taxaAcumulada = getSumSELIC(selicInicio, selicFim)
      setDadosSelic({ taxaAcumulada, inicioPeriodo: formatMesAno(selicInicio), fimPeriodo: formatMesAno(selicFim), regra: `Soma da SELIC acumulada de ${formatMesAno(selicInicio)} até ${formatMesAno(selicFim)}.` })
    } else { setDadosSelic(null) }

    const fimIpca2025 = inicioMes(new Date())
    const inicioIpca2025 = dataObj > dataInicioIpca2025 ? inicioMes(dataObj) : dataInicioIpca2025

    if (inicioIpca2025 <= fimIpca2025) {
      let somaPercentual = 0
      const current = new Date(inicioIpca2025.getFullYear(), inicioIpca2025.getMonth(), 1)
      while (current <= fimIpca2025) {
        const mesAno = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
        somaPercentual += getIndiceIpcaE(mesAno)
        current.setMonth(current.getMonth() + 1)
      }
      setDadosIpca2025({ percentualAcumulado: somaPercentual, inicioPeriodo: formatMesAno(inicioIpca2025), fimPeriodo: formatMesAno(fimIpca2025), regra: "Soma dos índices IPCA-E mês a mês a partir da Data Base (>= 01/2025) até a Data Atual." })
    } else { setDadosIpca2025(null) }
  }

  const handleAvancar = () => {
    const payload = {
      data_base: dataBase, data_final: dataFinal,
      dados_ipca: dadosIpca, dados_selic: dadosSelic, dados_ipca_2025: dadosIpca2025,
      ipca_fator_inicial: dadosIpca ? dadosIpca.fatorNaData : 0,
      ipca_fator_final: dadosIpca ? dadosIpca.fatorTeto : 0,
      selic_acumulada_percentual: dadosSelic ? dadosSelic.taxaAcumulada : 0,
    }
    setDados({ ...dados, ...payload })
    onCompletar(payload)
  }

  // ─── index card sub-component ────────────────────────────────────────────────
  const IndexBlock = ({ num, title, period, badge, value, valueLabel, rule }: {
    num: string; title: string; period: string; badge: string; value: string; valueLabel: string; rule: string
  }) => (
    <div
      className="flex flex-col gap-3 rounded-[16px] p-4 h-full"
      style={{ background: "rgba(14,77,106,0.04)", border: "1.5px solid rgba(14,77,106,0.12)" }}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>{num}. {title}</p>
          <p className="text-[11px]" style={{ color: "#9ca3af" }}>{period}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
          style={{ background: "rgba(14,77,106,0.1)", border: "1px solid rgba(14,77,106,0.2)", color: "#0e4d6a" }}
        >
          {badge}
        </span>
      </div>
      <div>
        <p className="text-[11px]" style={{ color: "#9ca3af" }}>{valueLabel}</p>
        <p className="text-[22px] font-bold tabular-nums leading-tight mt-0.5" style={{ color: "#0b0c10" }}>{value}</p>
      </div>
      <div
        className="rounded-[10px] p-2.5 text-[10.5px]"
        style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.06)", color: "#9ca3af" }}
      >
        <strong style={{ color: "#374151" }}>Regra:</strong> {rule}
      </div>
    </div>
  )

  const EmptyBlock = ({ title, desc }: { title: string; desc: string }) => (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 rounded-[16px] p-4 text-center"
      style={{ border: "1.5px dashed rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.02)" }}
    >
      <p className="text-[13px] font-bold" style={{ color: "#374151" }}>{title}</p>
      <p className="text-[11px]" style={{ color: "#9ca3af" }}>{desc}</p>
    </div>
  )

  return (
    <div
      className="rounded-[22px] bg-white overflow-hidden"
      style={{
        border: "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: "16px 16px 36px rgba(0,0,0,0.08),-8px -8px 20px rgba(255,255,255,0.94),inset 1px 1px 4px rgba(255,255,255,0.9),inset -1px -1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-start gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.15)", color: "#0e4d6a" }}
        >
          <ICTable />
        </div>
        <div>
          <p className="text-[17px] font-black tracking-tight" style={{ color: "#0b0c10" }}>Consulta de Índices (EC 113/21)</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>Visualize a aplicação das regras de correção monetária e juros para o período informado.</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Data Base" value={dataBase ? new Date(dataBase + "T12:00:00").toLocaleDateString("pt-BR") : "?"} helper="Início do período" tone="info" icon={<ICCalendar />} />
          <KpiCard label="SELIC acumulada" value={dadosSelic ? `${dadosSelic.taxaAcumulada.toFixed(2)}%` : "—"} helper={dadosSelic ? `${dadosSelic.inicioPeriodo} a ${dadosSelic.fimPeriodo}` : "Sem aplicação"} tone="success" icon={<ICTrending />} />
          <KpiCard label="IPCA 2025" value={dadosIpca2025 ? `${dadosIpca2025.percentualAcumulado.toFixed(2)}%` : "—"} helper={dadosIpca2025 ? `${dadosIpca2025.inicioPeriodo} a ${dadosIpca2025.fimPeriodo}` : "Sem aplicação"} tone="primary" icon={<ICPercent />} />
        </div>

        {/* Período */}
        <SectionPanel title="Período de cálculo" description="Defina a data base e a data final para consultar os índices." tone="info">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <label style={labelStyle}>Data Base (Início)</label>
              <input type="date" style={inputStyle} value={dataBase} onChange={(e) => setDataBase(e.target.value)} />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label style={labelStyle}>Data Final (Cálculo)</label>
              <input type="date" style={inputStyle} value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
            </div>
          </div>
        </SectionPanel>

        {/* Regras e índices */}
        <SectionPanel title="Regras e índices aplicados" description="Resumo automático das regras vigentes no período informado." tone="primary">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dadosIpca ? (
              <IndexBlock
                num="1" title="IPCA-E" period="Até Nov/2021" badge="Fatores"
                valueLabel="Fator Data Base"
                value={dadosIpca.fatorNaData.toFixed(7)}
                rule="Atualização proporcional até 11/2021 usando a razão entre fatores."
              />
            ) : (
              <EmptyBlock title="IPCA-E não aplicável" desc="Data posterior a Nov/2021. Apenas SELIC e IPCA 2025 serão aplicados." />
            )}
            {dadosSelic ? (
              <IndexBlock
                num="2" title="SELIC" period={`${dadosSelic.inicioPeriodo} a ${dadosSelic.fimPeriodo}`} badge="Acumulada"
                valueLabel="Taxa acumulada no período"
                value={`${dadosSelic.taxaAcumulada.toFixed(2)}%`}
                rule={dadosSelic.regra}
              />
            ) : (
              <EmptyBlock title="SELIC não aplicável" desc="Período fora do intervalo 01/2022–12/2024." />
            )}
            {dadosIpca2025 ? (
              <IndexBlock
                num="3" title="IPCA-E 2025" period={`${dadosIpca2025.inicioPeriodo} a ${dadosIpca2025.fimPeriodo}`} badge="Projeção"
                valueLabel="Soma acumulada no período"
                value={`${dadosIpca2025.percentualAcumulado.toFixed(2)}%`}
                rule={dadosIpca2025.regra}
              />
            ) : (
              <EmptyBlock title="IPCA-E 2025 não aplicável" desc="Data base anterior a Jan/2025. Nenhum IPCA 2025 acumulado." />
            )}
          </div>
        </SectionPanel>
      </div>

      <StepFooter onBack={voltar} onNext={handleAvancar} />
    </div>
  )
}
