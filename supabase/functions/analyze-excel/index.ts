import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Auth Check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Ausente header de autorização')

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        )

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Não autenticado' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // FormData
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) throw new Error('Arquivo não fornecido')

        // Read File
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // Detect Orientation
        const orientation = detectOrientation(data)

        // Convert to CSV for Gemini
        const csvData = data
            .map(row => row.map((cell: any) => `"${String(cell || '')}"`).join(','))
            .join('\n')

        // Prompt Gemini
        const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
        if (!apiKey) throw new Error('API Key do Gemini não configurada')

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) // Updated model

        const prompt = `Analise esta planilha Excel (convertida para CSV) e extraia dados de precatórios.

INSTRUÇÕES:
1. Detecte se os dados estão organizados em LINHAS ou COLUNAS.
2. Extraia TODOS os precatórios.
3. Use os campos: numero_precatorio, credor_nome (OBRIGATÓRIO), credor_cpf_cnpj (OBRIGATÓRIO), valor_principal (OBRIGATÓRIO), banco, agencia, conta.

RESPOSTA JSON (apenas JSON):
{
  "orientation": "rows" | "columns",
  "total_precatorios": number,
  "precatorios": [ { "campos": { ... } } ]
}

DADOS:
${csvData.slice(0, 30000)}` // Limit data size just in case

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        let analise
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            analise = JSON.parse(jsonMatch[0])
        } else {
            throw new Error('Resposta inválida da IA')
        }

        return new Response(
            JSON.stringify({
                success: true,
                file_name: file.name,
                analise,
                orientation
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

function detectOrientation(data: any[][]): 'rows' | 'columns' | 'unknown' {
    if (data.length === 0) return 'unknown'
    const numRows = data.length
    const numCols = data[0]?.length || 0
    if (numRows > numCols * 2) return 'rows'
    if (numCols > numRows * 2) return 'columns'
    return 'rows' // default
}
