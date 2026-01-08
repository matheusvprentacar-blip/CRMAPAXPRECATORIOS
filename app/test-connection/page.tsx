"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"

export default function TestConnectionPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState<any>(null)

  const testConnection = async () => {
    setStatus("loading")
    setMessage("Testando conexão...")

    try {
      const supabase = getSupabase()

      if (!supabase) {
        throw new Error("Cliente Supabase não foi inicializado. Verifique as variáveis de ambiente.")
      }

      // Teste 1: Verificar se consegue conectar
      const { data: healthCheck, error: healthError } = await supabase.from("usuarios").select("count").limit(0)

      if (healthError) {
        throw new Error(`Erro na conexão: ${healthError.message}`)
      }

      // Teste 2: Verificar autenticação
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      // Teste 3: Contar registros
      const { count: userCount } = await supabase.from("usuarios").select("*", { count: "exact", head: true })

      const { count: precatorioCount } = await supabase.from("precatorios").select("*", { count: "exact", head: true })

      setStatus("success")
      setMessage("Conexão estabelecida com sucesso!")
      setDetails({
        authenticated: !!user,
        userEmail: user?.email || "Não autenticado",
        totalUsers: userCount || 0,
        totalPrecatorios: precatorioCount || 0,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      })
    } catch (error: any) {
      console.error("[v0] Erro no teste de conexão:", error)
      setStatus("error")
      setMessage(error.message || "Erro desconhecido")
      setDetails({
        error: error.message,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      })
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
            {status === "error" && <XCircle className="h-6 w-6 text-red-600" />}
            Teste de Conexão Supabase
          </CardTitle>
          <CardDescription>Verificando configuração e conectividade com o banco de dados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-50 border">
            <p className="font-medium mb-2">Status:</p>
            <p
              className={`text-lg ${
                status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-blue-600"
              }`}
            >
              {message}
            </p>
          </div>

          {details && (
            <div className="p-4 rounded-lg bg-slate-50 border space-y-2">
              <p className="font-medium mb-2">Detalhes:</p>
              {Object.entries(details).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-600 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                  <span className="font-mono text-slate-900">
                    {typeof value === "boolean" ? (value ? "Sim" : "Não") : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={testConnection} disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar Novamente"
              )}
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/login")}>
              Ir para Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
