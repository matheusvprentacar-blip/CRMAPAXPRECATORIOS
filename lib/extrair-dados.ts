export interface DadosExtraidos {
  numero_processo?: string
  numero_precatorio?: string
  numero_oficio_requisitorio?: string
  vara_origem?: string
  comarca?: string
  tribunal?: string
  autor_credor_originario?: string
  cpf_cnpj?: string
  advogado_acao?: string
  natureza_ativo?: string
  valor_principal_original?: number
  valor_juros_original?: number
  multa?: number
  honorarios_contratuais?: number
  data_expedicao?: string
}

export function extrairDadosDeTexto(conteudo: string): DadosExtraidos {
  const linhas = conteudo.split(/\r?\n/).map((l) => l.trim()).filter(l => l.length > 0)
  const resultado: DadosExtraidos = {}

  // Helper para limpar chaves (ex: "Autor: João" -> "João")
  const limparChave = (linha: string, chaves: string[]) => {
    let texto = linha
    for (const chave of chaves) {
      const regex = new RegExp(`${chave}\\s*[:.-]?\\s*`, 'i')
      texto = texto.replace(regex, '')
    }
    return texto.trim()
  }

  const procurarValorMonetario = (texto: string): number | undefined => {
    // Tenta pegar o último valor da linha primeiro, pois geralmente é onde está o R$
    const matches = texto.matchAll(/R?\s?\$?\s?([\d.,]{3,})/gi)
    let lastValue: number | undefined

    for (const match of matches) {
      let valStr = match[1]
      // Validação básica para evitar números de processo ou datas
      if (valStr.includes('.') && valStr.includes(',')) {
        // Formato brasileiro padrão: 1.000,00
        valStr = valStr.replace(/\./g, "").replace(",", ".")
      } else if (valStr.includes(',') && !valStr.includes('.')) {
        // Apenas vírgula: 1000,00
        valStr = valStr.replace(",", ".")
      } else if ((valStr.match(/\./g) || []).length > 1) {
        // 1.000.000 (sem virgula decimal explicita, assumir inteiro)
        valStr = valStr.replace(/\./g, "")
      }

      const valor = Number(valStr)
      if (!isNaN(valor)) {
        lastValue = valor
      }
    }
    return lastValue
  }

  // Busca Geral no Texto Completo
  const cpfCnpjMatch = conteudo.match(/(\d{2,3}\.\d{3}\.\d{3}[/\-]\d{2,4}[-]?\d{2})/)
  if (cpfCnpjMatch) resultado.cpf_cnpj = cpfCnpjMatch[1]

  const tribunalMatch = conteudo.match(/(TJ-?[A-Z]{2}|TRF-?\d{1,2}|STJ|STF)/i)
  if (tribunalMatch) resultado.tribunal = tribunalMatch[1].toUpperCase().replace("-", "")

  for (const linha of linhas) {
    const lower = linha.toLowerCase()

    // --- Identificadores ---
    // Prioriza "Processo Originário" ou "Autos"
    if ((lower.includes("processo") || lower.includes("autos")) && !resultado.numero_processo) {
      const match = linha.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/)
      if (match) resultado.numero_processo = match[1]
    }

    if ((lower.includes("precatório") || lower.includes("precatorio") || lower.includes("requisitorio")) && !resultado.numero_precatorio) {
      const match = linha.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/)
      if (match) resultado.numero_precatorio = match[1]
      // Fallback simples para números curtos se for ofício
      if (!match && lower.includes("oficio")) {
        const matchOficio = linha.match(/(\d{4,}\/\d{4})/)
        if (matchOficio) resultado.numero_oficio_requisitorio = matchOficio[1]
      }
    }

    // --- Pessoas ---
    if ((lower.includes("beneficiário") || lower.includes("credor") || lower.includes("exequente") || lower.includes("requerente")) && !resultado.autor_credor_originario) {
      // Evita capturar linhas que sejam apenas títulos
      if (linha.length > 15 && !lower.includes("cpf") && !lower.includes("cnpj")) {
        resultado.autor_credor_originario = limparChave(linha, ["beneficiário", "credor", "exequente", "requerente", "autor"])
      }
    }

    if (lower.includes("advogado") && !resultado.advogado_acao) {
      if (linha.length > 10) {
        resultado.advogado_acao = limparChave(linha, ["advogado"])
      }
    }

    // --- Natureza ---
    if (lower.includes("natureza") && !resultado.natureza_ativo) {
      if (lower.includes("alimentar")) resultado.natureza_ativo = "Alimentar"
      else if (lower.includes("comum")) resultado.natureza_ativo = "Comum"
      else resultado.natureza_ativo = limparChave(linha, ["natureza"])
    }

    // --- Valores ---
    if ((lower.includes("valor principal") || lower.includes("valor de face") || lower.includes("valor requisitado")) && resultado.valor_principal_original == null) {
      const v = procurarValorMonetario(linha)
      if (v != null) resultado.valor_principal_original = v
    }

    // Data Expedição
    if (!resultado.data_expedicao && (lower.includes("expedição") || lower.includes("data"))) {
      const match = linha.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (match) {
        const [_, dia, mes, ano] = match
        // Valida ano razoável
        if (parseInt(ano) > 1980 && parseInt(ano) < 2050) {
          resultado.data_expedicao = `${ano}-${mes}-${dia}`
        }
      }
    }
  }

  return resultado
}
