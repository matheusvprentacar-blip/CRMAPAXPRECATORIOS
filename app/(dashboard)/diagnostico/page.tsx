"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function DiagnosticoPage() {
    const searchParams = useSearchParams()
    const [precatorioId, setPrecatorioId] = useState(searchParams.get("id") || "")
    const [logs, setLogs] = useState<string[]>([])

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

    const supabase = createClient()

    // Helper to extract UUID
    const getCleanId = () => {
        const val = precatorioId.trim()
        if (val.includes("id=")) {
            const match = val.match(/id=([a-f0-9-]+)/)
            return match ? match[1] : val
        }
        return val
    }

    async function testUpdateStatus() {
        const id = getCleanId()
        addLog(`Iniciando teste UPDATE STATUS para ID: ${id}`)
        try {
            if (!supabase) throw new Error("Supabase client not init")

            const { data, error } = await supabase
                .from("precatorios")
                .update({
                    status: "calculo_concluido",
                    localizacao_kanban: "calculo_concluido",
                    updated_at: new Date().toISOString()
                })
                .eq("id", id)
                .select()

            if (error) {
                addLog(`❌ ERRO UPDATE STATUS: code=${error.code} message=${error.message} details=${error.details} hint=${error.hint}`)
                console.error("Full error:", error)
            } else {
                addLog("✅ SUCESSO UPDATE STATUS")
            }
        } catch (e: any) {
            addLog(`❌ EXCEPTION: ${e.message}`)
        }
    }

    async function testUpdateDados() {
        const id = getCleanId()
        addLog(`Iniciando teste UPDATE DADOS (valor_principal) para ID: ${id}`)
        try {
            if (!supabase) throw new Error("Supabase client not init")

            const { data, error } = await supabase
                .from("precatorios")
                .update({
                    valor_principal: 100.50,
                })
                .eq("id", id)
                .select()

            if (error) {
                addLog(`❌ ERRO UPDATE DADOS: code=${error.code} message=${error.message} details=${error.details} hint=${error.hint}`)
            } else {
                addLog("✅ SUCESSO UPDATE DADOS")
            }
        } catch (e: any) {
            addLog(`❌ EXCEPTION: ${e.message}`)
        }
    }

    async function testInsertAtividade() {
        const id = getCleanId()
        addLog(`Iniciando teste INSERT ATIVIDADE para ID: ${id}`)
        try {
            if (!supabase) throw new Error("Supabase client not init")
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                addLog("❌ ERRO: Usuário não logado")
                return
            }

            const { data, error } = await supabase
                .from("atividades")
                .insert({
                    precatorio_id: id,
                    usuario_id: user.id,
                    tipo: "calculo",
                    descricao: "Teste de diagnóstico",
                    dados_novos: { teste: true }
                })
                .select()

            if (error) {
                addLog(`❌ ERRO INSERT ATIVIDADE: code=${error.code} message=${error.message} details=${error.details} hint=${error.hint}`)
            } else {
                addLog("✅ SUCESSO INSERT ATIVIDADE")
            }
        } catch (e: any) {
            addLog(`❌ EXCEPTION: ${e.message}`)
        }
    }

    return (
        <div className="container p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Diagnóstico de Erros de Salvamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="ID do Precatório (apenas o UUID)"
                            value={precatorioId}
                            onChange={e => setPrecatorioId(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={testUpdateStatus}>Testar Update Status</Button>
                        <Button onClick={testUpdateDados} variant="secondary">Testar Update Dados</Button>
                        <Button onClick={testInsertAtividade} variant="outline">Testar Insert Atividade</Button>
                    </div>

                    <div className="bg-slate-950 text-green-400 p-4 rounded-md font-mono text-xs h-96 overflow-auto">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        {logs.length === 0 && <span className="text-slate-500">Aguardando testes...</span>}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
