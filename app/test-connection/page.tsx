"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "@/components/icons"
import { getSupabase, getSupabasePublicConfig, probeSupabaseAuthConnectivity } from "@/lib/supabase/client"

type ConnectionDetails = Record<string, string | number | boolean | null>

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido"
}

export default function TestConnectionPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState<ConnectionDetails | null>(null)

  const testConnection = async () => {
    setStatus("loading")
    setMessage("Testando conexão...")

    try {
      const supabase = getSupabase()
      const publicConfig = getSupabasePublicConfig()
      const authProbe = await probeSupabaseAuthConnectivity()

      if (!supabase) {
        throw new Error("Cliente Supabase não foi inicializado. Verifique as variáveis de ambiente.")
      }

      if (!authProbe.ok) {
        throw new Error(`Host público do Supabase inacessível: ${authProbe.errorMessage}`)
      }

      // Teste 1: Verificar se consegue conectar
      const { error: healthError } = await supabase.from("usuarios").select("count").limit(0)

      if (healthError) {
        throw new Error(`Erro na conexão: ${healthError.message}`)
      }

      // Teste 2: Verificar autenticação
      const {
        data: { user },
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
        supabaseUrl: publicConfig.url,
        supabaseHost: authProbe.host,
        authReachable: authProbe.ok,
        authStatus: authProbe.status,
      })
    } catch (error) {
      console.error("[v0] Erro no teste de conexão:", error)
      const publicConfig = getSupabasePublicConfig()
      const authProbe = await probeSupabaseAuthConnectivity()
      const errorMessage = getErrorMessage(error)
      setStatus("error")
      setMessage(errorMessage)
      setDetails({
        error: errorMessage,
        supabaseUrl: publicConfig.url,
        supabaseHost: authProbe.host,
        authReachable: authProbe.ok,
        authError: authProbe.ok ? null : authProbe.errorMessage,
        authStatus: authProbe.ok ? authProbe.status : "sem resposta",
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
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-primary" />}
            {status === "error" && <XCircle className="h-6 w-6 text-destructive" />}
            Teste de Conexão Supabase
          </CardTitle>
          <CardDescription>Verificando configuração e conectividade com o banco de dados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted border">
            <p className="font-medium mb-2">Status:</p>
            <p
              className={`text-lg ${
                status === "success" ? "text-primary" : status === "error" ? "text-destructive" : "text-primary"
              }`}
            >
              {message}
            </p>
          </div>

          {details && (
            <div className="p-4 rounded-lg bg-muted border space-y-2">
              <p className="font-medium mb-2">Detalhes:</p>
              {Object.entries(details).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                  <span className="font-mono text-muted-foreground">
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
