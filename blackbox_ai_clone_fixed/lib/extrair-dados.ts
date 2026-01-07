export interface DadosExtraidos {
  numero_processo?: string
  numero_precatorio?: string
  numero_oficio_requisitorio?: string
  vara_origem?: string
  comarca?: string
  tribunal?: string
  autor_credor_originario?: string
  advogado_acao?: string
  natureza_ativo?: string
  valor_principal_original?: number
  valor_juros_original?: number
  multa?: number
  honorarios_contratuais?: number
  data_expedicao?: string
}

export function extrairDadosDeTexto(conteudo: string): DadosExtraidos {
  const linhas = conteudo.split(/\r?\n/).map((l) => l.trim())
  const resultado: DadosExtraidos = {}

  const procurarValorMonetario = (texto: string): number | undefined => {
    const match = texto.match(/R?\$?\s*([\d.,]+)/i)
    if (!match) return undefined
    const normalizado = match[1].replace(/\./g, "").replace(",", ".")
    const valor = Number(normalizado)
    if (isNaN(valor)) return undefined
    return valor
  }

  for (const linha of linhas) {
    const lower = linha.toLowerCase()

    if (lower.includes("processo n") || lower.includes("nº do processo")) {
      const match = linha.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/)
      if (match) resultado.numero_processo = match[1]
    }

    if (lower.includes("precatório") || lower.includes("precatorio")) {
      const match = linha.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/)
      if (match) resultado.numero_precatorio = match[1]
    }

    if (lower.includes("ofício requisitório") || lower.includes("oficio requisitorio")) {
      const match = linha.match(/(\d{8}\/\d{4})/)
      if (match) resultado.numero_oficio_requisitorio = match[1]
    }

    if (lower.includes("vara") && !resultado.vara_origem) {
      resultado.vara_origem = linha
    }

    if (lower.includes("comarca") && !resultado.comarca) {
      resultado.comarca = linha
    }

    if (lower.includes("tribunal") && !resultado.tribunal) {
      resultado.tribunal = linha
    }

    if ((lower.includes("autor") || lower.includes("exequente")) && !resultado.autor_credor_originario) {
      resultado.autor_credor_originario = linha
    }

    if (lower.includes("advogado") && !resultado.advogado_acao) {
      resultado.advogado_acao = linha
    }

    if (lower.includes("natureza") && !resultado.natureza_ativo) {
      resultado.natureza_ativo = linha
    }

    if (lower.includes("valor principal") && resultado.valor_principal_original == null) {
      const v = procurarValorMonetario(linha)
      if (v != null) resultado.valor_principal_original = v
    }

    if (lower.includes("juros") && resultado.valor_juros_original == null) {
      const v = procurarValorMonetario(linha)
      if (v != null) resultado.valor_juros_original = v
    }

    if (lower.includes("multa") && resultado.multa == null) {
      const v = procurarValorMonetario(linha)
      if (v != null) resultado.multa = v
    }

    if (lower.includes("honorários") && resultado.honorarios_contratuais == null) {
      const v = procurarValorMonetario(linha)
      if (v != null) resultado.honorarios_contratuais = v
    }

    if (lower.includes("expedido em") || lower.includes("data de expedição")) {
      const match = linha.match(/(\d{2}\/\d{2}\/\d{4})/)
      if (match) {
        const [dia, mes, ano] = match[1].split("/")
        resultado.data_expedicao = `${ano}-${mes}-${dia}`
      }
    }
  }

  return resultado
}
