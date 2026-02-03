"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Usuario, HRDocument } from "@/lib/types/database"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { FileText, Upload, Trash2, Download, Plus, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface DocumentsTabProps {
    user: Usuario
}

export function DocumentsTab({ user }: DocumentsTabProps) {
    const [documents, setDocuments] = useState<HRDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [uploadOpen, setUploadOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [newDoc, setNewDoc] = useState({ title: "", type: "documento" as const, file: null as File | null })
    const { toast } = useToast()

    useEffect(() => {
        loadDocuments()
    }, [user.id])

    async function loadDocuments() {
        const supabase = createBrowserClient()
        const { data } = await supabase
            .from("hr_documents")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

        if (data) setDocuments(data as HRDocument[])
        setLoading(false)
    }

    async function handleUpload() {
        if (!newDoc.file || !newDoc.title) return

        setUploading(true)
        const supabase = createBrowserClient()
        try {
            const fileExt = newDoc.file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`

            // Upload file to storage
            const { error: uploadError } = await supabase.storage
                .from('documents') // Assumes bucket 'documents' exists, or 'hr-documents'
                .upload(fileName, newDoc.file)

            if (uploadError) throw uploadError

            const publicUrl = supabase.storage.from('documents').getPublicUrl(fileName).data.publicUrl

            // Save record
            const { error: dbError } = await supabase.from("hr_documents").insert({
                user_id: user.id,
                title: newDoc.title,
                type: newDoc.type,
                url: publicUrl // Or private path if RLS strict, but publicUrl for simplicity here
            })

            if (dbError) throw dbError

            toast({ title: "Documento enviado!" })
            setUploadOpen(false)
            setNewDoc({ title: "", type: "documento", file: null })
            loadDocuments()

        } catch (err: any) {
            toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" })
        } finally {
            setUploading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja apagar este documento?")) return

        const supabase = createBrowserClient()
        await supabase.from("hr_documents").delete().eq("id", id)
        loadDocuments()
        toast({ title: "Documento removido" })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Documentos do Colaborador</h3>
                <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogTrigger asChild>
                        <Button><Upload className="w-4 h-4 mr-2" /> Upload Documento</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Enviar Documento</DialogTitle>
                            <DialogDescription>Selecione um arquivo PDF ou imagem.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Título do Documento</Label>
                                <Input
                                    placeholder="Ex: Contrato de Trabalho"
                                    value={newDoc.title}
                                    onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={newDoc.type}
                                    onValueChange={(v: any) => setNewDoc({ ...newDoc, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="documento">Documento Geral</SelectItem>
                                        <SelectItem value="contrato">Contrato</SelectItem>
                                        <SelectItem value="atestado">Atestado</SelectItem>
                                        <SelectItem value="outros">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Arquivo</Label>
                                <Input
                                    type="file"
                                    onChange={e => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
                            <Button onClick={handleUpload} disabled={uploading}>
                                {uploading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                Enviar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => (
                    <Card key={doc.id}>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                <div className="font-semibold text-sm truncate max-w-[150px]" title={doc.title}>{doc.title}</div>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(doc.url, '_blank')}>
                                    <Download className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(doc.id)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
                            <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </CardContent>
                    </Card>
                ))}
                {documents.length === 0 && !loading && (
                    <div className="col-span-full text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                        Nenhum documento encontrado.
                    </div>
                )}
            </div>
        </div>
    )
}
