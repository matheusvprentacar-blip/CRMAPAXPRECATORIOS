"use client"

import { useState, useEffect } from "react"
// import { check } from "@tauri-apps/plugin-updater" // dynamically imported
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
import { Upload, Loader2, RotateCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState<any>(null)
    const [checking, setChecking] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [open, setOpen] = useState(false)
    const [isTauri, setIsTauri] = useState(false)

    useEffect(() => {
        // Verificar se está rodando no Tauri checando globais
        // __TAURI_INTERNALS__ é injetado pelo Tauri
        const isTauriWindow = typeof window !== "undefined" &&
            ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)

        setIsTauri(isTauriWindow)
    }, [])

    async function checkForUpdates() {
        if (!isTauri) {
            // toast({
            //   title: "Ambiente Web",
            //   description: "Atualizações automáticas apenas no App Desktop.",
            // })
            return
        }

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
                    title: "Tudo atualizado",
                    description: "Você está usando a versão mais recente.",
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

        setDownloading(true)
        let downloaded = 0
        let total = 0

        try {
            await updateAvailable.downloadAndInstall((event: any) => {
                switch (event.event) {
                    case 'Started':
                        total = event.data.contentLength || 0
                        break
                    case 'Progress':
                        downloaded += event.data.chunkLength
                        if (total > 0) {
                            setProgress(Math.round((downloaded / total) * 100))
                        }
                        break
                    case 'Finished':
                        setProgress(100)
                        break
                }
            })

            toast({
                title: "Atualização Instalada",
                description: "O aplicativo será reiniciado para aplicar as mudanças.",
            })

            await relaunch()
        } catch (error) {
            console.error("Erro ao instalar atualização:", error)
            toast({
                title: "Erro na instalação",
                description: "Falha ao instalar a atualização.",
                variant: "destructive",
            })
            setDownloading(false)
        }
    }

    if (!isTauri) return null

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={checkForUpdates}
                disabled={checking}
            >
                {checking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <RotateCw className="mr-2 h-4 w-4" />
                )}
                {checking ? "Verificando..." : "Buscar Atualizações"}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Atualização Disponível</DialogTitle>
                        <DialogDescription>
                            A versão {updateAvailable?.version} está disponível. Deseja instalar agora?
                            {updateAvailable?.body && (
                                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono max-h-40 overflow-y-auto">
                                    {updateAvailable.body}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {downloading && (
                        <div className="py-4 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span>Baixando...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={downloading}>
                            Agora não
                        </Button>
                        <Button onClick={installUpdate} disabled={downloading}>
                            {downloading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Atualizando...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Instalar e Reiniciar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
