"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function UpdateChecker() {
  const currentVersion = useMemo(() => process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0", [])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground">Versao Atual:</span>
        <Badge variant="outline" className="bg-background/50 font-mono text-xs text-foreground">
          v{currentVersion}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        O sistema roda exclusivamente via navegador (Chrome). As atualizações são aplicadas no deploy web.
      </p>

      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full border-dashed border-primary/30 text-xs transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
        onClick={() => window.location.reload()}
      >
        Recarregar para buscar versão mais recente
      </Button>
    </div>
  )
}
