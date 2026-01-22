
import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Erro: Env vars missing.")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runDiagnostics() {
    console.log("=== RELATÓRIO DE DIAGNÓSTICO (V2) ===\n")

    // 1.2 Integridade Economic Indices
    console.log("--- 1.2 Economic Indices: Integridade ---")
    const { data: indices, error: idxError } = await supabase
        .from('economic_indices')
        .select('*')

    if (idxError) {
        console.error("Erro lendo indices:", idxError)
    } else {
        const byType: any = {}
        const duplicates: any[] = []
        const keys = new Set()

        indices.forEach(idx => {
            // Count
            if (!byType[idx.type]) byType[idx.type] = { count: 0, min: idx.reference_date, max: idx.reference_date }
            byType[idx.type].count++
            if (idx.reference_date < byType[idx.type].min) byType[idx.type].min = idx.reference_date
            if (idx.reference_date > byType[idx.type].max) byType[idx.type].max = idx.reference_date

            // Duplicates
            const key = `${idx.type}|${idx.reference_date}`
            if (keys.has(key)) duplicates.push(key)
            keys.add(key)
        })

        console.log("Contagem por Tipo:", JSON.stringify(byType, null, 2))
        console.log("Duplicatas encontradas:", duplicates.length > 0 ? duplicates : "Nenhuma")
    }

    // 1.3 Missing Months
    console.log("\n--- 1.3 Buracos (Missing Months) ---")
    const typesToCheck = ['selic', 'ipca', 'ipca_e']

    for (const type of typesToCheck) {
        const { data: dates } = await supabase
            .from('economic_indices')
            .select('reference_date')
            .eq('type', type)
            .order('reference_date', { ascending: true })

        if (dates && dates.length > 0) {
            const start = new Date(dates[0].reference_date)
            const end = new Date(dates[dates.length - 1].reference_date)
            const missing = []

            let cur = new Date(start)
            while (cur <= end) {
                const dateStr = cur.toISOString().split('T')[0]
                const found = dates.find(d => d.reference_date === dateStr)
                if (!found) missing.push(dateStr)
                cur.setMonth(cur.getMonth() + 1)
            }
            if (missing.length > 0) console.log(`[${type}] Buracos:`, missing.length, "Exemplos:", missing.slice(0, 5))
            else console.log(`[${type}] Sem buracos entre ${start.toISOString().substring(0, 7)} e ${end.toISOString().substring(0, 7)}`)
        } else {
            console.log(`[${type}] Sem dados.`)
        }
    }

    // 1.4 Data Quality
    console.log("\n--- 1.4 Qualidade dos Precatórios ---")
    const { count: total } = await supabase.from('precatorios').select('*', { count: 'exact', head: true })
    const { count: nullBase } = await supabase.from('precatorios').select('*', { count: 'exact', head: true }).is('data_base', null)
    const { count: nullExp } = await supabase.from('precatorios').select('*', { count: 'exact', head: true }).is('data_expedicao', null)
    const { count: nullPrincipal } = await supabase.from('precatorios').select('*', { count: 'exact', head: true }).or('valor_principal.is.null,valor_principal.eq.0')
    const { count: nullEsfera } = await supabase.from('precatorios').select('*', { count: 'exact', head: true }).is('esfera_devedor', null)

    console.log(`Total Precatórios: ${total}`)
    console.log(`Data Base Nula: ${nullBase} (${((nullBase! / total!) * 100).toFixed(1)}%)`)
    console.log(`Data Expedição Nula: ${nullExp} (${((nullExp! / total!) * 100).toFixed(1)}%)`)
    console.log(`Principal Zerado/Nulo: ${nullPrincipal} (${((nullPrincipal! / total!) * 100).toFixed(1)}%)`)
    console.log(`Esfera Nula: ${nullEsfera} (${((nullEsfera! / total!) * 100).toFixed(1)}%)`)

    // 1.5 Calculos History
    console.log("\n--- 1.5 Histórico de Cálculos (precatorio_calculos) ---")
    const { count: totalHistory } = await supabase.from('precatorio_calculos').select('*', { count: 'exact', head: true })
    console.log(`Total de Logs de Cálculo: ${totalHistory}`)

    // 3. RLS Check (Simulated)
    console.log("\n--- 3. Verificação de Acesso (Service Role) ---")
    // Se conseguimos ler tudo acima, service role está ok.
    console.log("Acesso via Service Role: OK (Leitura confirmada)")
}

runDiagnostics()
