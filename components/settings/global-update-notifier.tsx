"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getVersion } from "@tauri-apps/api/app"
import { relaunch } from "@tauri-apps/plugin-process"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Loader2, Upload } from "lucide-react"

type UpdaterModule = typeof import("@tauri-apps/plugin-updater")
type AvailableUpdate = Awaited<ReturnType<UpdaterModule["check"]>>
const RECHECK_INTERVAL_MS = 15 * 60 * 1000

function isTauriWindow(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  )
}

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

export function GlobalUpdateNotifier() {
  const checkedRef = useRef(false)
  const checkingRef = useRef(false)

  const [isTauri, setIsTauri] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string>("")
  const [updateAvailable, setUpdateAvailable] = useState<AvailableUpdate>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [downloading, setDownloading] = useState(false)
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const [totalBytes, setTotalBytes] = useState<number | null>(null)

  const progress = useMemo(() => {
    if (!totalBytes || totalBytes <= 0) return null
    return Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
  }, [downloadedBytes, totalBytes])

  useEffect(() => {
    let mounted = true
    const tauriByWindow = isTauriWindow()

    getVersion()
      .then((version) => {
        if (!mounted) return
        setIsTauri(true)
        setCurrentVersion(version)
      })
      .catch(() => {
        if (!mounted) return
        setIsTauri(tauriByWindow)
      })

    return () => {
      mounted = false
    }
  }, [])

  const checkForUpdates = useCallback(async () => {
    if (!isTauri) return
    if (checkingRef.current) return
    checkingRef.current = true

    try {
      const { check } = await import("@tauri-apps/plugin-updater")
      const update = await check()
      if (!update) return

      if (updateAvailable?.version === update.version) return

      setUpdateAvailable(update)
      setDialogOpen(true)
    } catch (error) {
      console.error("Erro ao buscar atualizacoes:", error)
    } finally {
      checkingRef.current = false
    }
  }, [isTauri, updateAvailable?.version])

  useEffect(() => {
    if (!isTauri) return
    if (checkedRef.current) return
    checkedRef.current = true

    // Slight delay so we don't fight with initial layout/hydration.
    const timer = window.setTimeout(() => {
      void checkForUpdates()
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [checkForUpdates, isTauri])

  useEffect(() => {
    if (!isTauri) return

    const interval = window.setInterval(() => {
      void checkForUpdates()
    }, RECHECK_INTERVAL_MS)

    const onFocus = () => {
      void checkForUpdates()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates()
      }
    }

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [checkForUpdates, isTauri])

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

      setDialogOpen(false)
      await relaunch()
    } catch (error) {
      console.error("Erro ao instalar atualizacao:", error)
      // Keep the modal open so user can try again.
    } finally {
      setDownloading(false)
    }
  }

  if (!isTauri) return null

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (downloading) return
        setDialogOpen(open)
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Upload className="h-5 w-5" />
            Atualizacao do sistema disponivel
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Existe uma nova versao disponivel. Recomendamos atualizar agora para receber melhorias e
              correcoes.
            </p>

            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Versao Atual</span>
                <Badge variant="outline" className="w-fit bg-background/50 font-mono text-xs">
                  v{currentVersion || "..."}
                </Badge>
              </div>
              <div className="text-muted-foreground">-&gt;</div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-muted-foreground">Nova Versao</span>
                <Badge className="w-fit self-end bg-primary font-mono text-xs text-primary-foreground">
                  v{updateAvailable?.version}
                </Badge>
              </div>
            </div>

            {updateAvailable?.body ? (
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Notas da versao:
                </span>
                <div className="max-h-[180px] overflow-y-auto whitespace-pre-wrap rounded-md border border-border/50 bg-muted p-3 font-mono text-xs">
                  {updateAvailable.body}
                </div>
              </div>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {downloading && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-primary">Baixando atualizacao...</span>
              <span>{progress !== null ? `${progress}%` : formatBytes(downloadedBytes)}</span>
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
            Agora nao
          </Button>
          <Button onClick={installUpdate} disabled={downloading}>
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Instalando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Atualizar agora
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
