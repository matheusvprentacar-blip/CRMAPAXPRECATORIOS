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
    customTexts?: {
        objeto?: string
        pagamento?: string
        honorarios?: string
    }
    proposalConfig?: any // Configuração dinâmica de campos
}

// Mapeamento de chaves para valores e sinais (para cálculo de soma visível)
const FIELD_MAP: Record<string, { sign: number, getValue: (v: any) => number }> = {
    'credito_atualizado': { sign: 1, getValue: (v) => v.credito_atualizado },
    'honorarios': { sign: -1, getValue: (v) => v.honorarios },
    'adiantamento_recebido': { sign: -1, getValue: (v) => v.adiantamento_recebido },
    'previdencia': { sign: -1, getValue: (v) => v.previdencia },
    'ir_rra': { sign: -1, getValue: (v) => v.ir_rra },
    // Saldo líquido e Proposta são resultados, não entram na soma simples dos componentes acima geralmente, 
    // mas se o usuário quiser recalcular o "Saldo Disponível" based on visible lines, we sum the components.
    // O campo 'saldo_liquido_credor' is usually the result.
}

export async function antigravityPrint({ tipo, data, validacao, customTexts, proposalConfig }: PrintConfig) {
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
    // Se tiver config e for tipo Credor, usamos a lógica dinâmica
    const printData = buildPropostaData(data, customTexts, proposalConfig)
    printData.documento = {
        ...printData.documento,
        nome_arquivo: buildPropostaFilename(tipo, printData),
    }

    // 3. Carregar o template HTML
    let templatePath = "/print/template-proposta-credor-apax.html"; // Fallback

    if (tipo === "credor") {
        templatePath = "/print/template-proposta-dynamic.html"; // Usar sempre o dinâmico para credor agora (se não tiver config, usa default internas)
    } else {
        templatePath = "/print/template-proposta-honorarios-apax.html";
    }

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

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]+/g

function buildPropostaFilename(tipo: PrintConfig["tipo"], printData: any) {
    const nomeParte = tipo === "honorarios"
        ? (printData?.advogado?.nome || "Advogado")
        : (printData?.credor?.nome || "Credor")

    const base = tipo === "honorarios"
        ? "Proposta de Aquisição de Honorários"
        : "Proposta de Aquisição de Crédito"

    const rawTitle = `${base} - ${nomeParte}`

    return String(rawTitle)
        .replace(INVALID_FILENAME_CHARS, "-")
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * Normaliza os dados do precatório para o esquema esperado pelos templates (data-k)
 */
function buildPropostaData(p: any, customTexts?: any, config?: any) {
    const valoresRaw = {
        credito_atualizado: p.valor_atualizado || 0,
        honorarios: p.honorarios_valor || 0,
        proposta_advogado: p.proposta_advogado_valor || 0,
        adiantamento_recebido: p.adiantamento_valor || 0,
        ir_rra: p.irpf_valor || 0,
        previdencia: p.pss_valor || 0,
        saldo_liquido_credor: p.saldo_liquido || 0,
        proposta_credor: p.proposta_maior_valor || p.proposta_menor_valor || 0
    };

    // Construção das linhas dinâmicas (Rows)
    let rows: any[] = [];

    // Configuração Default se não houver
    const itemsConfig = config?.items || [
        { key: 'credito_atualizado', label: 'Crédito Principal Atualizado (Bruto)', visible: true, showValue: true },
        { key: 'honorarios', label: 'Honorários Contratuais Advogado (-)', visible: true, showValue: true },
        { key: 'adiantamento_recebido', label: 'Adiantamentos já recebidos (-)', visible: true, showValue: true },
        { key: 'previdencia', label: 'Previdência Oficial / PSS (-)', visible: true, showValue: true },
        { key: 'ir_rra', label: 'Imposto de Renda / IR RRA (-)', visible: true, showValue: true },
        { key: 'saldo_liquido_credor', label: 'SALDO LÍQUIDO DISPONÍVEL AO CREDOR', visible: true, showValue: true, isTotal: true },
        { key: 'proposta_credor', label: 'PROPOSTA DE COMPRA DE CRÉDITO', visible: true, showValue: true, isTotal: true }
    ];

    const totalMode = config?.totalMode || 'internal';
    let calculatedTotal = 0;

    // Se modo for soma visível, iteramos para somar primeiro
    if (totalMode === 'sum_visible') {
        itemsConfig.forEach((item: any) => {
            if (item.visible && !item.isTotal && FIELD_MAP[item.key]) {
                const def = FIELD_MAP[item.key];
                const val = def.getValue(valoresRaw);
                calculatedTotal += (val * def.sign);
            }
        });
    }

    rows = itemsConfig.map((item: any) => {
        let val = 0;
        // Se for campo conhecido mapeado
        if (FIELD_MAP[item.key]) {
            val = FIELD_MAP[item.key].getValue(valoresRaw);
        }
        // Se for Totais explícitos
        else if (item.key === 'saldo_liquido_credor') {
            val = totalMode === 'sum_visible' ? calculatedTotal : valoresRaw.saldo_liquido_credor;
        }
        else if (item.key === 'proposta_credor') {
            // Proposta quase sempre é valor fixo negociado, não soma de componentes (exceto se definido diferente)
            // Mantemos valor original da proposta, a menos que haja regra diferente
            val = valoresRaw.proposta_credor;
        }

        return {
            ...item,
            value: val,
            valueFormatted: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
        };
    });

    // Filtrar apenas linhas visíveis
    rows = rows.filter((r: any) => r.visible);

    return {
        empresa: {
            cnpj: "09.121.790/0001-38",
            endereco: "Rua Horeslau Savinski, 443, Jardim Apucarana, CEP 86809-070",
            representante_nome: "Representante Legal Apax"
        },
        documento: {
            codigo_interno: p.documento_codigo_interno || `APX-${p.id?.slice(0, 8).toUpperCase()}`,
            data_emissao: new Date().toLocaleDateString("pt-BR"),
            versao: "1.0",
            gerado_por: "Sistema CRM Apax",
            observacoes: "Este documento é uma proposta comercial sujeita a análise definitiva."
        },
        titulo_documento: p.titulo_documento,
        labels: {
            credor: p.credor_label || "Credor"
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
        valores: valoresRaw, // Mantemos bruto caso template legacy ainda use
        rows: rows, // Novo array dinâmico
        textos: {
            objeto: customTexts?.objeto || "A presente proposta visa a cessão total e definitiva dos direitos creditórios oriundos do processo judicial acima identificado.",
            pagamento: customTexts?.pagamento || "O pagamento será realizado em parcela única via transferência bancária no ato da assinatura.",
            honorarios: customTexts?.honorarios || "Validade de 05 dias úteis, sujeita a análise superveniente."
        }
    }
}
