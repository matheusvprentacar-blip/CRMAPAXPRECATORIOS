"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Loader2 } from "@/components/icons"

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
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg p-10 [&>button:last-child]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl text-primary">Sessão bloqueada</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {reason === "idle_timeout"
              ? "Detectamos inatividade e protegemos sua sessão. Digite sua senha para continuar de onde parou."
              : "Digite sua senha para desbloquear sua sessão."}
          </DialogDescription>
        </DialogHeader>

        <form id="session-unlock-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <input
            type="text"
            name="username"
            autoComplete="username"
            value="session-user"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Senha de Acesso
            </Label>
            <Input
              ref={inputRef}
              id="session-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha secreta..."
              disabled={loading}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive font-medium">
              {error}
            </p>
          )}
        </form>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-4 pt-2">
          <Button
            variant="ghost"
            onClick={() => void onSignOut()}
            disabled={loading}
          >
            Sair da conta
          </Button>
          <Button
            form="session-unlock-form"
            type="submit"
            disabled={loading || password.trim().length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Desbloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
