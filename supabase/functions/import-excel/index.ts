import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

        const { precatorios } = await req.json()

        if (!precatorios || !Array.isArray(precatorios) || precatorios.length === 0) {
            throw new Error('Nenhum precatório fornecido')
        }

        const resultados = {
            total: precatorios.length,
            criados: 0,
            erros: 0,
            detalhes: [] as any[],
        }

        for (let i = 0; i < precatorios.length; i++) {
            const precatorio = precatorios[i]

            try {
                if (!precatorio.credor_nome) throw new Error('Nome do credor é obrigatório')
                if (!precatorio.credor_cpf_cnpj) throw new Error('CPF/CNPJ do credor é obrigatório')
                if (!precatorio.valor_principal) throw new Error('Valor principal é obrigatório')

                // Normalização
                const dadosNormalizados: any = {
                    credor_nome: precatorio.credor_nome.trim(),
                    credor_cpf_cnpj: normalizarCPFCNPJ(precatorio.credor_cpf_cnpj),
                    valor_principal: parseFloat(normalizarValor(String(precatorio.valor_principal))),
                    created_by: user.id,
                    responsavel: user.id,
                    status: 'novo',
                }

                // Validação CPF/CNPJ
                if (!validarDocumento(dadosNormalizados.credor_cpf_cnpj)) {
                    throw new Error('CPF/CNPJ inválido')
                }

                // Validação Valor
                if (isNaN(dadosNormalizados.valor_principal) || dadosNormalizados.valor_principal <= 0) {
                    throw new Error('Valor principal inválido')
                }

                // Campos opcionais
                const camposOpcionais = [
                    'numero_precatorio', 'numero_processo', 'tribunal', 'devedor',
                    'credor_profissao', 'credor_estado_civil', 'conjuge_nome',
                    'conjuge_cpf_cnpj', 'advogado_nome', 'advogado_cpf_cnpj', 'advogado_oab',
                    'banco', 'agencia', 'conta', 'tipo_conta',
                    'endereco_completo', 'cidade', 'estado'
                ]

                camposOpcionais.forEach(campo => {
                    if (precatorio[campo]) {
                        dadosNormalizados[campo] = precatorio[campo].trim()
                        if (campo === 'estado') dadosNormalizados[campo] = dadosNormalizados[campo].toUpperCase()
                        if (campo.includes('cpf_cnpj')) dadosNormalizados[campo] = normalizarCPFCNPJ(dadosNormalizados[campo])
                    }
                })

                if (precatorio.cep) dadosNormalizados.cep = precatorio.cep.replace(/\D/g, '')

                if (precatorio.credor_data_nascimento) {
                    const dt = normalizarData(precatorio.credor_data_nascimento)
                    if (dt) dadosNormalizados.credor_data_nascimento = dt
                }
                if (precatorio.data_base) {
                    const dt = normalizarData(precatorio.data_base)
                    if (dt) dadosNormalizados.data_base = dt
                }
                if (precatorio.data_expedicao) {
                    const dt = normalizarData(precatorio.data_expedicao)
                    if (dt) dadosNormalizados.data_expedicao = dt
                }

                // Valores numéricos extras
                if (precatorio.valor_juros) dadosNormalizados.valor_juros = parseFloat(normalizarValor(String(precatorio.valor_juros)))
                if (precatorio.valor_atualizado) dadosNormalizados.valor_atualizado = parseFloat(normalizarValor(String(precatorio.valor_atualizado)))

                // Inserção
                const { data: criado, error: insertError } = await supabase
                    .from('precatorios')
                    .insert(dadosNormalizados)
                    .select()
                    .single()

                if (insertError) throw insertError

                resultados.criados++
                resultados.detalhes.push({
                    index: i,
                    sucesso: true,
                    precatorio_id: criado.id,
                    credor_nome: dadosNormalizados.credor_nome,
                })

            } catch (error) {
                resultados.erros++
                resultados.detalhes.push({
                    index: i,
                    sucesso: false,
                    erro: error.message || 'Erro desconhecido',
                    credor_nome: precatorio.credor_nome || 'Não informado',
                })
            }
        }

        return new Response(
            JSON.stringify({ success: true, resultados }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

// ==========================================
// HELPERS (Ported from normalizacao.ts)
// ==========================================
function normalizarCPFCNPJ(valor: string): string {
    return valor.replace(/[^\d]/g, '')
}

function normalizarValor(valor: string): string {
    return valor.replace(/R\$\s?/g, '').replace(/\./g, '').replace(/,/g, '.').trim()
}

function normalizarData(valor: string): string | null {
    const formats = [
        /(\d{2})\/(\d{2})\/(\d{4})/,
        /(\d{4})-(\d{2})-(\d{2})/,
        /(\d{2})-(\d{2})-(\d{4})/,
    ]
    for (const format of formats) {
        const match = valor.match(format)
        if (match) {
            if (format === formats[1]) return match[0]
            return `${match[3]}-${match[2]}-${match[1]}`
        }
    }
    return null
}

function validarDocumento(doc: string): boolean {
    if (doc.length === 11) return validarCPF(doc)
    if (doc.length === 14) return validarCNPJ(doc)
    return false
}

function validarCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]/g, '')
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let soma = 0
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i)
    let resto = 11 - (soma % 11)
    let digito1 = resto >= 10 ? 0 : resto
    soma = 0
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i)
    resto = 11 - (soma % 11)
    let digito2 = resto >= 10 ? 0 : resto
    return parseInt(cpf.charAt(9)) === digito1 && parseInt(cpf.charAt(10)) === digito2
}

function validarCNPJ(cnpj: string): boolean {
    cnpj = cnpj.replace(/[^\d]/g, '')
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
    let tamanho = cnpj.length - 2
    let numeros = cnpj.substring(0, tamanho)
    let digitos = cnpj.substring(tamanho)
    let soma = 0
    let pos = tamanho - 7
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--
        if (pos < 2) pos = 9
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
    if (resultado !== parseInt(digitos.charAt(0))) return false
    tamanho = tamanho + 1
    numeros = cnpj.substring(0, tamanho)
    soma = 0
    pos = tamanho - 7
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--
        if (pos < 2) pos = 9
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
    return resultado === parseInt(digitos.charAt(1))
}
