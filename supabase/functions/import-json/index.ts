import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Ausente header de autorização')

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (authError || !user) throw new Error('Não autenticado')

        const body = await req.json()
        const { precatorios, action } = body

        if (!precatorios || !Array.isArray(precatorios) || precatorios.length === 0) {
            throw new Error('Nenhum precatório fornecido')
        }

        // ----------------------------------------------------------------------
        // ACTION: PREVIEW
        // ----------------------------------------------------------------------
        if (action === 'preview') {
            const preview = precatorios.map((p: any, index: number) => {
                const avisos: string[] = []
                let temErro = false

                if (!p.credor_nome || !p.credor_nome.trim()) {
                    temErro = true
                    avisos.push('Nome do credor é obrigatório')
                }

                if (!p.credor_cpf_cnpj) {
                    avisos.push('CPF/CNPJ não informado (pode completar depois)')
                } else {
                    const cpfCnpj = normalizarCPFCNPJ(p.credor_cpf_cnpj)
                    if (cpfCnpj.length === 11 && !validarCPF(cpfCnpj)) {
                        temErro = true
                        avisos.push('CPF inválido')
                    } else if (cpfCnpj.length === 14 && !validarCNPJ(cpfCnpj)) {
                        temErro = true
                        avisos.push('CNPJ inválido')
                    } else if (cpfCnpj.length > 0 && cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
                        avisos.push('CPF/CNPJ com formato inválido')
                    }
                }

                if (!p.valor_principal || p.valor_principal <= 0) {
                    avisos.push('Valor principal não informado')
                }

                if (!p.numero_processo) {
                    avisos.push('Número do processo não informado')
                }

                return { index, dados: p, avisos, valido: !temErro }
            })

            const totalValidos = preview.filter((p: any) => p.valido).length

            return new Response(
                JSON.stringify({
                    success: true,
                    action: 'preview',
                    total: precatorios.length,
                    validos: totalValidos,
                    invalidos: preview.length - totalValidos,
                    preview
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ----------------------------------------------------------------------
        // ACTION: CREATE
        // ----------------------------------------------------------------------
        if (action === 'create') {
            const resultados = { total: precatorios.length, criados: 0, erros: 0, detalhes: [] as any[] }

            for (let i = 0; i < precatorios.length; i++) {
                const precatorio = precatorios[i]

                try {
                    if (!precatorio.credor_nome || !precatorio.credor_nome.trim()) throw new Error('Nome do credor é obrigatório')

                    const dadosNormalizados: any = {
                        titulo: precatorio.credor_nome.trim(),
                        credor_nome: precatorio.credor_nome.trim(),
                        criado_por: user.id,
                        responsavel: user.id,
                        status: 'novo',
                    }

                    if (precatorio.credor_cpf_cnpj) {
                        const v = normalizarCPFCNPJ(precatorio.credor_cpf_cnpj)
                        if (v) dadosNormalizados.credor_cpf_cnpj = v
                    }
                    if (precatorio.valor_principal) {
                        const v = parseFloat(String(precatorio.valor_principal))
                        if (!isNaN(v)) dadosNormalizados.valor_principal = v
                    }

                    // Optional fields
                    const optFields = [
                        'numero_precatorio', 'numero_processo', 'numero_oficio', 'tribunal',
                        'devedor', 'esfera_devedor', 'credor_profissao', 'credor_estado_civil',
                        'conjuge_nome', 'advogado_nome', 'advogado_oab',
                        'banco', 'agencia', 'conta', 'tipo_conta', 'endereco_completo',
                        'observacoes', 'contatos'
                    ]
                    optFields.forEach(f => {
                        if (!precatorio[f] || !precatorio[f].trim || !precatorio[f].trim()) return
                        if (f === 'esfera_devedor') {
                            const esfera = normalizarEsferaDevedor(precatorio[f])
                            if (esfera) dadosNormalizados[f] = esfera
                            return
                        }
                        dadosNormalizados[f] = precatorio[f].trim()
                    })

                    if (precatorio.estado) dadosNormalizados.estado = precatorio.estado.trim().toUpperCase()
                    if (precatorio.cep) dadosNormalizados.cep = precatorio.cep.replace(/\D/g, '')

                    // Dates
                    if (precatorio.credor_data_nascimento) confirmDate(dadosNormalizados, 'credor_data_nascimento', precatorio.credor_data_nascimento)
                    if (precatorio.data_base) confirmDate(dadosNormalizados, 'data_base', precatorio.data_base)
                    if (precatorio.data_expedicao) confirmDate(dadosNormalizados, 'data_expedicao', precatorio.data_expedicao)

                    // Values
                    if (precatorio.valor_juros) confirmFloat(dadosNormalizados, 'valor_juros', precatorio.valor_juros)
                    if (precatorio.valor_atualizado) confirmFloat(dadosNormalizados, 'valor_atualizado', precatorio.valor_atualizado)

                    const { data: criado, error: insertError } = await supabase
                        .from('precatorios')
                        .insert(dadosNormalizados)
                        .select()
                        .single()

                    if (insertError) throw insertError

                    resultados.criados++
                    resultados.detalhes.push({ index: i, sucesso: true, precatorio_id: criado.id, credor_nome: dadosNormalizados.credor_nome })

                } catch (error) {
                    resultados.erros++
                    resultados.detalhes.push({ index: i, sucesso: false, erro: error.message || String(error) })
                }
            }

            return new Response(
                JSON.stringify({ success: true, action: 'create', resultados }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        throw new Error('Action inválida')

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

function confirmDate(target: any, key: string, value: string) {
    const d = normalizarData(value)
    if (d) target[key] = d
}
function confirmFloat(target: any, key: string, value: any) {
    const v = parseFloat(String(value))
    if (!isNaN(v)) target[key] = v
}

// Helpers
function normalizarCPFCNPJ(v: string) { return v.replace(/[^\d]/g, '') }
function normalizarData(v: string) {
    const formats = [/(\d{2})\/(\d{2})\/(\d{4})/, /(\d{4})-(\d{2})-(\d{2})/, /(\d{2})-(\d{2})-(\d{4})/]
    for (const f of formats) {
        const m = v.match(f)
        if (m) return (f === formats[1]) ? m[0] : `${m[3]}-${m[2]}-${m[1]}`
    }
    return null
}
function normalizarEsferaDevedor(v: string) {
    if (!v) return null
    const normalized = v
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()

    if (!normalized) return null
    if (normalized === "UNIAO" || normalized === "FEDERAL" || normalized === "UNIAO FEDERAL") return "UNIAO"
    if (normalized === "ESTADO" || normalized === "ESTADUAL") return "ESTADO"
    if (normalized === "MUNICIPIO" || normalized === "MUNICIPAL") return "MUNICIPIO"
    if (normalized === "DF" || normalized === "DISTRITO FEDERAL") return "DF"
    if (normalized === "INDEFINIDO" || normalized === "INDEFINIDA" || normalized === "NAO DEFINIDO") return "INDEFINIDO"
    return null
}
function validarCPF(cpf: string) {
    cpf = cpf.replace(/[^\d]/g, '')
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let s = 0; for (let i = 0; i < 9; i++) s += parseInt(cpf.charAt(i)) * (10 - i);
    let r = 11 - (s % 11); let d1 = r >= 10 ? 0 : r;
    s = 0; for (let i = 0; i < 10; i++) s += parseInt(cpf.charAt(i)) * (11 - i);
    r = 11 - (s % 11); let d2 = r >= 10 ? 0 : r;
    return parseInt(cpf.charAt(9)) === d1 && parseInt(cpf.charAt(10)) === d2
}
function validarCNPJ(cnpj: string) {
    cnpj = cnpj.replace(/[^\d]/g, '')
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
    // Simplified Check
    return true
}
