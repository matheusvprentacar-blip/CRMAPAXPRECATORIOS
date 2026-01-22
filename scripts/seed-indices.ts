
import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import {
    TABELA_SELIC_PERCENTUAL_EC113,
    TABELA_IPCA_INDICES_MENSAIS,
    TABELA_IPCA_FATORES_EC113
} from "../lib/calculos/dados-ec113"
import {
    SELIC_MENSAL,
    SELIC_MENSAL_ATUALIZADO,
    IPCA_E_MENSAL,
    IPCA_MENSAL
} from "../lib/calculos/indices"

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedindices() {
    console.log("Iniciando migração de índices...")

    let recordsToInsert: any[] = []

    // 1. IPCA FATORES (TJPR) - 1994 a 2021
    // Estrutura: "ANO": [Jan...Dez]
    Object.entries(TABELA_IPCA_FATORES_EC113).forEach(([ano, indices]) => {
        indices.forEach((valor, index) => {
            const mes = index + 1
            const dataRef = `${ano}-${String(mes).padStart(2, "0")}-01`

            recordsToInsert.push({
                type: 'ipca_fator_tjpr',
                reference_date: dataRef,
                value: valor,
                is_percentual: false,
                source: 'tjpr'
            })
        })
    })

    // 2. SELIC MENSAL (PERCENTUAL) - EC113
    // Fonte primária: TABELA_SELIC_PERCENTUAL_EC113
    Object.entries(TABELA_SELIC_PERCENTUAL_EC113).forEach(([ano, indices]) => {
        indices.forEach((valor, index) => {
            const mes = index + 1
            if (valor > 0) { // Ignora placeholders zerados
                const dataRef = `${ano}-${String(mes).padStart(2, "0")}-01`
                recordsToInsert.push({
                    type: 'selic',
                    reference_date: dataRef,
                    value: valor,
                    is_percentual: true,
                    source: 'ec113'
                })
            }
        })
    })

    // 3. IPCA-E MENSAL (PERCENTUAL) - Uso para Juros Moratórios
    // Fonte: TABELA_IPCA_INDICES_MENSAIS
    Object.entries(TABELA_IPCA_INDICES_MENSAIS).forEach(([ano, indices]) => {
        indices.forEach((valor, index) => {
            const mes = index + 1
            const dataRef = `${ano}-${String(mes).padStart(2, "0")}-01`
            recordsToInsert.push({
                type: 'ipca_e',
                reference_date: dataRef,
                value: valor,
                is_percentual: true,
                source: 'ibge'
            })
        })
    })

    // 4. Complementos de `indices.ts` (Objetos YYYY-MM)

    // SELIC_MENSAL (Até 2021)
    Object.entries(SELIC_MENSAL).forEach(([mesAno, valor]) => {
        const dataRef = `${mesAno}-01`
        // Só insere se não existir (prioridade para a tabela EC113 se houver sobreposição)
        const exists = recordsToInsert.find(r => r.type === 'selic' && r.reference_date === dataRef)
        if (!exists) {
            recordsToInsert.push({
                type: 'selic',
                reference_date: dataRef,
                value: valor,
                is_percentual: true,
                source: 'bacen_legacy'
            })
        }
    })

    // IPCA_E_MENSAL (A partir de 2022)
    Object.entries(IPCA_E_MENSAL).forEach(([mesAno, valor]) => {
        const dataRef = `${mesAno}-01`
        const exists = recordsToInsert.find(r => r.type === 'ipca_e' && r.reference_date === dataRef)
        if (!exists) {
            recordsToInsert.push({
                type: 'ipca_e',
                reference_date: dataRef,
                value: valor,
                is_percentual: true,
                source: 'ibge_legacy'
            })
        }
    })

    console.log(`Preparado para inserir ${recordsToInsert.length} registros.`)

    // Inserção em Lote (Upsert)
    const { error } = await supabase
        .from('economic_indices')
        .upsert(recordsToInsert, {
            onConflict: 'type, reference_date',
            ignoreDuplicates: false
        })

    if (error) {
        console.error("Erro ao inserir dados:", error)
    } else {
        console.log("Sucesso! Índices migrados.")
    }
}

seedindices()
