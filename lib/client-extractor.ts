
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as XLSX from "xlsx";
import { extrairDadosDeTexto } from "@/lib/extrair-dados";
import { toast } from "sonner";

// NOTE: We do NOT import pdfjs-dist directly here to avoid Webpack/Next.js 15 build errors.
// We load it via script tag injection from public/pdf.min.mjs
const PDFJS_SCRIPT_SRC = "/pdf.min.mjs";
const PDFJS_WORKER_SRC = "/pdf.worker.mjs";

export interface ExtractedData {
    credor_nome?: string;
    valor_principal?: number;
    numero_precatorio?: string;
    tribunal?: string;
    credor_cpf_cnpj?: string;
    numero_processo?: string;
    natureza?: string;
    raw_text?: string;
}

// Helper to lazy load PDF.js from public folder
async function getPdfJs() {
    if (typeof window === "undefined") return null;

    // @ts-ignore
    if (window.pdfjsLib) return window.pdfjsLib;

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = PDFJS_SCRIPT_SRC;
        script.type = "module"; // Important for .mjs
        script.onload = () => {
            // @ts-ignore
            const lib = window.pdfjsLib;
            if (lib) {
                lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
                resolve(lib);
            } else {
                reject(new Error("PDF.js loaded but window.pdfjsLib is undefined"));
            }
        };
        script.onerror = () => reject(new Error("Failed to load PDF.js script"));
        document.head.appendChild(script);
    });
}

export async function extractTextFromPDF(file: File): Promise<string> {
    const pdfjsLib = await getPdfJs();
    if (!pdfjsLib) {
        throw new Error("PDF.js not available (server-side?)");
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
        fullText += pageText + "\n";
    }
    return fullText;
}

export async function extractTextFromExcel(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(sheet);
}

export async function processFileWithAI(file: File, method: 'ai' | 'regex' = 'ai'): Promise<ExtractedData> {
    let text = "";
    try {
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            text = await extractTextFromPDF(file);
        } else if (
            file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls")
        ) {
            text = await extractTextFromExcel(file);
        } else {
            throw new Error("Tipo de arquivo não suportado.");
        }
    } catch (err) {
        console.error("Error determining file type or extracting initial text:", err);
        throw new Error("Falha ao ler o arquivo. Verifique se é um PDF ou Excel válido.");
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY;

    if (method === 'regex' || !apiKey) {
        if (method === 'ai' && !apiKey) {
            console.warn("AI requested but API Key missing, falling back to Regex");
        }
        return mapRegexData(text);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsToTry = [
            // "gemini-1.5-flash" tem a maior cota no plano gratuito (~1500 req/dia vs ~50 nos novos)
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
        ];

        let aiResultText = "";
        let usedModel = "";
        let lastError;

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Trying AI model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const prompt = `
          Você é um assistente jurídico especializado em precatórios. Analise o texto extraído de um ofício requisitório e retorne um JSON com os dados.
          
          TEXTO DO DOCUMENTO:
          """
          ${text.substring(0, 30000)}
          """

          INSTRUÇÕES:
          1. Extraia o NOME DO CREDOR (Beneficiário/Exequente/Requerente).
          2. Extraia o VALOR PRINCIPAL (valor de face, valor da causa ou valor requisitado). Converta para número (ponto flutuante).
          3. Extraia o NÚMERO DO PRECATÓRIO (Processo/Ofício).
          4. Identifique o TRIBUNAL (TJSP, TRF1, TRF3, etc).
          5. Extraia o CPF/CNPJ do CREDOR.
          6. Extraia o NÚMERO DO PROCESSO ORIGINÁRIO (procure por "Origem", "Processo Originário", "Autos nº").
          7. Identifique a NATUREZA (Alimentar ou Comum).
          
          FORMATO JSON ESPERADO:
          {
              "credor_nome": "string",
              "valor_principal": number,
              "numero_precatorio": "string",
              "tribunal": "string",
              "credor_cpf_cnpj": "string",
              "numero_processo": "string",
              "natureza": "Alimentar | Comum"
          }
          Retorne APENAS o JSON, sem markdown.
        `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                aiResultText = response.text();
                usedModel = modelName;
                break;
            } catch (e) {
                console.warn(`⚠️ Model ${modelName} failed:`, e);
                lastError = e;
                continue;
            }
        }

        if (!aiResultText) {
            throw lastError || new Error("All AI models failed");
        }

        const jsonStr = aiResultText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        try {
            const aiData = JSON.parse(jsonStr);
            aiData.raw_text = `[AI Success using ${usedModel}]\n` + text.substring(0, 1000);
            return aiData;
        } catch (e) {
            console.error("Failed to parse AI JSON:", aiResultText);
            throw new Error("Invalid JSON from AI");
        }

    } catch (error: any) {
        console.error("AI Extraction failed:", error);

        // Handle Rate Limit specifically
        if (error.message?.includes("429") || error.status === 429) {
            const regexData = mapRegexData(text);
            regexData.raw_text = `⚠️ LIMITE DE IA ATINGIDO (429). Tente novamente em 1 minuto.\nDados extraídos via Regex (Básico):\n${regexData.raw_text}`;
            // Return regex data instead of failing completely, so user can at least edit
            toast.error("Limite de IA do Google (Cota Gratuita) atingido. Usando extração básica.");
            return regexData;
        }

        const regexData = mapRegexData(text);
        regexData.raw_text = `⚠️ AI FAIL: ${error instanceof Error ? error.message : String(error)}\n${regexData.raw_text}`;
        return regexData;
    }
}

function mapRegexData(text: string): ExtractedData {
    try {
        const data = extrairDadosDeTexto(text);
        return {
            credor_nome: data.autor_credor_originario,
            credor_cpf_cnpj: data.cpf_cnpj,
            valor_principal: data.valor_principal_original,
            numero_precatorio: data.numero_precatorio,
            tribunal: data.tribunal,
            numero_processo: data.numero_processo,
            natureza: data.natureza_ativo,
            raw_text: text.substring(0, 1000),
        };
    } catch (e) {
        console.error("Regex map error", e);
        return {
            raw_text: text.substring(0, 1000),
        };
    }
}
