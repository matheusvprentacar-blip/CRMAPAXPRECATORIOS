"use client"

import { useEffect, useMemo, useState } from "react"
import { getVersion } from "@tauri-apps/api/app"
import { relaunch } from "@tauri-apps/plugin-process"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, Loader2, RotateCw, CheckCircle2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

type UpdaterModule = typeof import("@tauri-apps/plugin-updater")
type AvailableUpdate = Awaited<ReturnType<UpdaterModule["check"]>>

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<AvailableUpdate>(null)
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isTauri, setIsTauri] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string>("")
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const [totalBytes, setTotalBytes] = useState<number | null>(null)

  const progress = useMemo(() => {
    if (!totalBytes || totalBytes <= 0) return null
    return Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
  }, [downloadedBytes, totalBytes])

  useEffect(() => {
    const isTauriWindow =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)

    setIsTauri(isTauriWindow)

    if (isTauriWindow) {
      getVersion().then(setCurrentVersion).catch(console.error)
    }
  }, [])

  async function checkForUpdates() {
    if (!isTauri) return

    setChecking(true)
    try {
      const { check } = await import("@tauri-apps/plugin-updater")
      const update = await check()

      if (update) {
        setUpdateAvailable(update)
        setDialogOpen(true)
        return
      }

      toast({
        title: "Sem atualizacoes",
        description: `Voce ja esta na versao v${currentVersion}.`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Erro ao buscar atualizacoes:", error)
      toast({
        title: "Erro na verificacao",
        description: "Nao foi possivel buscar atualizacoes agora.",
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  async function installUpdate() {
    if (!updateAvailable) return

    setDownloading(true)
    setDownloadedBytes(0)
    setTotalBytes(null)

    try {
      let currentTotal = 0
      await updateAvailable.downloadAndInstall((event) => {
        if (event.event === "Started") {
          setDownloadedBytes(0)
          currentTotal = event.data.contentLength ?? 0
          setTotalBytes(currentTotal || null)
          return
        }

        if (event.event === "Progress") {
          setDownloadedBytes((prev) => prev + event.data.chunkLength)
          return
        }

        if (event.event === "Finished" && currentTotal > 0) {
          setDownloadedBytes(currentTotal)
        }
      })

      toast({
        title: "Atualizacao instalada",
        description: "O app sera reiniciado para aplicar a nova versao.",
      })

      setDialogOpen(false)
      await relaunch()
    } catch (error) {
      console.error("Erro ao instalar atualizacao:", error)
      toast({
        title: "Erro ao atualizar",
        description: "Falha ao baixar ou instalar a atualizacao.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  if (!isTauri) {
    return (
      <p className="text-xs text-muted-foreground">
        Recurso disponivel apenas no aplicativo desktop.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground">Versao Atual:</span>
        <Badge variant="outline" className="bg-background/50 font-mono text-xs text-foreground">
          v{currentVersion || "..."}
        </Badge>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full justify-start border-dashed border-primary/30 text-xs transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
        onClick={checkForUpdates}
        disabled={checking}
      >
        {checking ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <RotateCw className="mr-2 h-3.5 w-3.5" />
        )}
        {checking ? "Verificando..." : "Buscar Atualizacoes"}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Upload className="h-5 w-5" />
              Nova Versao Disponivel
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Versao Atual</span>
                  <span className="font-mono font-bold text-foreground">v{currentVersion}</span>
                </div>
                <div className="text-muted-foreground">-&gt;</div>
                <div className="flex flex-col text-right">
                  <span className="text-xs text-muted-foreground">Nova Versao</span>
                  <span className="font-mono font-bold text-primary">v{updateAvailable?.version}</span>
                </div>
              </div>

              {updateAvailable?.body ? (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Notas da Versao:
                  </span>
                  <div className="max-h-[150px] overflow-y-auto whitespace-pre-wrap rounded-md border border-border/50 bg-muted p-3 font-mono text-xs">
                    {updateAvailable.body}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Melhorias e correcoes de bugs.</p>
              )}
            </DialogDescription>
          </DialogHeader>

          {downloading && (
            <div className="space-y-2 py-4">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-primary">Baixando atualizacao...</span>
                <span>
                  {progress !== null ? `${progress}%` : formatBytes(downloadedBytes)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/50">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress ?? 20}%` }}
                />
              </div>
              {totalBytes ? (
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(downloadedBytes)} de {formatBytes(totalBytes)}
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={downloading}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={installUpdate}
              disabled={downloading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Instalando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Atualizar Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
