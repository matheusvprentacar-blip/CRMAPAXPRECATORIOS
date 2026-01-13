import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Auth Check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Ausente header de autorização')

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (authError || !user) throw new Error('Não autenticado')

        const { precatorio_id } = await req.json()
        if (!precatorio_id) throw new Error('precatorio_id é obrigatório')

        // 1. Buscar documentos não processados (RPC)
        const { data: documentos, error: docsError } = await supabase
            .rpc('get_documentos_nao_processados', { p_precatorio_id: precatorio_id })

        if (docsError) throw new Error(`Erro buscando documentos: ${docsError.message}`)
        if (!documentos || documentos.length === 0) {
            return new Response(
                JSON.stringify({ message: 'Nenhum documento para processar', success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 2. Criar registro de extração
        const { data: extracao, error: extracaoError } = await supabase
            .from('precatorio_extracoes')
            .insert({
                precatorio_id,
                status: 'processando',
                created_by: user.id,
                documentos_ids: documentos.map((d: any) => d.id),
                total_documentos: documentos.length,
            })
            .select()
            .single()

        if (extracaoError) throw extracaoError

        // 3. Processar Documentos
        const documentosProcessados: string[] = []
        let textoCompleto = ''

        const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
        if (!apiKey) throw new Error('API Key Gemini não configurada')

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        for (const doc of documentos) {
            try {
                // Download
                const { data: fileData, error: downloadError } = await supabase
                    .storage
                    .from('precatorios-documentos')
                    .download(doc.storage_path)

                if (downloadError) throw downloadError

                const arrayBuffer = await fileData.arrayBuffer()
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

                // Gemini Call per document to extract text or analyze
                // Here we accumulate text/findings to send to final structured extraction
                // Simplified approach: Send image/pdf logic here

                const parts = [
                    { text: "Extraia todo o texto legível deste documento para análise jurídica posterior." },
                    { inlineData: { mimeType: doc.mime_type, data: base64 } }
                ]

                const result = await model.generateContent({ contents: [{ role: 'user', parts }] })
                const response = await result.response
                const extractedText = response.text()

                textoCompleto += `\n\n=== ${doc.tipo_documento || 'Documento'} (${doc.nome}) ===\n${extractedText}`
                documentosProcessados.push(doc.id)

            } catch (err) {
                console.error(`Erro processando doc ${doc.id}:`, err)
            }
        }

        // 4. Extração Final (Estruturada)
        const prompt = `${EXTRACTION_PROMPT}\n\n**CONTEXTO DOS DOCUMENTOS:**\n${textoCompleto}`

        const finalResult = await model.generateContent(prompt)
        const finalResponse = await finalResult.response
        const finalText = finalResponse.text()

        let resultadoJson
        const jsonMatch = finalText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            resultadoJson = JSON.parse(jsonMatch[0])
        } else {
            throw new Error('Falha ao gerar JSON final')
        }

        const parsedResult = parseGeminiResponse(resultadoJson, 'Compilado')

        // 5. Salvar Campos
        if (parsedResult.campos) {
            const camposParaInserir = Object.entries(parsedResult.campos).map(([nome, campo]: [string, any]) => ({
                extracao_id: extracao.id,
                campo_nome: nome,
                campo_label: nome.replace(/_/g, ' '),
                campo_valor: campo.valor,
                campo_tipo: campo.tipo,
                confianca: campo.confianca,
            }))

            if (camposParaInserir.length > 0) {
                await supabase.from('precatorio_extracao_campos').insert(camposParaInserir)
            }
        }

        // 6. Atualizar Extração e Docs
        await supabase.from('precatorio_extracoes').update({
            status: 'concluido',
            result_json: parsedResult,
            checklist_json: parsedResult.checklist
        }).eq('id', extracao.id)

        if (documentosProcessados.length > 0) {
            await supabase.rpc('marcar_documentos_processados', {
                p_documento_ids: documentosProcessados,
                p_sucesso: true,
            })
        }

        return new Response(
            JSON.stringify({ success: true, extracao_id: extracao.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

// ===========================================
// CONSTANTS & HELPERS
// ===========================================

const EXTRACTION_PROMPT = `Você é um assistente especializado em precatórios. 
Analise o texto fornecido e extraia os dados em JSON.
Campos: numero_precatorio, credor_nome, credor_cpf_cnpj, valor_principal, tribunal, devedor.
Retorne JSON válido { "campos": { ... }, "checklist": { ... } }.`

function parseGeminiResponse(geminiData: any, docName: string) {
    return {
        campos: geminiData.campos || {},
        checklist: geminiData.checklist || {},
        status: 'success'
    }
}
