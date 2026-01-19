import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";

interface PrecatorioData {
    credor_nome?: string;
    valor_principal?: number;
    numero_precatorio?: string;
    tribunal?: string;
    credor_cpf_cnpj?: string;
    numero_processo?: string;
    natureza?: string;
    file_url?: string;
    raw_text?: string;
    // add other fields as needed
}

interface ModalCriarPrecatorioProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data?: PrecatorioData;
    onSuccess?: () => void;
}

export function ModalCriarPrecatorio({ open, onOpenChange, data = {}, onSuccess }: ModalCriarPrecatorioProps) {
    const [credor, setCredor] = useState(data?.credor_nome ?? "");
    const [valor, setValor] = useState(data?.valor_principal?.toString() ?? "");
    const [numero, setNumero] = useState(data?.numero_precatorio ?? "");
    const [tribunal, setTribunal] = useState(data?.tribunal ?? "");
    const [cpf, setCpf] = useState(data?.credor_cpf_cnpj ?? "");
    const [processo, setProcesso] = useState(data?.numero_processo ?? "");
    const [natureza, setNatureza] = useState(data?.natureza ?? "");
    const [saving, setSaving] = useState(false);

    // Update state when data prop changes
    useEffect(() => {
        if (!data) return;
        setCredor(data.credor_nome ?? "");
        setValor(data.valor_principal ? String(data.valor_principal) : "");
        setNumero(data.numero_precatorio ?? "");
        setTribunal(data.tribunal ?? "");
        setCpf(data.credor_cpf_cnpj ?? "");
        setProcesso(data.numero_processo ?? "");
        setNatureza(data.natureza ?? "");
    }, [data]);

    const handleSave = async () => {
        setSaving(true);
        const supabase = createBrowserClient();
        if (!supabase) {
            toast.error("Erro interno: Cliente Supabase não inicializado");
            setSaving(false);
            return;
        }

        if (!credor || !numero) {
            toast.error("Por favor, preencha os campos obrigatórios (Credor e Número).");
            setSaving(false);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Erro: Usuário não autenticado");
            setSaving(false);
            return;
        }

        const payload = {
            criado_por: user.id,
            credor_nome: credor,
            valor_principal: Number(valor) || 0,
            numero_precatorio: numero,
            tribunal: tribunal,
            credor_cpf_cnpj: cpf,
            numero_processo: processo,
            natureza: natureza,
            status: "novo",
            titulo: `Precatório ${numero} - ${credor}`, // Auto-generate title
            // Store OCR metadata
            raw_text: data?.raw_text,
            file_url: data?.file_url
        };
        const { error } = await supabase.from("precatorios").insert([payload]);
        if (error) {
            if (error.code === '23505') {
                toast.error("Erro: Este Número de Precatório já está cadastrado no sistema.");
            } else {
                toast.error("Erro ao criar precatório: " + error.message);
            }
        } else {
            toast.success("Precatório criado com sucesso!");
            onSuccess?.();
            onOpenChange(false);
        }
        setSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Criar Precatório a partir da Extração OCR</DialogTitle>
                    <DialogDescription>Revise os dados extraídos e o documento original antes de salvar.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden min-h-0">
                    {/* Left Column: Form */}
                    <div className="space-y-4 py-4 overflow-y-auto pr-2">
                        <div className="space-y-2">
                            <Label>Credor</Label>
                            <Input value={credor} onChange={(e) => setCredor(e.target.value)} placeholder="Nome do Credor" />
                        </div>
                        <div className="space-y-2">
                            <Label>CPF/CNPJ do Credor</Label>
                            <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Principal</Label>
                            <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Número do Precatório</Label>
                            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
                        </div>
                        <div className="space-y-2">
                            <Label>Número do Processo (Originário)</Label>
                            <Input value={processo} onChange={(e) => setProcesso(e.target.value)} placeholder="Numeração Única" />
                        </div>
                        <div className="space-y-2">
                            <Label>Tribunal</Label>
                            <Input value={tribunal} onChange={(e) => setTribunal(e.target.value)} placeholder="TJSP" />
                        </div>
                        <div className="space-y-2">
                            <Label>Natureza</Label>
                            <Input value={natureza} onChange={(e) => setNatureza(e.target.value)} placeholder="Alimentar ou Comum" />
                        </div>

                        {/* Debug Info (Optional - Can be removed later) */}
                        {data?.raw_text && (
                            <div className="mt-6 pt-4 border-t">
                                <Label className="text-xs text-muted-foreground mb-2 block">Texto Extraído (Debug)</Label>
                                <textarea
                                    className="w-full text-xs p-2 border rounded h-32 bg-muted text-muted-foreground"
                                    readOnly
                                    value={data.raw_text}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right Column: PDF Viewer */}
                    <div className="rounded-lg border bg-muted/50 overflow-hidden flex flex-col">
                        <div className="bg-muted p-2 border-b text-xs font-medium text-center">
                            Visualização do Documento
                        </div>
                        <div className="flex-1 relative">
                            {data?.file_url ? (
                                <iframe
                                    src={data.file_url}
                                    className="absolute inset-0 w-full h-full"
                                    title="Document Viewer"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                                    Nenhum arquivo visualizável disponível.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Salvando..." : "Salvar Precatório"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
