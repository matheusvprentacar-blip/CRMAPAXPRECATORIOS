import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseExcelFile, excelToCSV, validateExcelFile } from '@/lib/utils/excel-parser'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      )
    }
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Obter arquivo do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    // Validar arquivo
    const validation = validateExcelFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Parse do Excel
    const excelData = await parseExcelFile(file)
    
    // Converter para CSV para enviar ao Gemini
    const csvData = excelToCSV(excelData.data)
    
    // Prompt para Gemini analisar a planilha
    const prompt = `Analise esta planilha Excel e extraia dados de precatórios.

INSTRUÇÕES:
1. Detecte se os dados estão organizados em LINHAS (cada linha = 1 precatório) ou COLUNAS (cada coluna = 1 precatório)
2. Identifique os cabeçalhos/labels dos campos
3. Extraia TODOS os precatórios encontrados
4. Para cada precatório, extraia os campos disponíveis

CAMPOS POSSÍVEIS (use os nomes exatos):
- numero_precatorio
- numero_processo
- tribunal
- devedor
- credor_nome (OBRIGATÓRIO)
- credor_cpf_cnpj (OBRIGATÓRIO)
- credor_profissao
- credor_estado_civil
- credor_data_nascimento
- conjuge_nome
- conjuge_cpf_cnpj
- advogado_nome
- advogado_cpf_cnpj
- advogado_oab
- valor_principal (OBRIGATÓRIO)
- valor_juros
- valor_atualizado
- data_base
- data_expedicao
- banco
- agencia
- conta
- tipo_conta
- endereco_completo
- cep
- cidade
- estado

FORMATO DE RESPOSTA (JSON):
{
  "orientation": "rows" ou "columns",
  "total_precatorios": número,
  "precatorios": [
    {
      "linha_ou_coluna": número,
      "campos": {
        "credor_nome": "valor",
        "credor_cpf_cnpj": "valor",
        "valor_principal": "valor",
        ...outros campos encontrados
      },
      "validacoes": {
        "credor_nome": { "valido": true/false, "erro": "mensagem se inválido" },
        "credor_cpf_cnpj": { "valido": true/false, "erro": "mensagem se inválido" },
        "valor_principal": { "valido": true/false, "erro": "mensagem se inválido" }
      }
    }
  ]
}

DADOS DA PLANILHA:
${csvData}

Retorne APENAS o JSON, sem texto adicional.`

    // Enviar para Gemini
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key do Gemini não configurada' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse da resposta do Gemini
    let analise
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analise = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Resposta não contém JSON válido')
      }
    } catch (e) {
      console.error('[Import Excel] Erro ao parsear resposta:', text)
      return NextResponse.json(
        { error: 'Erro ao processar resposta da IA', details: text },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      file_name: file.name,
      file_size: file.size,
      orientation: excelData.orientation,
      total_linhas: excelData.data.length,
      analise,
    })

  } catch (error) {
    console.error('[Import Excel] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao analisar planilha' },
      { status: 500 }
    )
  }
}
