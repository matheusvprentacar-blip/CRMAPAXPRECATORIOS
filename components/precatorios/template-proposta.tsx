"use client"

import React, { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Download } from "lucide-react"

interface TemplatePropostaProps {
    precatorio: any
}

export function TemplateProposta({ precatorio }: TemplatePropostaProps) {
    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = () => {
        window.print()
    }

    // Dados da Empresa (Fixo conforme pedido)
    const empresa = {
        nome: "Apax Investimentos Ltda.",
        cnpj: "09.121.790/0001-38",
        endereco: "Rua Horeslau Savinski, 443, Jardim Apucarana, CEP 86809-070",
    }

    const dataEmissao = new Date().toLocaleDateString("pt-BR")
    const codigoInterno = precatorio.documento_codigo_interno || `APX-${precatorio.id?.slice(0, 8).toUpperCase()}`

    return (
        <div className="flex flex-col items-center gap-6 p-4 bg-muted/30 rounded-xl border">
            <div className="flex gap-4 w-full justify-end no-print">
                <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / Salvar PDF
                </Button>
            </div>

            {/* Área do Documento - Estilizada para A4 */}
            <div
                ref={printRef}
                className="w-[210mm] min-h-[297mm] bg-background text-muted-foreground p-[20mm] shadow-2xl relative overflow-hidden print:shadow-none print:p-0 print:m-0"
                id="print-area"
            >
                {/* Marca d'água */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg] select-none text-[80px] font-bold text-muted-foreground whitespace-nowrap">
                    APAX INVESTIMENTOS
                </div>

                {/* Cabeçalho */}
                <div className="flex justify-between items-start border-b-2 border-border pb-4 mb-8">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold text-muted-foreground uppercase tracking-tighter">Apax Investimentos</h1>
                        <p className="text-xs text-muted-foreground">{empresa.cnpj} | {empresa.endereco}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-muted-foreground">CÓDIGO INTERNO</p>
                        <p className="text-sm font-mono font-bold text-muted-foreground">{codigoInterno}</p>
                        <p className="text-xs text-muted-foreground mt-1">Emissão: {dataEmissao}</p>
                    </div>
                </div>

                {/* Título do Documento */}
                <div className="text-center mb-10">
                    <h2 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">Proposta de aquisição de crédito (precatório)</h2>
                </div>

                {/* Identificação das Partes */}
                <div className="space-y-6 mb-8">
                    <section>
                        <h3 className="text-sm font-bold bg-muted p-1 mb-2 uppercase border-l-4 border-border">1. Identificação</h3>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <p><strong>CREDOR:</strong> {precatorio.credor_nome || "N/A"}</p>
                            <p><strong>CPF/CNPJ:</strong> {precatorio.credor_cpf_cnpj || "N/A"}</p>
                            <p><strong>PROCESSO:</strong> {precatorio.numero_processo || "N/A"}</p>
                            <p><strong>PRECATÓRIO:</strong> {precatorio.numero_precatorio || "N/A"}</p>
                            <p><strong>OFÍCIO:</strong> {precatorio.numero_oficio || "N/A"}</p>
                            <p><strong>TRIBUNAL:</strong> {precatorio.tribunal || "N/A"}</p>
                        </div>
                    </section>

                    {/* Demonstrativo Financeiro */}
                    <section>
                        <h3 className="text-sm font-bold bg-muted p-1 mb-2 uppercase border-l-4 border-border">2. Demonstrativo Financeiro</h3>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted border-b border-border">
                                    <tr>
                                        <th className="text-left p-2 font-bold">Item Discriminado</th>
                                        <th className="text-right p-2 font-bold">Valor (BRL)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr>
                                        <td className="p-2">Crédito Atualizado (Bruto)</td>
                                        <td className="p-2 text-right">{formatCurrency(precatorio.valor_atualizado)}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2">Honorários Contratuais</td>
                                        <td className="p-2 text-right text-destructive">({formatCurrency(precatorio.honorarios_valor || 0)})</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2">Previdência / PSS</td>
                                        <td className="p-2 text-right text-destructive">({formatCurrency(precatorio.pss_valor || 0)})</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2">Imposto de Renda (IR RRA)</td>
                                        <td className="p-2 text-right text-destructive">({formatCurrency(precatorio.irpf_valor || 0)})</td>
                                    </tr>
                                    <tr className="bg-muted font-bold">
                                        <td className="p-2">SALDO LÍQUIDO DO CREDOR</td>
                                        <td className="p-2 text-right text-primary">{formatCurrency(precatorio.saldo_liquido || 0)}</td>
                                    </tr>
                                    <tr className="bg-muted text-white font-bold text-lg">
                                        <td className="p-4">Proposta de aquisição (líquido a receber)</td>
                                        <td className="p-4 text-right">{formatCurrency(precatorio.proposta_maior_valor || precatorio.proposta_menor_valor || 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Texto de Objeto e Pagamento */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold bg-muted p-1 mb-2 uppercase border-l-4 border-border">3. Condições da Proposta</h3>
                        <div className="text-xs leading-relaxed text-muted-foreground text-justify space-y-2">
                            <p><strong>CLÁUSULA 1 - OBJETO:</strong> A presente proposta visa a cessão total e definitiva dos direitos creditórios oriundos do processo acima identificado, livres e desembaraçados de quaisquer ônus ou gravames.</p>
                            <p><strong>CLÁUSULA 2 - PAGAMENTO:</strong> O pagamento do valor da proposta de aquisição será realizado em parcela única, via transferência bancária, no ato da assinatura da Escritura Pública de Cessão de Direitos.</p>
                            <p><strong>CLÁUSULA 3 - VALIDADE:</strong> Esta proposta possui validade de 5 (cinco) dias úteis a contar da data de emissão, estando sujeita a nova análise de mercado após este prazo.</p>
                        </div>
                    </section>
                </div>

                {/* Assinaturas */}
                <div className="mt-20 grid grid-cols-2 gap-20">
                    <div className="text-center">
                        <div className="border-t border-border pt-2">
                            <p className="text-sm font-bold">APAX INVESTIMENTOS LTDA.</p>
                            <p className="text-xs text-muted-foreground">CNPJ: {empresa.cnpj}</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-border pt-2">
                            <p className="text-sm font-bold">ACEITE DO CREDOR</p>
                            <p className="text-xs text-muted-foreground">CPF/CNPJ: {precatorio.credor_cpf_cnpj || "__________"}</p>
                        </div>
                    </div>
                </div>

                {/* Rodapé Interno */}
                <div className="absolute bottom-10 left-[20mm] right-[20mm] border-t border-border pt-2 text-[10px] text-muted-foreground flex justify-between">
                    <p>Documento gerado pelo sistema CRM Apax em {dataEmissao}</p>
                    <p>Página 1 de 1</p>
                </div>
            </div>

            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            border: none;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
        </div>
    )
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value || 0)
}
