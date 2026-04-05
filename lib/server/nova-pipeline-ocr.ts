/**
 * Nova Pipeline OCR — Setor de Atendimento
 * Estratégia híbrida: extrai texto com pdf-parse → avalia qualidade →
 * envia para GPT-4o (texto ou imagem via Vision quando canvas disponível).
 */
import pdfParse from "pdf-parse"

export interface RegistroExtraido {
  arquivo: string
  credor_nome: string | null
  credor_cpf_cnpj: string | null
  numero_precatorio: string | null
  numero_processo: string | null
  numero_oficio: string | null
  tribunal: string | null
  devedor: string | null
  valor_principal: number | null
  natureza: string | null
  data_expedicao: string | null
  advogado_nome: string | null
  _qualidade: "boa" | "pobre"
  _aviso?: string
}

export interface ResultadoPDF {
  arquivo: string
  registros: RegistroExtraido[]
  erro?: string
  qualidade: "boa" | "pobre"
  numPaginas: number
  charsExtraidos: number
}

const QUALIDADE_MIN_CHARS_POR_PAGINA = 80

function avaliarQualidade(texto: string, numPaginas: number): "boa" | "pobre" {
  if (!texto || texto.trim().length === 0) return "pobre"
  const charsPorPagina = texto.length / Math.max(numPaginas, 1)
  return charsPorPagina >= QUALIDADE_MIN_CHARS_POR_PAGINA ? "boa" : "pobre"
}

function normalizarTexto(texto: string): string {
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function construirPrompt(texto: string, nomeArquivo: string): string {
  return `Você é um especialista em extração de dados de documentos jurídicos brasileiros, especificamente ofícios requisitórios e precatórios.

Analise o texto abaixo extraído do arquivo "${nomeArquivo}" e extraia TODOS os credores/precatórios encontrados.

REGRAS:
- Um documento pode conter múltiplos credores/precatórios — extraia TODOS
- CPF: formato NNN.NNN.NNN-NN ou apenas os 11 dígitos
- CNPJ: formato NN.NNN.NNN/NNNN-NN ou apenas os 14 dígitos
- Números CNJ: formato NNNNNNN-NN.NNNN.N.NN.NNNN
- valor_principal: apenas número decimal (ex: 125000.50), sem R$ ou pontos de milhar
- natureza: apenas "Alimentar" ou "Comum" (ou null se não identificado)
- data_expedicao: formato ISO YYYY-MM-DD
- tribunal: sigla apenas (ex: TJPR, TRF4, TRT9, STJ)
- devedor: nome do ente público (ex: "Estado do Paraná", "União Federal", "Município de São Paulo")
- Se um campo não for encontrado, use null

TEXTO DO DOCUMENTO:
${texto.slice(0, 12000)}

Retorne APENAS um JSON válido, sem markdown, sem explicações:
{"registros": [{"credor_nome": null, "credor_cpf_cnpj": null, "numero_precatorio": null, "numero_processo": null, "numero_oficio": null, "tribunal": null, "devedor": null, "valor_principal": null, "natureza": null, "data_expedicao": null, "advogado_nome": null}]}`
}

async function chamarGPT4o(
  prompt: string,
  apiKey: string
): Promise<RegistroExtraido[]> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você extrai dados estruturados de documentos jurídicos brasileiros. Responda SEMPRE em JSON válido conforme solicitado.",
        },
        { role: "user", content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw new Error(`OpenAI erro ${response.status}: ${errText.slice(0, 200)}`)
  }

  const json = await response.json()
  const content = json.choices?.[0]?.message?.content ?? ""

  let parsed: { registros?: unknown[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Resposta GPT-4o não é JSON válido: ${content.slice(0, 200)}`)
  }

  if (!Array.isArray(parsed.registros)) return []

  return parsed.registros.map((r: unknown) => {
    const rec = (r ?? {}) as Record<string, unknown>
    return {
      arquivo: "",
      credor_nome: typeof rec.credor_nome === "string" ? rec.credor_nome.trim() || null : null,
      credor_cpf_cnpj: typeof rec.credor_cpf_cnpj === "string" ? rec.credor_cpf_cnpj.trim() || null : null,
      numero_precatorio: typeof rec.numero_precatorio === "string" ? rec.numero_precatorio.trim() || null : null,
      numero_processo: typeof rec.numero_processo === "string" ? rec.numero_processo.trim() || null : null,
      numero_oficio: typeof rec.numero_oficio === "string" ? rec.numero_oficio.trim() || null : null,
      tribunal: typeof rec.tribunal === "string" ? rec.tribunal.trim() || null : null,
      devedor: typeof rec.devedor === "string" ? rec.devedor.trim() || null : null,
      valor_principal:
        typeof rec.valor_principal === "number"
          ? rec.valor_principal
          : typeof rec.valor_principal === "string"
          ? parseFloat(rec.valor_principal.replace(",", ".")) || null
          : null,
      natureza: typeof rec.natureza === "string" ? rec.natureza.trim() || null : null,
      data_expedicao: typeof rec.data_expedicao === "string" ? rec.data_expedicao.trim() || null : null,
      advogado_nome: typeof rec.advogado_nome === "string" ? rec.advogado_nome.trim() || null : null,
      _qualidade: "boa" as const,
    }
  })
}

export async function processarPDF(
  buffer: Buffer,
  nomeArquivo: string
): Promise<ResultadoPDF> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada")

  let texto = ""
  let numPaginas = 1

  try {
    const parsed = await pdfParse(buffer)
    texto = normalizarTexto(parsed.text ?? "")
    numPaginas = parsed.numpages ?? 1
  } catch (err) {
    return {
      arquivo: nomeArquivo,
      registros: [],
      erro: `Falha ao ler PDF: ${err instanceof Error ? err.message : String(err)}`,
      qualidade: "pobre",
      numPaginas: 0,
      charsExtraidos: 0,
    }
  }

  const qualidade = avaliarQualidade(texto, numPaginas)
  const aviso =
    qualidade === "pobre"
      ? "PDF com texto escasso (possivelmente escaneado). Revise os dados extraídos com atenção."
      : undefined

  let registros: RegistroExtraido[] = []
  let erro: string | undefined

  try {
    const prompt = construirPrompt(texto, nomeArquivo)
    registros = await chamarGPT4o(prompt, apiKey)
    registros = registros.map((r) => ({
      ...r,
      arquivo: nomeArquivo,
      _qualidade: qualidade,
      _aviso: aviso,
    }))
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err)
  }

  return {
    arquivo: nomeArquivo,
    registros,
    erro,
    qualidade,
    numPaginas,
    charsExtraidos: texto.length,
  }
}
