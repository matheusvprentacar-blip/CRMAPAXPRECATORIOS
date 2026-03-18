"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  Modal,
  Button,
  TextField,
  Input,
  Label,
  Surface
} from "@heroui/react"
import { Lock } from "@/components/icons"

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
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && !loading && onSignOut()}
      isDismissable={false}
    >
      <Modal.Container placement="center" size="md">
        <Modal.Dialog className="rounded-3xl border-none bg-white shadow-none outline-none dark:bg-zinc-900">
          {() => (
            <Surface
              className="flex flex-col w-full max-w-full overflow-hidden border border-default-200 rounded-3xl shadow-2xl bg-white dark:bg-zinc-900 opacity-100"
            >
              <Modal.CloseTrigger className="absolute right-4 top-4" />
              <Modal.Header className="flex flex-col gap-1 px-8 pt-8 font-bold">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary mb-3 font-semibold">
                  <Lock className="h-6 w-6" />
                </div>
                <Modal.Heading className="text-2xl text-primary tracking-tight">Sessão bloqueada</Modal.Heading>
                <p className="text-sm font-normal text-default-500 mt-1">
                  {reason === "idle_timeout"
                    ? "Detectamos inatividade e protegemos sua sessão. Digite sua senha para continuar de onde parou."
                    : "Digite sua senha para desbloquear sua sessão."}
                </p>
              </Modal.Header>

              <Modal.Body className="px-8 py-6">
                <form className="space-y-6" id="session-unlock-form" onSubmit={handleSubmit}>
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
                  <TextField
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={setPassword}
                    isDisabled={loading}
                    isRequired
                    fullWidth
                  >
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-default-400 mb-1.5">Senha de Acesso</Label>
                    <Input
                      ref={inputRef}
                      value={password}
                      placeholder="Sua senha secreta..."
                      className="h-12 w-full px-4 rounded-xl bg-default-100 dark:bg-zinc-800 border border-default-200 focus:border-primary transition-colors font-medium text-foreground"
                    />
                  </TextField>

                  {error && (
                    <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive font-medium">
                      {error}
                    </p>
                  )}
                </form>
              </Modal.Body>

              <Modal.Footer className="px-8 pb-8 pt-2 flex items-center justify-between gap-4">
                <Button
                  variant="secondary"
                  className="h-11 px-6 font-semibold rounded-full"
                  onPress={() => void onSignOut()}
                  isDisabled={loading}
                >
                  Sair da conta
                </Button>
                <Button
                  variant="primary"
                  className="h-11 px-10 font-bold bg-primary text-white rounded-full shadow-xl shadow-primary/30 hover:scale-[1.02] transition-transform active:scale-[0.98]"
                  form="session-unlock-form"
                  type="submit"
                  isLoading={loading}
                  isDisabled={password.trim().length === 0}
                >
                  Desbloquear
                </Button>
              </Modal.Footer>
            </Surface>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
