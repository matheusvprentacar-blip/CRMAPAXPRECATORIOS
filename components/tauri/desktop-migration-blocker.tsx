"use client"

import { useEffect, useState } from "react"

const WEB_URL = "https://precatorios.grupoapax.com"

function isTauriRuntime() {
  if (typeof window === "undefined") return false
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window
}

export function DesktopMigrationBlocker() {
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    setIsTauri(isTauriRuntime())
  }, [])

  if (!isTauri) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-primary/20 bg-card p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold text-foreground">Aplicativo desktop descontinuado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Esta versão foi desativada permanentemente. O acesso ao CRM APAX agora é feito somente pela web.
        </p>

        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">URL oficial</p>
          <a
            href={WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block break-all text-base font-semibold text-primary underline underline-offset-4"
          >
            precatorios.grupoapax.com
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Abrir no navegador
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Recarregar
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Após acessar pelo navegador, recomendamos desinstalar este aplicativo desktop.
        </p>
      </div>
    </div>
  )
}

