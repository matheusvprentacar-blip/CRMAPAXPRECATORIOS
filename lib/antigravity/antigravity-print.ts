"use client"

/**
 * Motor de Impressão Antigravity - Apax Investimentos
 * Gerencia a normalização de dados, validação de status e abertura de templates.
 */

interface PrintConfig {
    tipo: "credor" | "honorarios"
    data: any
    validacao: {
        calculo_ok?: boolean
        juridico_ok?: boolean
        comercial_ok?: boolean
        admin_ok?: boolean
    }
}

export async function antigravityPrint({ tipo, data, validacao }: PrintConfig) {
    // 1. Validar se está aprovado por todos
    const aprovado =
        validacao.calculo_ok &&
        validacao.juridico_ok &&
        validacao.comercial_ok &&
        validacao.admin_ok

    if (!aprovado) {
        throw new Error("Geração bloqueada: O precatório precisa ser validado por todos os departamentos (Cálculo, Jurídico, Comercial e Admin) antes da impressão.")
    }

    // 2. Normalizar e preparar o objeto para o template (data-k)
    const printData = buildPropostaData(data)

    // 3. Carregar o template HTML
    const templatePath = tipo === "credor"
        ? "/print/template-proposta-credor-apax.html"
        : "/print/template-proposta-honorarios-apax.html"

    try {
        const response = await fetch(templatePath, { cache: "no-store" })
        if (!response.ok) throw new Error("Não foi possível carregar o template de impressão.")

        const html = await response.text()

        // 4. Criação do Iframe oculta para impressão (Bypass Popup Blockers)
        const iframeId = "print-frame-antigravity"
        let iframe = document.getElementById(iframeId) as HTMLIFrameElement

        if (!iframe) {
            iframe = document.createElement("iframe")
            iframe.id = iframeId
            // Estilo para esconder visualmente mas manter renderizável
            iframe.style.position = "fixed"
            iframe.style.left = "-9999px"
            iframe.style.top = "0px"
            iframe.style.width = "210mm" // A4 width
            iframe.style.height = "297mm" // A4 height
            iframe.style.border = "none"
            document.body.appendChild(iframe)
        }

        const doc = iframe.contentWindow?.document
        if (!doc) throw new Error("Não foi possível acessar o contexto de impressão.")

        doc.open()
        doc.write(html)
        doc.close()

        // 5. Chamar o renderizador e imprimir
        const triggerPrint = () => {
            if ((iframe.contentWindow as any).render) {
                (iframe.contentWindow as any).render(printData)
            }
            // Pequeno delay para garantir renderização de imagens/fontes
            setTimeout(() => {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()

                // Opcional: Remover iframe depois?
                // document.body.removeChild(iframe) 
                // Melhor manter para reuso ou limpar no próximo
            }, 500)
        }

        if (iframe.contentWindow) {
            iframe.contentWindow.onload = triggerPrint
        } else {
            // Fallback imediato
            triggerPrint()
        }

    } catch (error: any) {
        console.error("[AntigravityPrint] Erro:", error)
        throw error
    }
}

/**
 * Normaliza os dados do precatório para o esquema esperado pelos templates (data-k)
 */
function buildPropostaData(p: any) {
    return {
        empresa: {
            cnpj: "09.121.790/0001-38",
            endereco: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
            representante_nome: "Representante Legal Apax"
        },
        documento: {
            codigo_interno: p.documento_codigo_interno || `APX-${p.id?.slice(0, 8).toUpperCase()}`,
            data_emissao: new Date().toLocaleDateString("pt-BR"),
            versao: "1.0",
            gerado_por: "Sistema CRM Apax",
            observacoes: "Este documento é uma proposta comercial sujeita a análise definitiva."
        },
        credor: {
            nome: p.credor_nome || "NOME NÃO INFORMADO",
            cpf_cnpj: p.credor_cpf_cnpj || "N/A"
        },
        advogado: {
            nome: p.advogado_nome || "ADVOGADO NÃO INFORMADO",
            cpf_cnpj: p.advogado_cpf_cnpj || "N/A"
        },
        processo: {
            numero: p.numero_processo || "N/A"
        },
        precatorio: {
            numero: p.numero_precatorio || "N/A",
            oficio: p.numero_oficio || "N/A"
        },
        valores: {
            credito_atualizado: p.valor_atualizado || 0,
            honorarios: p.honorarios_valor || 0,
            proposta_advogado: p.proposta_advogado_valor || 0, // Fallback se o campo não existir no objeto
            adiantamento_recebido: p.adiantamento_valor || 0,
            ir_rra: p.irpf_valor || 0,
            previdencia: p.pss_valor || 0,
            saldo_liquido_credor: p.saldo_liquido || 0,
            proposta_credor: p.proposta_maior_valor || p.proposta_menor_valor || 0
        },
        textos: {
            objeto: "A presente proposta visa a cessão total e definitiva dos direitos creditórios oriundos do processo judicial acima identificado.",
            pagamento: "O pagamento será realizado em parcela única via transferência bancária no ato da assinatura.",
            honorarios: "Validade de 05 dias úteis, sujeita a análise superveniente."
        }
    }
}
