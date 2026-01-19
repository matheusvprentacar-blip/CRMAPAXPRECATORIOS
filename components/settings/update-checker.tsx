"use client"

import { useState, useEffect } from "react"
import { getVersion } from "@tauri-apps/api/app"
import { relaunch } from "@tauri-apps/plugin-process"
import { open } from "@tauri-apps/api/shell"
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

export function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState<any>(null)
    const [checking, setChecking] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [open, setOpen] = useState(false)
    const [isTauri, setIsTauri] = useState(false)
    const [currentVersion, setCurrentVersion] = useState<string>("")

    useEffect(() => {
        const isTauriWindow = typeof window !== "undefined" &&
            ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)

        setIsTauri(isTauriWindow)

        if (isTauriWindow) {
            getVersion().then(v => setCurrentVersion(v)).catch(console.error)
        }
    }, [])

    async function checkForUpdates() {
        if (!isTauri) return

        setChecking(true)
        try {
            let update = null
            if (isTauri) {
                try {
                    const { check } = await import("@tauri-apps/plugin-updater")
                    if (typeof (window as any).__TAURI__?.invoke === "function") {
                        update = await check()
                    } else {
                        console.warn("Tauri invoke not available")
                    }
                } catch (e) {
                    console.warn("Tauri updater not available", e)
                }
            }
            if (update && update.available) {
                setUpdateAvailable(update)
                setOpen(true)
            } else {
                toast({
                    title: "Você está atualizado!",
                    description: `A versão v${currentVersion} é a mais recente.`,
                    duration: 3000,
                })
            }
        } catch (error) {
            console.error("Erro ao buscar atualizações:", error)
            toast({
                title: "Erro na verificação",
                description: "Não foi possível buscar atualizações.",
                variant: "destructive",
            })
        } finally {
            setChecking(false)
        }
    }

    async function installUpdate() {
        if (!updateAvailable) return

        // Try to get the installer URL from the update payload
        const installerUrl = (updateAvailable as any)?.url || (updateAvailable as any)?.assets?.[0]?.url
        if (!installerUrl) {
            toast({
                title: "Erro",
                description: "URL do instalador não encontrado.",
                variant: "destructive",
            })
            return
        }

        try {
            // Open the installer URL in the default browser to start download
            await open(installerUrl)
            toast({
                title: "Download iniciado",
                description: "O instalador está sendo baixado no navegador.",
            })
        } catch (error) {
            console.error("Erro ao abrir URL do instalador:", error)
            toast({
                title: "Erro ao baixar",
                description: "Não foi possível abrir o link do instalador.",
                variant: "destructive",
            })
        }
    }

    if (!isTauri) return null

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded-md border border-border/50">
                <span className="text-xs text-muted-foreground font-medium">Versão Atual:</span>
                <Badge variant="outline" className="text-xs bg-background/50 text-foreground font-mono">
                    v{currentVersion || "..."}
                </Badge>
            </div>

            <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
                onClick={checkForUpdates}
                disabled={checking}
            >
                {checking ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                    <RotateCw className="mr-2 h-3.5 w-3.5" />
                )}
                {checking ? "Verificando..." : "Buscar Atualizações"}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <Upload className="w-5 h-5" />
                            Nova Versão Disponível
                        </DialogTitle>
                        <DialogDescription className="pt-2 space-y-3">
                            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Versão Atual</span>
                                    <span className="font-mono font-bold text-foreground">v{currentVersion}</span>
                                </div>
                                <div className="text-muted-foreground">→</div>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-muted-foreground">Nova Versão</span>
                                    <span className="font-mono font-bold text-primary">v{updateAvailable?.version}</span>
                                </div>
                            </div>

                            {updateAvailable?.body ? (
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground">Notas da Versão:</span>
                                    <div className="p-3 bg-muted rounded-md text-xs font-mono max-h-[150px] overflow-y-auto border border-border/50 whitespace-pre-wrap">
                                        {updateAvailable.body}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Melhorias e correções de bugs.</p>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {downloading && (
                        <div className="py-4 space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-primary">Baixando atualização...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={downloading}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancelar
                        </Button>
                        <Button onClick={installUpdate} disabled={downloading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            {downloading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Instalando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Confirmar e Atualizar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
