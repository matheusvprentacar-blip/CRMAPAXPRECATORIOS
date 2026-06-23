import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export const runtime = "nodejs"
export const maxDuration = 60

const CAMPOS_SISTEMA = [
  "credor_nome",
  "credor_cpf_cnpj",
  "numero_precatorio",
  "numero_processo",
  "numero_oficio",
  "tribunal",
  "devedor",
  "valor_principal",
  "natureza",
  "data_expedicao",
  "advogado_nome",
] as const

interface MapeamentoColunas {
  [colunaOriginal: string]: string | null
}

async function detectarMapeamento(
  headers: string[],
  amostra: Record<string, string>[],
  apiKey: string
): Promise<MapeamentoColunas> {
  const prompt = `Você recebe os cabeçalhos e uma amostra de linhas de uma planilha de precatórios brasileiros.
Mapeie CADA coluna da planilha para um dos campos do sistema abaixo (use null se a coluna não corresponder a nenhum campo).

CAMPOS DO SISTEMA:
${CAMPOS_SISTEMA.map((c) => `- ${c}`).join("\n")}

CABEÇALHOS DA PLANILHA:
${JSON.stringify(headers)}

AMOSTRA DE DADOS (primeiras linhas):
${JSON.stringify(amostra.slice(0, 5), null, 2)}

REGRAS:
- "Valor Requisitório", "Valor Principal", "Valor", "Montante" → valor_principal
- "Credor", "Nome", "Beneficiário", "Requerente" → credor_nome
- "CPF", "CNPJ", "CPF/CNPJ", "Documento" → credor_cpf_cnpj
- "Nº do precatório", "Precatório", "Número Precatório" → numero_precatorio
- "Processo", "Nº Processo", "Número do Processo" → numero_processo
- "Ofício", "Nº Ofício" → numero_oficio
- "Tribunal", "TJ", "Órgão" → tribunal
- "Devedor", "Ente", "Entidade" → devedor
- "Advogado", "Patrono" → advogado_nome
- "Natureza" → natureza
- "Data Expedição", "Expedição", "Data" → data_expedicao
- Mapeie TODAS as colunas, mesmo que o nome seja diferente dos exemplos

Retorne APENAS um JSON válido:
{"mapeamento": {"NOME_EXATO_COLUNA": "campo_sistema_ou_null"}}`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Você mapeia colunas de planilhas para campos de sistema de precatórios. Responda APENAS em JSON.",
        },
        { role: "user", content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI erro ${response.status}`)
  }

  const json = await response.json()
  const content = json.choices?.[0]?.message?.content ?? "{}"
  const parsed = JSON.parse(content)
  const rawMapeamento = (parsed.mapeamento ?? {}) as MapeamentoColunas

  // Normaliza as chaves do GPT-4o contra os headers reais (case-insensitive, trim)
  // para evitar mismatch por espaços ou diferenças de capitalização
  const normalize = (s: string) => s.trim().toLowerCase()
  const headerMap: Record<string, string> = {}
  for (const h of headers) headerMap[normalize(h)] = h

  const mapeamentoFinal: MapeamentoColunas = {}
  for (const [chaveGPT, campo] of Object.entries(rawMapeamento)) {
    const headerReal = headerMap[normalize(chaveGPT)] ?? chaveGPT
    mapeamentoFinal[headerReal] = campo
  }
  // Garante que todos os headers existam no mapeamento (null se GPT não retornou)
  for (const h of headers) {
    if (!(h in mapeamentoFinal)) mapeamentoFinal[h] = null
  }

  return mapeamentoFinal
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY não configurada." }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 })
    }

    const isExcel =
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".csv")
    if (!isExcel) {
      return NextResponse.json(
        { error: "Apenas .xlsx, .xls ou .csv são aceitos." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // Lê como matriz (raw:false p/ datas/números virem como string formatada) e
    // detecta a LINHA DE CABEÇALHO real. Planilhas costumam ter título/linhas
    // vazias no topo; o sheet_to_json padrão geraria colunas "__EMPTY" e trataria
    // a linha de rótulos como se fosse um registro.
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    })

    const ehTexto = (v: unknown) => typeof v === "string" && v.trim() !== ""
    let headerIdx = matriz.findIndex((row) => row.filter(ehTexto).length >= 3)
    if (headerIdx === -1) headerIdx = 0

    // Cabeçalho com nomes únicos (evita colisão quando há rótulos repetidos).
    const usados = new Map<string, number>()
    const headers: string[] = (matriz[headerIdx] ?? []).map((c, idx) => {
      const base = String(c ?? "").trim() || `Coluna ${idx + 1}`
      const n = usados.get(base) ?? 0
      usados.set(base, n + 1)
      return n === 0 ? base : `${base}_${n}`
    })

    // Converte as linhas seguintes em objetos por coluna, pulando linhas vazias.
    const linhas: Record<string, string>[] = []
    for (let i = headerIdx + 1; i < matriz.length; i++) {
      const row = matriz[i]
      const temConteudo = row.some((c) => ehTexto(c) || typeof c === "number")
      if (!temConteudo) continue
      const obj: Record<string, string> = {}
      headers.forEach((h, idx) => {
        obj[h] = row[idx] == null ? "" : String(row[idx])
      })
      linhas.push(obj)
    }

    if (linhas.length === 0) {
      return NextResponse.json({ error: "Planilha vazia." }, { status: 400 })
    }
    const mapeamento = await detectarMapeamento(headers, linhas, apiKey)

    // Retorna linhas BRUTAS — o cliente aplica o mapeamento para permitir correção interativa
    return NextResponse.json({
      ok: true,
      mapeamento,
      headers,
      linhas,
      totalLinhas: linhas.length,
    })
  } catch (err) {
    console.error("[IMPORTAR_EXCEL]", err)
    const message = err instanceof Error ? err.message : "Erro interno no servidor."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
