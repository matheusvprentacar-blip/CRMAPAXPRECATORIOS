import { getIndice } from "./indices"

export interface DadosEntrada {
  // Dados cadastrais
  autor_credor_originario: string
  advogado_acao: string
  numero_precatorio: string
  autos_execucao: string
  numero_oficio_requisitorio: string
  data_expedicao: Date
  vara_origem: string
  natureza_ativo: string

  // Valores financeiros
  valor_principal_original: number
  valor_juros_original: number
  multa: number
  honorarios_contratuais: number
  adiantamento_recebido: number
  percentual_adiantamento: number

  // Datas de cálculo
  data_base: Date
  data_inicial_calculo: Date
  data_final_calculo: Date

  // Parâmetros PSS/IRPF
  meses_execucao_anterior: number
  salario_minimo_referencia: number
  quantidade_salarios_minimos: number

  // Taxas de juros adicionais
  taxa_juros_mora?: number
  taxa_juros_moratorios?: number // Alias
  taxa_selic_adicional?: number

  // Flags
  tem_desconto_pss: boolean
  isencao_pss: boolean
  percentual_pss?: number // Não usado, mantido para compatibilidade

  pss_oficio_valor?: number // PSS do Ofício
  pss_valor?: number // PSS Atualizado (já calculado no StepPSS)
  juros_mora_percentual?: number // Taxa de juros em decimal (ex: 0.0238)

  percentual_proposta_minima?: number // Default: 65
  percentual_proposta_maxima?: number // Default: 66
  percentual_comissao?: number // Default: 5
}

export interface DetalhamentoMensal {
  data: string
  valor_anterior: number
  indice: number
  tipo_indice: "SELIC" | "IPCA-E"
  correcao: number
  valor_atualizado: number
}

export interface ResultadoCalculo {
  // Valores base
  total_conta_original: number
  valor_corrigido_monetariamente: number
  valor_atualizado: number
  juros_mora_aplicados: number
  valorJuros: number
  valorSelic: number

  // Detalhamento
  detalhamento_mensal: DetalhamentoMensal[]

  // Descontos
  adiantamento_recebido: number
  pss_calculado: number
  irpf_calculado: number
  total_descontos: number

  // Saldos
  saldo_credor: number
  saldo_liquido_credor: number

  // Propostas
  propostas: {
    menor_proposta: number
    maior_proposta: number
    comissao_apax: number
    valor_maximo_aquisicao: number
  }
}

export function calcularPrecatorio(dados: DadosEntrada): ResultadoCalculo {
  console.log("[v0] ===== INÍCIO CÁLCULO PRECATÓRIO =====")
  console.log("[v0] Valor Principal Original:", dados.valor_principal_original)

  const jurosMoraPercentual =
    dados.taxa_juros_mora ??
    dados.taxa_juros_moratorios ??
    dados.juros_mora_percentual ??
    0

  const taxaJurosMora = jurosMoraPercentual * 100
  console.log("[v0] Taxa Juros Mora:", taxaJurosMora)
  console.log("[v0] Data Inicial:", dados.data_inicial_calculo)
  console.log("[v0] Data Final:", dados.data_final_calculo)

  const totalContaOriginal = dados.valor_principal_original + (dados.valor_juros_original || 0) + (dados.multa || 0)

  const { valorCorrigido, detalhamento, valorPrincipalAtualizado } = calcularAtualizacaoMensal(
    totalContaOriginal, // Usar o total da conta
    dados.valor_principal_original,
    dados.data_inicial_calculo,
    dados.data_final_calculo,
  )

  console.log("[v0] Total Conta Original (P+J+M):", totalContaOriginal)
  console.log("[v0] Valor Corrigido (após SELIC/IPCA-E mensal):", valorCorrigido)
  console.log("[v0] Total de períodos aplicados:", detalhamento.length)

  const jurosMora = valorCorrigido * (taxaJurosMora / 100)

  console.log("[v0] Taxa Juros Mora aplicada:", taxaJurosMora, "%")
  console.log("[v0] Juros de Mora calculados:", jurosMora)

  const valorAtualizadoFinal = valorCorrigido + jurosMora
  console.log("[v0] Valor Atualizado Final:", valorAtualizadoFinal)

  // PSS (por faixas em salários mínimos)
  let pss = 0
  if (dados.tem_desconto_pss && !dados.isencao_pss) {
    // Se pss_valor já foi calculado no StepPSS, usar esse valor diretamente
    if (dados.pss_valor !== undefined && dados.pss_valor !== null) {
      pss = dados.pss_valor
      console.log("[PSS DEBUG] Usando PSS já calculado no StepPSS:", pss.toFixed(2))
    }
    // Caso contrário, calcular aqui usando a nova regra
    else if (dados.pss_oficio_valor && dados.juros_mora_percentual !== undefined) {
      const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
      pss = round2(dados.pss_oficio_valor * (1 + dados.juros_mora_percentual))
      console.log("[PSS DEBUG] pssOficio:", dados.pss_oficio_valor)
      console.log("[PSS DEBUG] jurosMoraPercent:", dados.juros_mora_percentual)
      console.log("[PSS DEBUG] pssAtualizado calculado:", pss)
    }
    // Fallback para lógica antiga (não deve acontecer)
    else {
      const baseIncidenciaPSS = valorAtualizadoFinal - dados.adiantamento_recebido
      const salarioMinimo = dados.salario_minimo_referencia || 1518
      const smConta = baseIncidenciaPSS / salarioMinimo
      pss = calcularPSSPorFaixas(smConta, salarioMinimo)
      console.log("[PSS DEBUG] Usando cálculo antigo por faixas (fallback):", pss.toFixed(2))
    }
  } else {
    console.log("[PSS DEBUG] PSS isento - valor: 0")
  }

  // IRPF (modelo por meses) - Base deve ser o valor atualizado menos adiantamento
  let irpf = 0
  if (dados.meses_execucao_anterior > 0) {
    // Saldo do credor sem desconto = valor atualizado - adiantamento
    const saldoCredorSemDesconto = valorAtualizadoFinal - dados.adiantamento_recebido

    console.log("[v0] ========== PREPARANDO CÁLCULO IRPF ==========")
    console.log("[v0] Valor Atualizado Final:", (valorAtualizadoFinal || 0).toFixed(2))
    console.log("[v0] Adiantamento Recebido:", (dados.adiantamento_recebido || 0).toFixed(2))
    console.log("[v0] Saldo Credor Sem Desconto:", (saldoCredorSemDesconto || 0).toFixed(2))
    console.log("[v0] ==============================================")

    // Chama com duas bases: saldo do credor + valores originais para faixa
    irpf = calcularIRPFComMeses(
      saldoCredorSemDesconto,
      dados.valor_principal_original,
      dados.valor_juros_original,
      dados.multa,
      dados.meses_execucao_anterior,
    )

    console.log("[v0] IRPF Calculado Final:", irpf.toFixed(2))
  }

  // Total de descontos
  const totalDescontos = pss + irpf

  // Saldo do credor
  const saldoCredor = valorAtualizadoFinal - totalDescontos - dados.adiantamento_recebido
  const saldoLiquidoCredor = saldoCredor

  // Propostas e comissão
  const percMinima = dados.percentual_proposta_minima ?? 65
  const percMaxima = dados.percentual_proposta_maxima ?? 66
  const percComissao = dados.percentual_comissao ?? 5

  const menorProposta = saldoLiquidoCredor * (percMinima / 100)
  const maiorProposta = saldoLiquidoCredor * (percMaxima / 100)
  const comissaoApax = saldoLiquidoCredor * (percComissao / 100)
  const valorMaximoAquisicao = menorProposta - comissaoApax

  return {
    total_conta_original: dados.valor_principal_original,
    valor_corrigido_monetariamente: valorCorrigido,
    valor_atualizado: valorAtualizadoFinal,
    juros_mora_aplicados: jurosMora,
    valorJuros: jurosMora,
    valorSelic: 0, // SELIC já está aplicado na correção mensal

    detalhamento_mensal: detalhamento,

    adiantamento_recebido: dados.adiantamento_recebido,
    pss_calculado: pss,
    irpf_calculado: irpf,
    total_descontos: totalDescontos,

    saldo_credor: saldoCredor,
    saldo_liquido_credor: saldoLiquidoCredor,

    propostas: {
      menor_proposta: menorProposta,
      maior_proposta: maiorProposta,
      comissao_apax: comissaoApax,
      valor_maximo_aquisicao: valorMaximoAquisicao,
    },
  }
}

function calcularAtualizacaoMensal(
  totalContaOriginal: number,
  valorPrincipalOriginal: number,
  dataInicial: Date,
  dataFinal: Date,
): {
  valorCorrigido: number
  detalhamento: DetalhamentoMensal[]
  valorPrincipalAtualizado: number
} {
  let valorAtual = totalContaOriginal
  let valorPrincipalAtual = valorPrincipalOriginal
  const detalhamento: DetalhamentoMensal[] = []

  const inicio = new Date(dataInicial)
  const fim = new Date(dataFinal)

  const mesAtual = new Date(inicio.getFullYear(), inicio.getMonth(), 1)

  while (mesAtual <= fim) {
    const mesAno = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, "0")}`
    const indice = getIndice(mesAno)

    // Determina tipo de índice baseado na data (até 2021-12 = SELIC, depois = IPCA-E)
    const [ano] = mesAno.split("-").map(Number)
    const tipoIndice = ano < 2022 || (ano === 2021 && mesAtual.getMonth() === 11) ? "SELIC" : "IPCA-E"

    if (indice !== 0) {
      const valorAnterior = valorAtual
      const correcaoMes = valorAtual * (indice / 100)
      valorAtual = valorAtual + correcaoMes

      // Atualiza também o principal para calcular fator de juros do PSS
      valorPrincipalAtual = valorPrincipalAtual + valorPrincipalAtual * (indice / 100)

      detalhamento.push({
        data: mesAno,
        valor_anterior: valorAnterior,
        indice,
        tipo_indice: tipoIndice,
        correcao: correcaoMes,
        valor_atualizado: valorAtual,
      })
    }

    mesAtual.setMonth(mesAtual.getMonth() + 1)
  }

  return {
    valorCorrigido: valorAtual,
    detalhamento,
    valorPrincipalAtualizado: valorPrincipalAtual,
  }
}

function calcularPSSPorFaixas(smConta: number, salarioMinimo: number): number {
  const faixas = [
    { ate: 200, percentual: 11 },
    { ate: 2000, percentual: 8 },
    { ate: 20000, percentual: 5 },
    { ate: 100000, percentual: 3 },
    { ate: Number.POSITIVE_INFINITY, percentual: 0 },
  ]

  let pssTotal = 0
  let smRestante = smConta
  let smAnterior = 0

  for (const faixa of faixas) {
    if (smRestante <= 0) break

    const smNaFaixa = Math.min(smRestante, faixa.ate - smAnterior)
    const valorNaFaixa = smNaFaixa * salarioMinimo
    const pssNaFaixa = valorNaFaixa * (faixa.percentual / 100)

    pssTotal += pssNaFaixa

    smRestante -= smNaFaixa
    smAnterior = faixa.ate

    if (smConta <= faixa.ate) break
  }

  return pssTotal
}

function calcularIRPFComMeses(
  saldoCredorSemDesconto: number,
  principal: number,
  juros: number,
  multa: number,
  meses: number,
): number {
  if (meses <= 0) return 0

  // Base 1: Para descobrir a faixa (principal + juros + multa)
  const baseExecucao = principal + juros + multa
  const baseMensal = baseExecucao / meses

  console.log("[v0] ========== CÁLCULO IRPF RRA (DUAS BASES) ==========")
  console.log("[v0] BASE 1 - Para descobrir faixa:")
  console.log("  Principal:", principal.toFixed(2))
  console.log("  Juros:", juros.toFixed(2))
  console.log("  Multa:", multa.toFixed(2))
  console.log("  Base Execução (P+J+M):", baseExecucao.toFixed(2))
  console.log("  Meses:", meses)
  console.log("  Base Mensal:", baseMensal.toFixed(2))

  // Tabela IRPF mensal (valores oficiais)
  const faixas = [
    { limite: 1903.98, aliquota: 0, parcela_deduzir: 0 },
    { limite: 2826.65, aliquota: 0.075, parcela_deduzir: 142.8 },
    { limite: 3751.05, aliquota: 0.15, parcela_deduzir: 354.8 },
    { limite: 4664.68, aliquota: 0.225, parcela_deduzir: 636.13 },
    { limite: Number.POSITIVE_INFINITY, aliquota: 0.275, parcela_deduzir: 869.36 },
  ]

  // Seleciona a faixa baseado na base mensal
  let faixaSelecionada = faixas[0]
  for (const faixa of faixas) {
    if (baseMensal <= faixa.limite) {
      faixaSelecionada = faixa
      break
    }
  }

  console.log("[v0] Faixa Selecionada:")
  console.log("  - Alíquota:", (faixaSelecionada.aliquota * 100).toFixed(2) + "%")
  console.log("  - Parcela a Deduzir (mensal):", faixaSelecionada.parcela_deduzir.toFixed(2))

  // Calcula dedução total
  const deducaoTotal = faixaSelecionada.parcela_deduzir * meses
  console.log(
    "[v0] Dedução Total:",
    deducaoTotal.toFixed(2),
    `(${faixaSelecionada.parcela_deduzir.toFixed(2)} × ${meses})`,
  )

  // Base 2: Para aplicar a alíquota (saldo do credor sem desconto)
  console.log("[v0] BASE 2 - Para calcular IR:")
  console.log("  Saldo Credor Sem Desconto:", saldoCredorSemDesconto.toFixed(2))

  // Cálculo RRA: IR = (saldo_credor * alíquota) - dedução_total
  const irBruto = saldoCredorSemDesconto * faixaSelecionada.aliquota
  const irpfTotal = irBruto - deducaoTotal

  console.log(
    "[v0] IR Bruto:",
    irBruto.toFixed(2),
    `(${saldoCredorSemDesconto.toFixed(2)} × ${(faixaSelecionada.aliquota * 100).toFixed(2)}%)`,
  )
  console.log("[v0] IR Final:", irpfTotal.toFixed(2), `(${irBruto.toFixed(2)} - ${deducaoTotal.toFixed(2)})`)
  console.log("[v0] ====================================================")

  return Math.max(0, irpfTotal)
}

export function exportarParaJSON(dados: DadosEntrada, resultado: ResultadoCalculo): string {
  const exportData = {
    dados_entrada: dados,
    resultado_calculo: resultado,
    data_exportacao: new Date().toISOString(),
  }

  return JSON.stringify(exportData, null, 2)
}
