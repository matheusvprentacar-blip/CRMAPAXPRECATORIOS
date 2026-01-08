// =====================================================
// Cliente Google Gemini Pro
// =====================================================
// Descrição: Cliente para integração com Google Gemini API
// Autor: Sistema CRM Precatórios
// =====================================================

import type { ExtractionResult, FieldExtraction } from '@/lib/types/extracao'

// =====================================================
// Configuração
// =====================================================

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

if (!GEMINI_API_KEY) {
  console.warn('[Gemini] API Key não configurada. Defina GOOGLE_GEMINI_API_KEY no .env.local')
}

// =====================================================
// Types
// =====================================================

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text?: string
      inline_data?: {
        mime_type: string
        data: string // base64
      }
    }>
  }>
  generationConfig?: {
    temperature?: number
    topK?: number
    topP?: number
    maxOutputTokens?: number
  }
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
    finishReason: string
    safetyRatings: Array<any>
  }>
  promptFeedback?: any
}

// =====================================================
// Prompt para Extração
// =====================================================

const EXTRACTION_PROMPT = `Você é um assistente especializado em extrair dados de documentos jurídicos brasileiros, especificamente precatórios.

Analise o(s) documento(s) fornecido(s) e extraia as seguintes informações:

**IDENTIFICAÇÃO:**
- numero_precatorio: Número do precatório
- numero_processo: Número do processo judicial
- numero_oficio: Número do ofício requisitório
- tribunal: Nome do tribunal
- devedor: Nome do devedor (ente público)
- esfera_devedor: Esfera do devedor (federal, estadual, municipal)

**CREDOR:**
- credor_nome: Nome completo do credor
- credor_cpf_cnpj: CPF ou CNPJ do credor (apenas números)
- credor_profissao: Profissão do credor
- credor_estado_civil: Estado civil do credor
- credor_regime_casamento: Regime de casamento (se casado)
- credor_data_nascimento: Data de nascimento (formato YYYY-MM-DD)

**CÔNJUGE (se aplicável):**
- conjuge_nome: Nome completo do cônjuge
- conjuge_cpf_cnpj: CPF do cônjuge (apenas números)

**ADVOGADO:**
- advogado_nome: Nome completo do advogado
- advogado_cpf_cnpj: CPF do advogado (apenas números)
- advogado_oab: Número da OAB

**OUTROS:**
- cessionario: Nome do cessionário (se houver cessão)
- titular_falecido: true se o titular é falecido, false caso contrário

**VALORES (em números, sem R$, pontos ou vírgulas):**
- valor_principal: Valor principal do precatório
- valor_juros: Valor de juros
- valor_selic: Valor de correção SELIC
- valor_atualizado: Valor total atualizado
- saldo_liquido: Saldo líquido após deduções

**DATAS (formato YYYY-MM-DD):**
- data_base: Data base do cálculo
- data_expedicao: Data de expedição do precatório
- data_calculo: Data do cálculo

**DADOS BANCÁRIOS:**
- banco: Nome ou código do banco
- agencia: Número da agência
- conta: Número da conta
- tipo_conta: Tipo de conta (corrente, poupança)
- titular_conta: Nome do titular da conta

**ENDEREÇO:**
- endereco_completo: Endereço completo
- cep: CEP (apenas números)
- cidade: Cidade
- estado: Estado (sigla com 2 letras)

**INSTRUÇÕES IMPORTANTES:**
1. Para cada campo extraído, forneça:
   - valor: O valor encontrado
   - confianca: Sua confiança na extração (0-100)
   - fonte: Nome do documento e página onde encontrou
   - snippet: Trecho do texto original (máx 100 caracteres)

2. Se não encontrar um campo, não o inclua na resposta

3. Para valores monetários, remova R$, pontos e vírgulas. Exemplo: "R$ 1.234,56" → "1234.56"

4. Para CPF/CNPJ, remova pontos, traços e barras. Exemplo: "123.456.789-00" → "12345678900"

5. Para datas, use formato YYYY-MM-DD. Exemplo: "15/03/2024" → "2024-03-15"

6. Se encontrar informações conflitantes em diferentes documentos, inclua todas as versões

**FORMATO DE RESPOSTA:**
Retorne APENAS um objeto JSON válido no seguinte formato:

{
  "campos": {
    "nome_do_campo": {
      "valor": "valor extraído",
      "confianca": 95,
      "fonte": {
        "documento_nome": "nome do arquivo",
        "pagina": 1,
        "snippet": "trecho do texto original"
      },
      "tipo": "string|number|date|boolean|cpf|cnpj|currency"
    }
  },
  "checklist": {
    "rg_credor": true,
    "cpf_credor": true,
    "comprovante_residencia": false,
    "certidao_casamento": false,
    "certidao_nascimento": false,
    "certidao_negativa_municipal": false,
    "certidao_negativa_estadual": false,
    "certidao_negativa_federal": false,
    "dados_bancarios": true,
    "procuracao": false,
    "oficio_requisitorio": true
  }
}

Agora analise o(s) documento(s) e extraia as informações:`

// =====================================================
// Funções Principais
// =====================================================

/**
 * Extrai dados de texto usando Gemini Pro
 */
export async function extractFromText(
  text: string,
  documentName: string
): Promise<ExtractionResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('API Key do Gemini não configurada')
  }

  try {
    const request: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: `${EXTRACTION_PROMPT}\n\n**DOCUMENTO: ${documentName}**\n\n${text}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Baixa temperatura para respostas mais determinísticas
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    }

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro na API Gemini: ${response.status} - ${error}`)
    }

    const data: GeminiResponse = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Nenhuma resposta gerada pelo Gemini')
    }

    const textResponse = data.candidates[0].content.parts[0].text

    // Extrair JSON da resposta (pode vir com markdown)
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Resposta do Gemini não contém JSON válido')
    }

    const extracted = JSON.parse(jsonMatch[0])

    // Converter para formato ExtractionResult
    return parseGeminiResponse(extracted, documentName)
  } catch (error) {
    console.error('[Gemini] Erro ao extrair dados:', error)
    throw error
  }
}

/**
 * Extrai dados de imagem/PDF usando Gemini Pro Vision
 */
export async function extractFromImage(
  imageBase64: string,
  mimeType: string,
  documentName: string
): Promise<ExtractionResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('API Key do Gemini não configurada')
  }

  try {
    const request: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: EXTRACTION_PROMPT,
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    }

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro na API Gemini Vision: ${response.status} - ${error}`)
    }

    const data: GeminiResponse = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Nenhuma resposta gerada pelo Gemini Vision')
    }

    const textResponse = data.candidates[0].content.parts[0].text

    // Extrair JSON da resposta
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Resposta do Gemini Vision não contém JSON válido')
    }

    const extracted = JSON.parse(jsonMatch[0])

    return parseGeminiResponse(extracted, documentName)
  } catch (error) {
    console.error('[Gemini Vision] Erro ao extrair dados:', error)
    throw error
  }
}

// =====================================================
// Funções Auxiliares
// =====================================================

/**
 * Converte resposta do Gemini para formato ExtractionResult
 */
function parseGeminiResponse(
  geminiData: any,
  documentName: string
): ExtractionResult {
  const campos: Record<string, FieldExtraction> = {}
  let totalCampos = 0
  let camposAltaConfianca = 0
  let camposBaixaConfianca = 0

  // Processar campos extraídos
  if (geminiData.campos) {
    for (const [key, value] of Object.entries(geminiData.campos)) {
      const field = value as any
      
      campos[key] = {
        valor: field.valor,
        confianca: field.confianca || 50,
        fonte: {
          documento_id: '', // Será preenchido depois
          documento_nome: field.fonte?.documento_nome || documentName,
          pagina: field.fonte?.pagina,
          snippet: field.fonte?.snippet,
        },
        tipo: field.tipo || 'string',
        normalizado: false,
      }

      totalCampos++
      if (field.confianca >= 80) camposAltaConfianca++
      if (field.confianca < 50) camposBaixaConfianca++
    }
  }

  return {
    precatorio_id: '', // Será preenchido depois
    status: 'success',
    timestamp: new Date().toISOString(),
    campos,
    checklist: geminiData.checklist || {},
    conflitos: [],
    documentos_processados: [
      {
        id: '',
        nome: documentName,
        tipo: '',
        paginas: 1,
        sucesso: true,
      },
    ],
    total_campos_extraidos: totalCampos,
    campos_alta_confianca: camposAltaConfianca,
    campos_baixa_confianca: camposBaixaConfianca,
  }
}

/**
 * Testa conexão com Gemini
 */
export async function testGeminiConnection(): Promise<boolean> {
  if (!GEMINI_API_KEY) {
    return false
  }

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Responda apenas: OK',
                },
              ],
            },
          ],
        }),
      }
    )

    return response.ok
  } catch (error) {
    console.error('[Gemini] Erro ao testar conexão:', error)
    return false
  }
}
