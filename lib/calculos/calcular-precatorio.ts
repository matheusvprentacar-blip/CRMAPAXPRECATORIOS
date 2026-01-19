import { getIndice, TABELA_INDICES_COMPLETA } from "./indices"
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

  // OBS: Se informado, este valor será usado diretamente como TOTA % de Juros Pré-22
  taxa_juros_pre_22_acumulada?: number

  // [NEW] Overrides from StepIndices
  ipca_fator_inicial?: number
  ipca_fator_final?: number
  selic_acumulada_percentual?: number

  // Flags
  tem_desconto_pss: boolean
  isencao_pss: boolean
  percentual_pss?: number // Não usado, mantido para compatibilidade

  pss_oficio_valor?: number // PSS do Ofício
  pss_valor?: number // PSS Atualizado (já calculado no StepPSS)
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

  propostas_manual?: boolean
  menor_proposta_manual?: number
  maior_proposta_manual?: number
}

export interface DetalhamentoMensal {
  data: string
  valor_anterior: number
  indice: number
  tipo_indice: "SELIC" | "IPCA-E" | "Juros Pré-22"
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

  // Detalhamento e Memória
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

function getFatorIPCA(mes: number, ano: number): number {
  const anoStr = ano.toString();
  if (TABELA_IPCA_FATORES_EC113[anoStr]) {
    // Array is 0-indexed (0=Jan, 11=Dez)
    return TABELA_IPCA_FATORES_EC113[anoStr][mes] || 0;
  }
  return 0;
}

function getSumSELIC(inicio: Date, fim: Date): number {
  let sum = 0;
  let current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const endDate = new Date(fim.getFullYear(), fim.getMonth(), 1);

  while (current <= endDate) {
    const anoStr = current.getFullYear().toString();
    const mesIndex = current.getMonth();

    if (TABELA_SELIC_PERCENTUAL_EC113[anoStr]) {
      sum += TABELA_SELIC_PERCENTUAL_EC113[anoStr][mesIndex] || 0;
    }

    current.setMonth(current.getMonth() + 1);
  }
  return sum;
}

// --- CORE CALCULATION FUNCTIONS ---

function calcularAtualizacaoMensal(
  totalContaOriginal: number,
  valorPrincipalOriginal: number,
  dataInicial: Date,
  dataFinal: Date,
  taxaJurosMoraPre2022: number = 0, // percentual total (ex: 12.5 para 12.5%)
  overrides: {
    ipca_fator_inicial?: number
    ipca_fator_final?: number
    selic_acumulada_percentual?: number
  } = {}
): {
  valorCorrigido: number
  detalhamento: DetalhamentoMensal[]
  valorPrincipalAtualizado: number
  valorSelic: number
  valorJurosPre22: number
  memoriaCalculo: any
} {
  const inicio = new Date(dataInicial);
  const fim = new Date(dataFinal);
  const dataCorte = new Date(2022, 0, 1); // 01/01/2022

  const detalhamento: DetalhamentoMensal[] = [];
  const memoriaCalculo: any = {};

  // 1. CÁLCULO IPCA-E (FATOR)
  const aplica_ipca = inicio < dataCorte;

  let val_Principal_IPCA = valorPrincipalOriginal;
  let val_IPCA = totalContaOriginal;
  let fatorOrigem = 0;
  let fatorDestino = 0;

  if (aplica_ipca) {
    if (overrides.ipca_fator_inicial !== undefined) {
      fatorOrigem = overrides.ipca_fator_inicial;
    } else {
      fatorOrigem = getFatorIPCA(inicio.getMonth(), inicio.getFullYear());
    }

    if (overrides.ipca_fator_final !== undefined) {
      fatorDestino = overrides.ipca_fator_final;
    } else {
      fatorDestino = FATOR_TETO_DEZ21;
    }

    if (fatorOrigem > 0) {
      // Fórmula Strict: (Principal / FatorInicial) * FatorFinal
      val_Principal_IPCA = (valorPrincipalOriginal / fatorOrigem) * fatorDestino;
      val_IPCA = val_Principal_IPCA; // Sync for return

      detalhamento.push({
        data: "IPCA-E (Correção)",
        valor_anterior: valorPrincipalOriginal,
        indice: fatorDestino / fatorOrigem,
        tipo_indice: "IPCA-E",
        correcao: val_Principal_IPCA - valorPrincipalOriginal,
        valor_atualizado: val_Principal_IPCA
      });

      memoriaCalculo.ipca = {
        formula: "(Principal / FatorInicial) * FatorFinal",
        fatorInicial: fatorOrigem,
        fatorFinal: fatorDestino,
        principalOriginal: valorPrincipalOriginal,
        base: valorPrincipalOriginal,
        resultado: val_Principal_IPCA
      };
    }
  } else {
    val_Principal_IPCA = valorPrincipalOriginal;
    val_IPCA = valorPrincipalOriginal;

    memoriaCalculo.ipca = {
      formula: "Data Início >= 01/2022 (Sem Correção IPCA-E)",
      fatorInicial: 0,
      fatorFinal: 0,
      principalOriginal: valorPrincipalOriginal,
      base: valorPrincipalOriginal,
      resultado: val_Principal_IPCA
    };
  }

  // 2. CÁLCULO JUROS MORA (PRÉ-2022)
  // Base: Principal Ajustado
  const taxaJurosPre22 = taxaJurosMoraPre2022;
  const val_JurosPre22 = val_Principal_IPCA * (taxaJurosPre22 / 100);

  if (taxaJurosPre22 > 0) {
    detalhamento.push({
      data: "Juros Moratórios",
      valor_anterior: val_Principal_IPCA,
      indice: taxaJurosPre22,
      tipo_indice: "Juros Pré-22", // Internal
      correcao: val_JurosPre22,
      valor_atualizado: val_JurosPre22
    });
  }

  memoriaCalculo.juros = {
    formula: "Principal Corrigido(IPCA) * Percentual Juros Pré-22",
    base: val_Principal_IPCA,
    percentual: taxaJurosPre22,
    resultado: val_JurosPre22
  };


  // 3. CÁLCULO SELIC (PÓS-2022)
  // [UPDATED] Regra da Imagem: Aplicar % sobre o valor JÁ CORRIGIDO pelo IPCA

  let somaSelicPercentual = 0;

  if (overrides.selic_acumulada_percentual !== undefined) {
    somaSelicPercentual = overrides.selic_acumulada_percentual;
  } else {
    let selicStart = inicio < dataCorte ? new Date(2022, 0, 1) : new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    somaSelicPercentual = getSumSELIC(selicStart, fim);
  }

  const val_Selic = val_Principal_IPCA * (somaSelicPercentual / 100);

  detalhamento.push({
    data: "SELIC Acumulada",
    valor_anterior: val_Principal_IPCA, // Base
    indice: somaSelicPercentual, // %
    tipo_indice: "SELIC",
    correcao: val_Selic,
    valor_atualizado: val_Selic // Valor gerado
  });

  memoriaCalculo.selic = {
    formula: "Principal Corrigido * Percentual SELIC Acumulada",
    base: val_Principal_IPCA,
    percentual: somaSelicPercentual,
    resultado: val_Selic
  }

  return {
    valorCorrigido: val_IPCA,
    valorSelic: val_Selic,
    valorJurosPre22: val_JurosPre22,
    valorPrincipalAtualizado: val_Principal_IPCA,
    detalhamento,
    memoriaCalculo
  };
}

export function calcularPrecatorio(dados: DadosEntrada): ResultadoCalculo {
  console.log("[v0] ===== INÍCIO CÁLCULO PRECATÓRIO (MODE: EC113 SPREADSHEET) =====")
  console.log("[v0] Valor Principal Original:", dados.valor_principal_original)

  let taxaTotalJurosPre22 = 0;

  // Prioridade: Campo explícito > Cálculo automático
  // [FORCE AUTO CALC] Desativando override para garantir regra de 0.5% a.m.
  if (false && dados.taxa_juros_pre_22_acumulada !== undefined) {
    taxaTotalJurosPre22 = dados.taxa_juros_pre_22_acumulada;
    // console.log("[v0] Usando Taxa Juros Pré-22 Explícita:", taxaTotalJurosPre22);
  } else {
    // Cálculo automático meses * taxa mensal
    // [STRICT RULE] Usuário definiu "adicionar 0,50 ao mês". Ignorando taxas de entrada para forçar 0.5%.
    const jurosMoraPercentual = 0.005;
    /* dados.taxa_juros_mora ??
    dados.taxa_juros_moratorios ??
    dados.juros_mora_percentual ??
    0.005 */

    const taxaMensalJuros = jurosMoraPercentual * 100; // 0.5%

    // [UPDATED] Juros Moratórios: Full Period (Start -> End) as per user request (61.5% logic)
    const fim = new Date(dados.data_final_calculo);
    const inicio = new Date(dados.data_inicial_calculo || dados.data_base);
    // const dataCorte = new Date(2022, 0, 1); // Ignorar corte 2022 para Juros

    if (inicio < fim) {
      const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
      if (meses > 0) {
        taxaTotalJurosPre22 = meses * taxaMensalJuros;
      }
    }
  }

  const totalContaOriginal = dados.valor_principal_original + (dados.valor_juros_original || 0) + (dados.multa || 0)

  const {
    valorCorrigido, // IPCA Corrected Total
    valorSelic, // SELIC Amount
    valorJurosPre22, // Juros Mora Amount
    detalhamento,
    memoriaCalculo
  } = calcularAtualizacaoMensal(
    totalContaOriginal,
    dados.valor_principal_original,
    dados.data_inicial_calculo || dados.data_base, // Fallback to Data Base if Data Inicial undefined
    dados.data_final_calculo,
    taxaTotalJurosPre22,
    {
      ipca_fator_inicial: dados.ipca_fator_inicial,
      ipca_fator_final: dados.ipca_fator_final,
      selic_acumulada_percentual: dados.selic_acumulada_percentual
    }
  )

  // FÓRMULA FINAL DO USUÁRIO:
  // Valor Atualizado = IPCA + Juros + Selic
  const valorAtualizadoFinal = valorCorrigido + valorJurosPre22 + valorSelic;

  console.log("[v0] Memória de Cálculo:", memoriaCalculo);
  console.log("[v0] Valor Atualizado Final:", valorAtualizadoFinal);

  // --- CÁLCULO PSS E IRPF ---

  // PSS
  let pss = 0
  if (dados.tem_desconto_pss && !dados.isencao_pss) {
    if (dados.pss_valor !== undefined && dados.pss_valor !== null) {
      pss = dados.pss_valor
    } else if (dados.pss_oficio_valor && dados.juros_mora_percentual !== undefined) {
      const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
      pss = round2(dados.pss_oficio_valor * (1 + dados.juros_mora_percentual))
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
): number {
  if (meses <= 0) return 0

  const baseExecucao = principal + juros + multa
  const baseMensal = baseExecucao / meses

  console.log("[v0] ========== CÁLCULO IRPF RRA (DUAS BASES) ==========")
  console.log("[v0] BASE 1 - Para descobrir faixa:", baseMensal.toFixed(2))

  const faixas = [
    { limite: 1903.98, aliquota: 0, parcela_deduzir: 0 },
    { limite: 2826.65, aliquota: 0.075, parcela_deduzir: 142.8 },
    { limite: 3751.05, aliquota: 0.15, parcela_deduzir: 354.8 },
    { limite: 4664.68, aliquota: 0.225, parcela_deduzir: 636.13 },
    { limite: Number.POSITIVE_INFINITY, aliquota: 0.275, parcela_deduzir: 869.36 },
  ]

  let faixaSelecionada = faixas[0]
  for (const faixa of faixas) {
    if (baseMensal <= faixa.limite) {
      faixaSelecionada = faixa
      break
    }
  }

  const deducaoTotal = faixaSelecionada.parcela_deduzir * meses

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
