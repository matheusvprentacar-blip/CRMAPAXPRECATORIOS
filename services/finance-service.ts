import { createBrowserClient } from "@/lib/supabase/client"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

const supabase = createBrowserClient()

export interface FinanceSummary {
    totalRevenue: number
    totalExpense: number
    netRevenue: number
    netExpense: number
    balance: number
    overdueReceivables: number
    overduePayables: number
}

function safeNum(val: any) {
    return Number(val) || 0
}

export async function getFinanceSummary(from?: string, to?: string): Promise<FinanceSummary> {
    if (!supabase) return zeroSummary()

    let query = supabase
        .from("v_financial_transactions_norm")
        .select("*")

    if (from) query = query.gte("date_ref", from)
    if (to) query = query.lte("date_ref", to)

    const { data, error } = await query

    if (error) {
        console.error("Supabase Error (Summary):", error)
        throw error
    }

    if (!data || data.length === 0) return zeroSummary()

    const totalRevenue = data.filter(i => i.is_receita).reduce((sum, i) => sum + safeNum(i.amount), 0)
    const totalExpense = data.filter(i => i.is_despesa).reduce((sum, i) => sum + safeNum(i.amount), 0)

    const netRevenue = data
        .filter(i => i.is_receita && i.is_realizado)
        .reduce((sum, i) => sum + safeNum(i.amount), 0)

    const netExpense = data
        .filter(i => i.is_despesa && i.is_realizado)
        .reduce((sum, i) => sum + safeNum(i.amount), 0)

    const balance = netRevenue - netExpense

    const overdueReceivables = data
        .filter(i => i.is_receita && i.is_atrasado_calc)
        .reduce((sum, i) => sum + safeNum(i.amount), 0)

    const overduePayables = data
        .filter(i => i.is_despesa && i.is_atrasado_calc)
        .reduce((sum, i) => sum + safeNum(i.amount), 0)

    return {
        totalRevenue,
        totalExpense,
        netRevenue,
        netExpense,
        balance,
        overdueReceivables,
        overduePayables
    }
}

function zeroSummary(): FinanceSummary {
    return {
        totalRevenue: 0,
        totalExpense: 0,
        netRevenue: 0,
        netExpense: 0,
        balance: 0,
        overdueReceivables: 0,
        overduePayables: 0
    }
}

export async function getFinanceTimeSeries() {
    if (!supabase) return []

    // Last 12 months
    const today = new Date()
    const startDate = subMonths(startOfMonth(today), 11) // 11 months back + current
    const dateStr = format(startDate, 'yyyy-MM-dd')

    const { data, error } = await supabase
        .from("v_financial_transactions_norm")
        .select("*")
        .gte("date_ref", dateStr)
        .order("date_ref", { ascending: true })

    if (error) {
        console.error("Supabase Error (TimeSeries):", error)
        return []
    }

    // Aggregation logic (Client-side grouping because we can't use complex SQL group by on client easily without RPC)
    const grouped = new Map<string, { income: number, expense: number }>()

    // Init all months
    for (let i = 0; i < 12; i++) {
        const m = subMonths(today, 11 - i)
        const key = format(m, 'yyyy-MM')
        grouped.set(key, { income: 0, expense: 0 })
    }

    data?.forEach(row => {
        const key = row.month_ref
        if (grouped.has(key)) {
            const entry = grouped.get(key)!
            if (row.is_receita && row.is_realizado) entry.income += safeNum(row.amount)
            if (row.is_despesa && row.is_realizado) entry.expense += safeNum(row.amount)
        }
    })

    return Array.from(grouped.entries()).map(([name, val]) => ({
        name,
        income: val.income,
        expense: val.expense
    }))
}

export async function getExpensesBreakdown(from?: string, to?: string) {
    if (!supabase) return []

    let query = supabase
        .from("v_financial_transactions_norm")
        .select("*")
        .eq("is_despesa", true)
        .eq("is_realizado", true) // Only realized expenses

    if (from) query = query.gte("date_ref", from)
    if (to) query = query.lte("date_ref", to)

    const { data, error } = await query

    if (error) {
        console.error("Supabase Error (Breakdown):", error)
        return []
    }

    // Group by category
    const grouped = new Map<string, number>()
    data?.forEach(row => {
        const cat = row.category || "Outros"
        grouped.set(cat, (grouped.get(cat) || 0) + safeNum(row.amount))
    })

    return Array.from(grouped.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
}

export async function getTopExpenses(from?: string, to?: string) {
    if (!supabase) return []

    // Same query as breakdown but different grouping/limiting if needed, 
    // but reusing logic for now. 
    // Actually top expenses usually by description or category?
    // Let's assume Top 5 Categories for now based on previous charts
    // Or maybe Top 5 Descriptions? The component says "Maiores Despesas", 
    // chart usually shows specific items. Let's group by Description for "Top Expenses".

    let query = supabase
        .from("v_financial_transactions_norm")
        .select("*")
        .eq("is_despesa", true)
        .eq("is_realizado", true)

    if (from) query = query.gte("date_ref", from)
    if (to) query = query.lte("date_ref", to)

    const { data, error } = await query

    if (error) return []

    // Group by description (merging identical descriptions)
    const grouped = new Map<string, number>()
    data?.forEach(row => {
        const desc = row.description || "Sem descrição"
        grouped.set(desc, (grouped.get(desc) || 0) + safeNum(row.amount))
    })

    return Array.from(grouped.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
}

export async function getRecentTransactions() {
    if (!supabase) return []

    const { data, error } = await supabase
        .from("v_financial_transactions_norm")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

    if (error) {
        console.error("Supabase Error (Recent):", error)
        return []
    }

    return data
}

export async function createCommissionTransaction(amount: number, dateRef: Date, description: string) {
    if (!supabase) throw new Error("Supabase not initialized")

    const { error } = await supabase
        .from("financial_transactions")
        .insert({
            description,
            amount,
            type: "expense",
            category: "Comissão",
            status: "pago", // Commissions are usually immediate or accrued as paid for closing purposes
            payment_date: dateRef.toISOString().split('T')[0],
            due_date: dateRef.toISOString().split('T')[0],
            department: "Financeiro"
        })

    if (error) throw error
}

export async function getMonthlyClosingSummary(month: number, year: number) {
    // Month is 0-indexed in JS Date? Let's assume 1-indexed for argument ease, convert inside
    // Actually better to pass start/end dates

    // Construct date range for the full month
    const startDate = new Date(year, month - 1, 1) // month is 1-based, JS is 0-based
    const endDate = new Date(year, month, 0) // Last day of month

    const from = format(startDate, 'yyyy-MM-dd')
    const to = format(endDate, 'yyyy-MM-dd')

    return getFinanceSummary(from, to)
}
