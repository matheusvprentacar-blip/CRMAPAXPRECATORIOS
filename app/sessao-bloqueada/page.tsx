"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Clock, LogOut, CalendarClock } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { isWithinAllowedHours, getProximoAcesso, formatCountdown } from "@/lib/auth/horarios"
import { Button } from "@/components/ui/button"

export default function SessaoBloqueadaPage() {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  const [minutosRestantes, setMinutosRestantes] = useState<number | null>(null)
  const [proximoLabel, setProximoLabel] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // Recalcula a cada minuto
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const horarios = profile?.horarios_permitidos

    // Se já estiver no horário permitido, redireciona de volta
    if (isWithinAllowedHours(horarios)) {
      router.replace("/dashboard")
      return
    }

    const proximo = getProximoAcesso(horarios)
    if (proximo) {
      setMinutosRestantes(proximo.minutosRestantes)
      setProximoLabel(proximo.label)
    } else {
      setMinutosRestantes(null)
      setProximoLabel(null)
    }
  }, [profile, tick, router])

  const handleSignOut = async () => {
    await signOut()
    router.replace("/login")
  }

  const countdown = minutosRestantes !== null ? formatCountdown(minutosRestantes) : null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Glow de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/8 blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center">
        {/* Ícone */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 shadow-[0_0_40px_-10px_hsl(var(--destructive)/0.4)]">
          <Lock className="h-9 w-9 text-destructive" />
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sessão bloqueada</h1>
          <p className="text-sm text-muted-foreground">
            Seu acesso está restrito fora do horário permitido pela sua organização.
          </p>
        </div>

        {/* Timer */}
        {countdown && (
          <div className="w-full rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
            <div className="mb-1 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Disponível em
            </div>
            <div className="mt-2 text-5xl font-bold tabular-nums text-foreground">{countdown}</div>
            {proximoLabel && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4 shrink-0" />
                <span>{proximoLabel}</span>
              </div>
            )}
          </div>
        )}

        {!countdown && !proximoLabel && (
          <div className="w-full rounded-2xl border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground backdrop-blur-sm">
            Nenhum horário permitido configurado para os próximos 7 dias.
            <br />
            Entre em contato com o administrador.
          </div>
        )}

        {/* Info adicional */}
        <p className="text-xs text-muted-foreground/60">
          O sistema verificará automaticamente quando seu horário for liberado.
        </p>

        {/* Sair */}
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
