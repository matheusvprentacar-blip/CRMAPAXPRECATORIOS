import { IPCA_E_MENSAL, TABELA_INDICES_COMPLETA, getIndiceIpcaPre2022 } from "./indices"
import { TABELA_IPCA_FATORES_EC113, TABELA_SELIC_PERCENTUAL_EC113, FATOR_TETO_DEZ21 } from "./dados-ec113"

// --- INTERFACES ---

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

  // Datas de cÃ¡lculo
  data_base: Date
  data_inicial_calculo: Date
  data_final_calculo: Date

  // ParÃ¢metros PSS/IRPF
  meses_execucao_anterior: number
  salario_minimo_referencia: number
  quantidade_salarios_minimos: number

  // Taxas de juros adicionais
  taxa_juros_mora?: number
  taxa_juros_moratorios?: number // Alias
  taxa_selic_adicional?: number

  // OBS: Se informado, este valor serÃ¡ usado diretamente como TOTA % de Juros PrÃ©-22
  taxa_juros_pre_22_acumulada?: number

  // [NEW] Overrides from StepIndices
  ipca_fator_inicial?: number
  ipca_fator_final?: number
  selic_acumulada_percentual?: number
  dados_ipca?: {
    fatorNaData: number
    fatorTeto: number
    multiplicador: number
  }
  dados_selic?: {
    taxaAcumulada: number
    inicioPeriodo: string
    fimPeriodo: string
    regra: string
  }
  dados_ipca_2025?: {
    percentualAcumulado: number
    inicioPeriodo: string
    fimPeriodo: string
    regra: string
  }

  // Flags
  tem_desconto_pss: boolean
  isencao_pss: boolean
  percentual_pss?: number // NÃ£o usado, mantido para compatibilidade

  pss_oficio_valor?: number // PSS do OfÃ­cio
  pss_valor?: number // PSS Atualizado (jÃ¡ calculado no StepPSS)
  pss_manual?: boolean
  juros_mora_percentual?: number // Taxa de juros em decimal (ex: 0.0238)

  percentual_proposta_minima?: number // Default: 65
  percentual_proposta_maxima?: number // Default: 66
  percentual_comissao?: number // Default: 5

  // Campos Manuais adicionados
  irpf_manual?: boolean
  valor_irpf?: number

  honorarios_manual?: boolean
  honorarios_valor?: number
  adiantamento_valor?: number

  tipo_beneficiario?: "credor" | "advogado"

  propostas_manual?: boolean
  menor_proposta_manual?: number
  maior_proposta_manual?: number
}

export interface DetalhamentoMensal {
  data: string
  valor_anterior: number
  indice: number
  tipo_indice: "SELIC" | "IPCA-E" | "Juros PrÃ©-22"
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

  // Detalhamento e MemÃ³ria
  detalhamento_mensal: DetalhamentoMensal[]
  memoriaCalculo: any // Adicionado para UI

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

// --- HELPER FUNCTIONS ---

type ModeloAtualizacao = "A" | "B" | "C"

const DATA_INICIO_MODELO_B = new Date(2022, 0, 1)
const DATA_INICIO_MODELO_C = new Date(2025, 0, 1)
const DATA_FIM_JUROS_PRE22 = new Date(2021, 10, 1)
const DATA_FIM_SELIC = new Date(2024, 11, 1)

const IPCA_TABELA_COMPLETA_MAP = new Map<string, number>()
for (const item of TABELA_INDICES_COMPLETA) {
  if (item.periodo.startsWith("IPCA")) {
    IPCA_TABELA_COMPLETA_MAP.set(item.dataRef.slice(0, 7), item.indice)
  }
}

function toMesAno(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
}

function inicioMes(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), 1)
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b
}

function forEachMesInclusivo(inicio: Date, fim: Date, fn: (mes: Date) => void): void {
  if (inicio > fim) return
  const current = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const end = new Date(fim.getFullYear(), fim.getMonth(), 1)

  while (current <= end) {
    fn(new Date(current))
    current.setMonth(current.getMonth() + 1)
  }
}

function getIndiceIpcaTabelaCompleta(mesAno: string): number {
  const indice = IPCA_TABELA_COMPLETA_MAP.get(mesAno)
  if (indice !== undefined) return indice
  return getIndiceIpcaPre2022(mesAno)
}

function getIndiceIpcaE(mesAno: string): number {
  const mapa = IPCA_E_MENSAL as Record<string, number>
  if (Object.prototype.hasOwnProperty.call(mapa, mesAno)) {
    return mapa[mesAno]
  }
  return getIndiceIpcaTabelaCompleta(mesAno)
}

function getIndiceSelicEC113(mesAno: string): number {
  const [anoStr, mesStr] = mesAno.split("-")
  const tabelaAno = TABELA_SELIC_PERCENTUAL_EC113[anoStr]
  if (!tabelaAno) return 0
  const mesIndex = Number(mesStr) - 1
  return tabelaAno[mesIndex] ?? 0
}

function getFatorIPCA(mes: number, ano: number): number {
  const anoStr = ano.toString()
  if (TABELA_IPCA_FATORES_EC113[anoStr]) {
    // Array is 0-indexed (0=Jan, 11=Dez)
    return TABELA_IPCA_FATORES_EC113[anoStr][mes] || 0
  }
  return 0
}

// --- CORE CALCULATION FUNCTIONS ---

function calcularAtualizacaoMensal(
  valorPrincipalOriginal: number,
  dataBase: Date,
  dataInicioModelo: Date,
  dataFinal: Date,
  overrides: {
    ipca_fator_inicial?: number
    ipca_fator_final?: number
    selic_acumulada_percentual?: number
    ipca_2025_acumulada_percentual?: number
  } = {}
): {
  modelo: ModeloAtualizacao
  valorCorrigido: number
  detalhamento: DetalhamentoMensal[]
  valorSelic: number
  valorJurosPre22: number
  correcaoIPCA2025: number
  fatorIPCA2025: number
  valorAtualizadoFinal: number
  memoriaCalculo: any
} {
  const inicioModelo = new Date(dataInicioModelo)
  const base = new Date(dataBase)
  const baseMes = inicioMes(base)
  const fim = new Date(dataFinal)

  const modelo: ModeloAtualizacao =
    inicioModelo < DATA_INICIO_MODELO_B
      ? "A"
      : inicioModelo < DATA_INICIO_MODELO_C
        ? "B"
        : "C"

  const detalhamento: DetalhamentoMensal[] = []
  const memoriaCalculo: any = {}

  // 1. IPCA-E (FATOR) - somente Modelo A
  let valorCorrigido = valorPrincipalOriginal
  let fatorOrigem = 0
  let fatorDestino = 0

  const fatorTetoNov21 = TABELA_IPCA_FATORES_EC113["2021"]?.[10] ?? FATOR_TETO_DEZ21
  const aplicaIpcaFator = baseMes <= DATA_FIM_JUROS_PRE22

  if (aplicaIpcaFator) {
    fatorOrigem = overrides.ipca_fator_inicial ?? getFatorIPCA(baseMes.getMonth(), baseMes.getFullYear())
    fatorDestino = overrides.ipca_fator_final ?? fatorTetoNov21

    if (fatorOrigem > 0) {
      valorCorrigido = (valorPrincipalOriginal / fatorOrigem) * fatorDestino

      detalhamento.push({
        data: "IPCA-E (CorreÃ§Ã£o)",
        valor_anterior: valorPrincipalOriginal,
        indice: fatorDestino / fatorOrigem,
        tipo_indice: "IPCA-E",
        correcao: valorCorrigido - valorPrincipalOriginal,
        valor_atualizado: valorCorrigido
      })

      memoriaCalculo.ipca = {
        formula: "(Principal / FatorInicial) * FatorFinal",
        fatorInicial: fatorOrigem,
        fatorFinal: fatorDestino,
        principalOriginal: valorPrincipalOriginal,
        base: valorPrincipalOriginal,
        resultado: valorCorrigido
      }
    } else {
      memoriaCalculo.ipca = {
        formula: "Fator IPCA inicial indisponÃ­vel (Sem CorreÃ§Ã£o)",
        fatorInicial: fatorOrigem,
        fatorFinal: fatorDestino,
        principalOriginal: valorPrincipalOriginal,
        base: valorPrincipalOriginal,
        resultado: valorCorrigido
      }
    }
  } else {
    memoriaCalculo.ipca = {
      formula: "Sem CorreÃ§Ã£o IPCA-E por Fator (Data Base >= 12/2021)",
      fatorInicial: 0,
      fatorFinal: 0,
      principalOriginal: valorPrincipalOriginal,
      base: valorPrincipalOriginal,
      resultado: valorCorrigido
    }
  }

  // 2. JUROS MORATORIOS (PRE-2022) - SOMA IPCA DO PERIODO
  let somaIPCAPre22 = 0
  const periodosJuros: Array<{ mesAno: string; ipca: number }> = []

  const inicioJuros = baseMes
  const fimJuros = DATA_FIM_JUROS_PRE22

  if (inicioJuros <= fimJuros) {
    forEachMesInclusivo(inicioJuros, fimJuros, (mes) => {
      const mesAno = toMesAno(mes)
      const ipca = getIndiceIpcaTabelaCompleta(mesAno)
      somaIPCAPre22 += ipca
      periodosJuros.push({ mesAno, ipca })
    })
  }

  const taxaJurosPre22 = somaIPCAPre22
  const valorJurosPre22 = valorPrincipalOriginal * (taxaJurosPre22 / 100)

  detalhamento.push({
    data: "Juros Moratórios (Pré-2022)",
    valor_anterior: valorPrincipalOriginal,
    indice: taxaJurosPre22,
    tipo_indice: "Juros Pré-22",
    correcao: valorJurosPre22,
    valor_atualizado: valorJurosPre22
  })

  memoriaCalculo.juros = {
    formula: "Soma IPCA do período * Principal",
    base: valorPrincipalOriginal,
    somaIPCA: somaIPCAPre22,
    meses: periodosJuros.length,
    percentual: taxaJurosPre22,
    resultado: valorJurosPre22,
    periodos: periodosJuros
  }

  // 3. SELIC (01/2022 A 12/2024) - SOMA DOS PERCENTUAIS (POR DATA BASE)
  let somaSelicPercentual = 0
  const periodosSelic: Array<{ mesAno: string; indice: number }> = []

  const fimCalculoMes = inicioMes(fim)
  const selicInicio = baseMes > DATA_INICIO_MODELO_B ? baseMes : DATA_INICIO_MODELO_B
  const selicFim = minDate(fimCalculoMes, DATA_FIM_SELIC)
  const aplicaSelic = selicInicio <= selicFim

  if (aplicaSelic) {
    forEachMesInclusivo(selicInicio, selicFim, (mes) => {
      const mesAno = toMesAno(mes)
      const indice = getIndiceSelicEC113(mesAno)
      somaSelicPercentual += indice
      periodosSelic.push({ mesAno, indice })
    })
  }

  if (overrides.selic_acumulada_percentual !== undefined) {
    somaSelicPercentual = overrides.selic_acumulada_percentual
  }

  const valorSelic = valorPrincipalOriginal * (somaSelicPercentual / 100)

  if (aplicaSelic) {
    detalhamento.push({
      data: `SELIC Acumulada (${toMesAno(selicInicio)} a ${toMesAno(selicFim)})`,
      valor_anterior: valorPrincipalOriginal,
      indice: somaSelicPercentual,
      tipo_indice: "SELIC",
      correcao: valorSelic,
      valor_atualizado: valorSelic
    })

    memoriaCalculo.selic = {
      formula: `Soma percentuais SELIC (${toMesAno(selicInicio)} a ${toMesAno(selicFim)}) * Principal`,
      base: valorPrincipalOriginal,
      percentual: somaSelicPercentual,
      meses: periodosSelic.length,
      periodos: periodosSelic,
      resultado: valorSelic
    }
  } else {
    memoriaCalculo.selic = {
      formula: "SELIC não aplicável (Data Base fora de 01/2022 a 12/2024)",
      base: valorPrincipalOriginal,
      percentual: 0,
      meses: 0,
      periodos: [],
      resultado: 0
    }
  }

  // 4. EC 136/2025 (IPCA 2025) - SOMA MÊS A MÊS A PARTIR DA DATA BASE
  let somaIPCA2025Percentual = 0
  const periodosIPCA2025: Array<{ mesAno: string; indice: number }> = []

  const inicioIPCA2025Base = inicioMes(base)
  const inicioIPCA2025 = inicioIPCA2025Base > DATA_INICIO_MODELO_C ? inicioIPCA2025Base : DATA_INICIO_MODELO_C
  const fimIPCA2025 = inicioMes(new Date())
  const aplicaIPCA2025 = inicioIPCA2025 <= fimIPCA2025

  if (aplicaIPCA2025) {
    forEachMesInclusivo(inicioIPCA2025, fimIPCA2025, (mes) => {
      const mesAno = toMesAno(mes)
      const indice = getIndiceIpcaE(mesAno)
      somaIPCA2025Percentual += indice
      periodosIPCA2025.push({ mesAno, indice })
    })
  }

  if (overrides.ipca_2025_acumulada_percentual !== undefined) {
    somaIPCA2025Percentual = overrides.ipca_2025_acumulada_percentual
  }

  const fatorIPCA2025 = 1 + somaIPCA2025Percentual / 100
  const correcaoIPCA2025 = valorPrincipalOriginal * (somaIPCA2025Percentual / 100)
  const resultadoIPCA2025 = correcaoIPCA2025

  memoriaCalculo.ipca2025 = {
    formula: "Soma dos índices IPCA-E 2025 mês a mês (EC 136/2025)",
    base: valorPrincipalOriginal,
    percentual: somaIPCA2025Percentual,
    fator: fatorIPCA2025,
    meses: periodosIPCA2025.length,
    periodos: periodosIPCA2025,
    resultado: resultadoIPCA2025
  }

  if (aplicaIPCA2025) {
    detalhamento.push({
      data: "EC 136/2025 (IPCA 2025)",
      valor_anterior: valorPrincipalOriginal,
      indice: somaIPCA2025Percentual,
      tipo_indice: "IPCA-E",
      correcao: correcaoIPCA2025,
      valor_atualizado: resultadoIPCA2025
    })
  }

  // 5. FORMULA FINAL
  const valorAtualizadoFinal = valorCorrigido + valorJurosPre22 + valorSelic + correcaoIPCA2025

  return {
    modelo,
    valorCorrigido,
    valorSelic,
    valorJurosPre22,
    correcaoIPCA2025,
    fatorIPCA2025,
    valorAtualizadoFinal,
    detalhamento,
    memoriaCalculo
  }
}

export function calcularPrecatorio(dados: DadosEntrada): ResultadoCalculo {
  console.log("[v0] ===== INÃCIO CÃLCULO PRECATÃ“RIO (MODE: EC113 SPREADSHEET) =====")
  console.log("[v0] Valor Principal Original:", dados.valor_principal_original)

  const dataInicioModelo = dados.data_inicial_calculo || dados.data_base

  // Base financeira: separamos campos informados para evitar dupla contagem.
  const principalInformado = Number(dados.principal_informado ?? dados.valor_principal_original ?? 0)
  const jurosInformados = Number(dados.juros_informados ?? dados.valor_juros_original ?? 0)
  const multaInformada = Number(dados.multa_informada ?? dados.multa ?? 0)

  // Soma principal + juros + multa/selic, conforme solicitado.
  const valorPrincipalParaCalculo = principalInformado + jurosInformados + multaInformada

  const {
    valorCorrigido,
    valorSelic,
    valorJurosPre22,
    correcaoIPCA2025,
    valorAtualizadoFinal,
    detalhamento,
    memoriaCalculo
  } = calcularAtualizacaoMensal(
    valorPrincipalParaCalculo,
    dados.data_base,
    dataInicioModelo,
    dados.data_final_calculo,
    {
      ipca_fator_inicial: dados.ipca_fator_inicial,
      ipca_fator_final: dados.ipca_fator_final,
      selic_acumulada_percentual: dados.dados_selic?.taxaAcumulada ?? dados.selic_acumulada_percentual,
      ipca_2025_acumulada_percentual: dados.dados_ipca_2025?.percentualAcumulado
    }
  )

  console.log("[v0] MemÃ³ria de CÃ¡lculo:", memoriaCalculo)
  console.log("[v0] Valor Atualizado Final:", valorAtualizadoFinal)

  // --- CÃLCULO PSS E IRPF ---

  // PSS
  let pss = 0
  if (dados.tem_desconto_pss && !dados.isencao_pss) {
    if (dados.pss_valor !== undefined && dados.pss_valor !== null) {
      pss = dados.pss_valor
    } else if (dados.pss_oficio_valor) {
      const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
      const pssBase = dados.pss_oficio_valor

      const baseMesPss = inicioMes(new Date(dados.data_base))
      const fatorTetoNov21 = TABELA_IPCA_FATORES_EC113["2021"]?.[10] ?? FATOR_TETO_DEZ21
      const aplicaIpcaFator = baseMesPss <= DATA_FIM_JUROS_PRE22

      let valorIpca = pssBase
      if (aplicaIpcaFator) {
        const fatorInicial = dados.ipca_fator_inicial ?? getFatorIPCA(baseMesPss.getMonth(), baseMesPss.getFullYear())
        const fatorFinal = dados.ipca_fator_final ?? fatorTetoNov21
        if (fatorInicial > 0) {
          valorIpca = (pssBase / fatorInicial) * fatorFinal
        }
      }

      let selicPercentual = dados.dados_selic?.taxaAcumulada ?? dados.selic_acumulada_percentual
      if (selicPercentual === undefined) {
        let somaSelic = 0
        const fimCalculoPss = inicioMes(new Date(dados.data_final_calculo ?? dados.data_base ?? new Date()))
        const selicInicio = baseMesPss > DATA_INICIO_MODELO_B ? baseMesPss : DATA_INICIO_MODELO_B
        const selicFim = minDate(fimCalculoPss, DATA_FIM_SELIC)
        if (selicInicio <= selicFim) {
          forEachMesInclusivo(selicInicio, selicFim, (mes) => {
            const mesAno = toMesAno(mes)
            somaSelic += getIndiceSelicEC113(mesAno)
          })
        }
        selicPercentual = somaSelic
      }
      const valorSelicPss = pssBase * (selicPercentual / 100)

      let ipca2025Percentual = dados.dados_ipca_2025?.percentualAcumulado
      if (ipca2025Percentual === undefined) {
        const inicioIpca2025Base = inicioMes(new Date(dados.data_base))
        const inicioIpca2025 = inicioIpca2025Base > DATA_INICIO_MODELO_C ? inicioIpca2025Base : DATA_INICIO_MODELO_C
        const fimIpca2025 = inicioMes(new Date())
        if (inicioIpca2025 <= fimIpca2025) {
          let somaIpca2025 = 0
          forEachMesInclusivo(inicioIpca2025, fimIpca2025, (mes) => {
            const mesAno = toMesAno(mes)
            somaIpca2025 += getIndiceIpcaE(mesAno)
          })
          ipca2025Percentual = somaIpca2025
        } else {
          ipca2025Percentual = 0
        }
      }
      const valorIpca2025Pss = pssBase * (ipca2025Percentual / 100)

      pss = round2(valorIpca + valorSelicPss + valorIpca2025Pss)
    } else {
      const baseIncidenciaPSS = valorAtualizadoFinal - dados.adiantamento_recebido
      const salarioMinimo = dados.salario_minimo_referencia || 1518
      const smConta = baseIncidenciaPSS / salarioMinimo
      pss = calcularPSSPorFaixas(smConta, salarioMinimo)
    }
  }

  // IRPF
  let irpf = 0
  if (dados.irpf_manual && dados.valor_irpf !== undefined) {
    irpf = dados.valor_irpf
  }
  else if (dados.meses_execucao_anterior > 0) {
    const saldoCredorSemDesconto = valorAtualizadoFinal - dados.adiantamento_recebido
    irpf = calcularIRPFComMeses(
      saldoCredorSemDesconto,
      dados.valor_principal_original,
      dados.valor_juros_original,
      dados.multa,
      dados.meses_execucao_anterior,
      dados.tipo_beneficiario,
      valorCorrigido,
      valorSelic,
      correcaoIPCA2025,
    )
  }

  const totalDescontos = pss + irpf

  const adiantamentoValor = dados.honorarios_manual && dados.adiantamento_valor !== undefined
    ? dados.adiantamento_valor
    : dados.adiantamento_recebido

  const saldoCredor = valorAtualizadoFinal - totalDescontos - adiantamentoValor
  const saldoLiquidoCredor = saldoCredor

  const percMinima = dados.percentual_proposta_minima ?? 65
  const percMaxima = dados.percentual_proposta_maxima ?? 66
  const percComissao = dados.percentual_comissao ?? 5

  let menorProposta = saldoLiquidoCredor * (percMinima / 100)
  let maiorProposta = saldoLiquidoCredor * (percMaxima / 100)

  if (dados.propostas_manual) {
    menorProposta = dados.menor_proposta_manual ?? menorProposta
    maiorProposta = dados.maior_proposta_manual ?? maiorProposta
  }

  const comissaoApax = saldoLiquidoCredor * (percComissao / 100)
  const valorMaximoAquisicao = menorProposta - comissaoApax

  return {
    total_conta_original: dados.valor_principal_original,
    valor_corrigido_monetariamente: valorCorrigido, // IPCA Corrected
    valor_atualizado: valorAtualizadoFinal,
    juros_mora_aplicados: valorJurosPre22, // Valor
    valorJuros: valorJurosPre22,
    valorSelic: valorSelic,

    detalhamento_mensal: detalhamento,
    memoriaCalculo, // Exposed!

    adiantamento_recebido: adiantamentoValor,
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
  tipoBeneficiario?: "credor" | "advogado",
  valorCorrigidoMonetariamente?: number,
  valorSelicAplicada?: number,
  correcaoIpca2025?: number,
): number {
  const tipo = (tipoBeneficiario ?? "credor")
  const mesesRra = meses > 0 ? meses : 1

  if (tipo !== "advogado") {
    // Base = Principal + CorreÃ§Ã£o IPCA + SELIC + EC136/2025
    const correcaoIpca = Math.max(0, (valorCorrigidoMonetariamente ?? principal) - principal)
    const selicValor = Math.max(0, valorSelicAplicada ?? 0)
    const ec136Valor = Math.max(0, correcaoIpca2025 ?? 0)
    const baseBruta = principal + correcaoIpca + selicValor + ec136Valor
    const baseMensal = baseBruta / mesesRra

    let aliquota = 0
    let parcela = 0

    if (baseMensal <= 2428.8) {
      aliquota = 0
      parcela = 0
    } else if (baseMensal <= 2826.65) {
      aliquota = 7.5
      parcela = 182.16
    } else if (baseMensal <= 3751.05) {
      aliquota = 15.0
      parcela = 394.16
    } else if (baseMensal <= 4664.68) {
      aliquota = 22.5
      parcela = 675.49
    } else {
      aliquota = 27.5
      parcela = 908.73
    }

    const impostoTotal = Math.max(0, baseBruta * (aliquota / 100) - parcela * mesesRra)
    return impostoTotal
  }

  const baseExecucao = principal + juros + multa
  const baseMensal = baseExecucao / mesesRra

  console.log("[v0] ========== CÃLCULO IRPF RRA (DUAS BASES) ==========")
  console.log("[v0] BASE 1 - Para descobrir faixa:", baseMensal.toFixed(2))

  const faixas = [
    { limite: 2428.8, aliquota: 0, parcela_deduzir: 0 },
    { limite: 2826.65, aliquota: 0.075, parcela_deduzir: 182.16 },
    { limite: 3751.05, aliquota: 0.15, parcela_deduzir: 394.16 },
    { limite: 4664.68, aliquota: 0.225, parcela_deduzir: 675.49 },
    { limite: Number.POSITIVE_INFINITY, aliquota: 0.275, parcela_deduzir: 908.73 },
  ]

  let faixaSelecionada = faixas[0]
  for (const faixa of faixas) {
    if (baseMensal <= faixa.limite) {
      faixaSelecionada = faixa
      break
    }
  }

  const deducaoTotal = faixaSelecionada.parcela_deduzir * mesesRra

  const irBruto = saldoCredorSemDesconto * faixaSelecionada.aliquota
  const irpfTotal = irBruto - deducaoTotal

  console.log("[v0] IR Final:", irpfTotal.toFixed(2))

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

