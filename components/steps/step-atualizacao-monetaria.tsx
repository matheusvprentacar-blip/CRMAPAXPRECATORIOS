/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { calcularPrecatorio } from "@/lib/calculos/calcular-precatorio"
import { getIndiceIpcaPre2022 } from "@/lib/calculos/indices"

const inicioMes = (data: Date): Date => new Date(data.getFullYear(), data.getMonth(), 1)

const forEachMesInclusivo = (inicio: Date, fim: Date, fn: (mes: Date) => void): void => {
  if (inicio > fim) return
  const current = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const end = new Date(fim.getFullYear(), fim.getMonth(), 1)
  while (current <= end) { fn(new Date(current)); current.setMonth(current.getMonth() + 1) }
}

const somarIpcaPre22 = (dataBase: string): number => {
  const inicio = inicioMes(new Date(`${dataBase}T12:00:00`))
  const fim = new Date(2021, 10, 1)
  let soma = 0
  forEachMesInclusivo(inicio, fim, (mes) => {
    const mesAno = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`
    soma += getIndiceIpcaPre2022(mesAno)
  })
  return soma
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)
const ICBanknote = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)
const ICSparkles = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
)

const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"

interface StepAtualizacaoMonetariaProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  precatorioId?: string
}

export function StepAtualizacaoMonetaria({ dados, setDados, onCompletar, voltar }: StepAtualizacaoMonetariaProps) {
  const [resultado, setResultado] = useState<any>(null)
  const [taxaJurosMora, setTaxaJurosMora] = useState<number>(0)

  useEffect(() => {
    if (!dados.data_final_calculo) setDados({ ...dados, data_final_calculo: new Date().toISOString().split("T")[0] })
  }, [])

  useEffect(() => {
    if (dados.data_base) setTaxaJurosMora(somarIpcaPre22(dados.data_base))
  }, [dados.data_base])

  useEffect(() => {
    if (dados.data_base && dados.valor_principal_original) {
      try {
        const calc = calcularPrecatorio({
          ...dados,
          taxa_juros_mora: taxaJurosMora,
          taxa_juros_moratorios: taxaJurosMora,
          juros_mora_percentual: taxaJurosMora / 100,
          taxa_juros_pre_22_acumulada: taxaJurosMora,
          aliquota_irpf: 0,
          aliquota_pss: 0,
          tem_desconto_pss: true,
          percentual_menor_proposta: 65,
          percentual_maior_proposta: 66,
          salario_minimo_vigente: 1412,
        })
        setResultado(calc)
      } catch {}
    }
  }, [dados, taxaJurosMora])

  const handleAvancar = () => {
    if (!resultado) return
    const finalResult = { ...resultado, taxa_juros_mora: taxaJurosMora, valorJuros: resultado.valorJuros, juros_mora: resultado.valorJuros, multa: dados.multa || 0 }
    setDados({ ...dados, taxa_juros_mora: taxaJurosMora, taxa_juros_moratorios: taxaJurosMora, juros_mora_percentual: taxaJurosMora / 100 })
    onCompletar(finalResult)
  }

  // ─── Bloco de linha de cálculo ────────────────────────────────────────────────
  const CalcRow = ({ num, title, formula, detail, value }: { num: string; title: string; formula?: string; detail?: string; value: string }) => (
    <div
      className="rounded-[14px] p-3"
      style={{ background: "rgba(14,77,106,0.04)", border: "1.5px solid rgba(14,77,106,0.1)" }}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>{num}. {title}</p>
          {formula && <p className="text-[10.5px] font-mono break-words" style={{ color: "#9ca3af" }}>{formula}</p>}
          {detail && <p className="text-[11px]" style={{ color: "#6b7280" }}>{detail}</p>}
        </div>
        <p className="text-[15px] font-bold tabular-nums shrink-0" style={{ color: "#0e4d6a" }}>{value}</p>
      </div>
    </div>
  )

  const mc = resultado?.memoriaCalculo

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
          <ICSparkles />
        </div>
        <div>
          <p className="text-[17px] font-black tracking-tight" style={{ color: "#0b0c10" }}>Atualização Monetária (Automática)</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>Cálculo realizado com base nos índices e datas configurados.</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Data Base" value={dados.data_base ? new Date(dados.data_base + "T12:00:00").toLocaleDateString("pt-BR") : "?"} helper="Início da correção" tone="info" icon={<ICCalendar />} />
          <KpiCard label="Data Final" value={dados.data_final_calculo ? new Date(dados.data_final_calculo + "T12:00:00").toLocaleDateString("pt-BR") : "?"} helper="Data de cálculo" tone="primary" icon={<ICCalendar />} />
          <KpiCard label="Principal Original" value={fmt(dados.valor_principal_original || 0)} helper="Base inicial" tone="warning" icon={<ICBanknote />} />
        </div>

        {/* Memória de cálculo */}
        {mc ? (
          <SectionPanel title="Memória de Cálculo (Detalhamento)" description="Composição da atualização monetária mês a mês." tone="primary">
            <div className="space-y-3">
              {mc.ipca && (
                <CalcRow
                  num="1" title="Correção Monetária (IPCA-E)"
                  formula={mc.ipca.formula}
                  detail={mc.ipca.base
                    ? `${fmt(mc.ipca.principalOriginal)} ÷ ${mc.ipca.fatorInicial?.toFixed(7)} × ${mc.ipca.fatorFinal?.toFixed(7)}`
                    : `Fator In: ${mc.ipca.fatorInicial?.toFixed(7)} | Fator Out: ${mc.ipca.fatorFinal?.toFixed(7)}`}
                  value={fmt(mc.ipca.resultado)}
                />
              )}
              {mc.juros && (
                <CalcRow
                  num="2" title="Juros Moratórios (Pré-2022)"
                  formula={mc.juros.formula}
                  detail={`${fmt(mc.juros.base)} × ${mc.juros.percentual?.toFixed(4)}%`}
                  value={fmt(mc.juros.resultado)}
                />
              )}
              {mc.selic && (
                <CalcRow
                  num="3" title="SELIC Acumulada (Pós-2022)"
                  formula={mc.selic.formula}
                  detail={`${fmt(mc.selic.base)} × ${mc.selic.percentual?.toFixed(4)}%`}
                  value={fmt(mc.selic.resultado)}
                />
              )}
              {mc.ipca2025 && (
                <CalcRow
                  num="4" title="EC 136/2025 (IPCA 2025)"
                  formula={mc.ipca2025.formula}
                  detail={`${fmt(mc.ipca2025.base)} × ${mc.ipca2025.percentual?.toFixed(4)}%`}
                  value={fmt(mc.ipca2025.resultado)}
                />
              )}

              {/* Total */}
              <div
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-[14px] p-4"
                style={{ background: "#f0f1f5", border: "1.5px solid rgba(0,0,0,0.07)" }}
              >
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "#9ca3af" }}>Valor atualizado final</p>
                  <p className="text-[11px]" style={{ color: "#9ca3af" }}>(Soma dos itens 1, 2, 3 e 4)</p>
                </div>
                <p className="text-[22px] font-black tabular-nums" style={{ color: "#0e4d6a" }}>
                  {fmt(
                    (mc.ipca?.resultado || 0) + (mc.juros?.resultado || 0) +
                    (mc.selic?.resultado || 0) + (mc.ipca2025?.resultado || 0)
                  )}
                </p>
              </div>
            </div>
          </SectionPanel>
        ) : (
          <SectionPanel title="Memória de cálculo" description="Processando índices oficiais." tone="info">
            <div
              className="flex flex-col items-center gap-3 rounded-[14px] p-8 text-center"
              style={{ border: "1.5px dashed rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.02)" }}
            >
              <div
                className="h-7 w-7 rounded-full border-[3px] animate-spin"
                style={{ borderColor: "rgba(14,77,106,0.2)", borderTopColor: "#0e4d6a" }}
              />
              <p className="text-[12px]" style={{ color: "#9ca3af" }}>Calculando atualização monetária...</p>
            </div>
          </SectionPanel>
        )}
      </div>

      <StepFooter onBack={voltar} onNext={handleAvancar} nextDisabled={!resultado} />
    </div>
  )
}
