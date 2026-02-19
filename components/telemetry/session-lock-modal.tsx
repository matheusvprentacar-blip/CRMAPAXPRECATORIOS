"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

interface SessionLockModalProps {
  open: boolean
  loading: boolean
  error: string | null
  reason: "idle_timeout" | null
  onUnlock: (password: string) => Promise<boolean>
  onSignOut: () => Promise<void>
}

export function SessionLockModal({ open, loading, error, reason, onUnlock, onSignOut }: SessionLockModalProps) {
  const [password, setPassword] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setPassword("")
      return
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 120)

    return () => window.clearTimeout(timer)
  }, [open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onUnlock(password)
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-md rounded-2xl border-orange-200/70 dark:border-zinc-700">
        <AlertDialogHeader className="space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <Lock className="h-5 w-5" />
          </div>
          <AlertDialogTitle>Sessão bloqueada</AlertDialogTitle>
          <AlertDialogDescription>
            {reason === "idle_timeout"
              ? "Detectamos inatividade e protegemos sua sessão. Digite sua senha para continuar de onde parou."
              : "Digite sua senha para desbloquear sua sessão."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="session-unlock-password">Senha</Label>
            <Input
              ref={inputRef}
              id="session-unlock-password"
              type="password"
              autoComplete="current-password"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => void onSignOut()} disabled={loading}>
              Sair da conta
            </Button>
            <Button type="submit" disabled={loading || password.trim().length === 0}>
              {loading ? "Validando..." : "Desbloquear"}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}