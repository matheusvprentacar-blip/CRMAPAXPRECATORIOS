import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Force Node.js runtime for file system APIs
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let extractedText = "";

        // Determine file type and extract text/data
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            extractedText = await parsePdf(buffer);
        } else if (
            file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls")
        ) {
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            extractedText = XLSX.utils.sheet_to_csv(sheet);
        } else {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
        }

        // Check for extraction method preference
        const method = formData.get("method") as string; // 'ai' | 'regex'

        // Check for API Key
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

        // Skip AI if explicit regex requested or no key
        if (!apiKey || method === 'regex') {
            if (!apiKey && method === 'ai') {
                console.warn("AI requested but API Key missing, falling back to Regex");
            }
            const legacyData = extractFieldsRegex(extractedText);
            return NextResponse.json(legacyData);
        }

        // AI Extraction
        try {
            const genAI = new GoogleGenerativeAI(apiKey);

            // Define model fallback chain - extensively trying valid models
            const modelsToTry = [
                "gemini-1.5-flash",
                "gemini-1.5-flash-latest",
                "gemini-1.5-pro",
                "gemini-pro-latest",
                "gemini-flash-latest", // User suggestion match
                "gemini-2.0-flash-exp",
                "gemini-1.0-pro",
                "gemini-pro"
            ];
            let aiResultText = "";
            let usedModel = "";
            let lastError;

            // Try models in sequence
            for (const modelName of modelsToTry) {
                try {
                    // console.log(`Attempting AI extraction with model: ${modelName}`);
                    const model = genAI.getGenerativeModel({ model: modelName });

                    const prompt = `
                    Você é um assistente jurídico especializado em precatórios. Analise o texto extraído de um ofício requisitório e retorne um JSON com os dados.
                    
                    TEXTO DO DOCUMENTO:
                    """
                    ${extractedText.substring(0, 30000)}
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
                    break; // Success!
                } catch (e) {
                    // console.warn(`Model ${modelName} failed:`, e);
                    lastError = e;
                    continue; // Try next model
                }
            }

            if (!aiResultText) {
                throw lastError || new Error("All AI models failed");
            }

            // Clean markdown if present
            const jsonStr = aiResultText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
            try {
                const aiData = JSON.parse(jsonStr);
                // Append info about used model
                aiData.raw_text = `[AI Success using ${usedModel}]\n` + extractedText.substring(0, 1000);
                return NextResponse.json(aiData);
            } catch (e) {
                console.error("Failed to parse AI JSON:", aiResultText);
                throw new Error("Invalid JSON from AI");
            }

        } catch (aiError: any) {
            console.error("AI Extraction failed:", aiError);

            const legacyData = extractFieldsRegex(extractedText);

            // Construct a helpful status report
            const foundFields = [];
            if (legacyData.credor_nome) foundFields.push("Credor");
            if (legacyData.valor_principal) foundFields.push("Valor");
            if (legacyData.numero_precatorio) foundFields.push("Processo");

            const successMsg = foundFields.length > 0
                ? `✅ SUCESSO PARCIAL: Sistema usou OCR Padrão e encontrou: ${foundFields.join(", ")}.`
                : "⚠️ FALHA: Sistema não conseguiu ler os dados automaticamente.";

            legacyData.raw_text = `${successMsg}\n\n` +
                `❌ AI ERROR (Google Gemini): ${aiError?.message || JSON.stringify(aiError)}\n` +
                `Hint: Verifique a API Key no .env.local\n` +
                `----------------------------------------\n` + legacyData.raw_text;

            return NextResponse.json(legacyData);
        }

    } catch (error) {
        console.error("Extraction error:", error);
        return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
    }
}

function parsePdf(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);

        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            const rawText = pdfParser.getRawTextContent();
            resolve(rawText);
        });

        pdfParser.parseBuffer(buffer);
    });
}

function extractFieldsRegex(text: string) {
    // Line-by-line parsing strategy (More robust for structured documents)
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    let credor_nome: string | undefined;
    let valor_principal: number | undefined;
    let numero_precatorio: string | undefined;
    let tribunal: string | undefined;

    for (const line of lines) {
        // Credor / Requerente
        // Match "Requerente : ADRIANA..." or "Credor: JOAO..."
        if (!credor_nome) {
            const credorMatch = line.match(/^(?:REQUERENTE|CREDOR|EXEQUENTE|BENEFICIÁRIO|NOME DO CREDOR)\s*[:.-]\s*(.+)/i);
            if (credorMatch && credorMatch[1]) {
                // Ensure we don't capture noise. If the value is too short, ignore.
                // Also stop capturing if we hit another label in the same line (rare but possible)
                const candidate = credorMatch[1].trim();
                if (candidate.length > 3 && !candidate.match(/^(DA|DO|DE)$/i)) {
                    credor_nome = candidate.split(/\s+-\s+| CPF| CNPJ| ADVOGADO| OAB/i)[0].trim();
                }
            }
        }

        // Processo
        if (!numero_precatorio) {
            // Priority to "PROCESSO :" lines
            const procMatch = line.match(/^(?:PROCESSO|OFÍCIO|ORIGINÁRIO|PRECATORIO)\s*[:.-]\s*([\d.-]{15,30}|[\d\/-]+)/i);
            if (procMatch && procMatch[1]) {
                numero_precatorio = procMatch[1].trim();
            }
        }

        // Valor
        if (!valor_principal) {
            const valorMatch = line.match(/(?:VALOR|PRINCIPAL|VALOR DA CAUSA|VALOR TOTAL|VALOR REQUISITADO)\s*[:.-]\s*(?:R\$)?\s*((?:\d{1,3}(?:\.|,)\d{3})*(?:[.,]\d{2}))/i);
            if (valorMatch && valorMatch[1]) {
                // Check if it's not a date (01/10/2025) which regex might confuse if dots used
                if (!valorMatch[1].includes("/")) {
                    const cleanValor = valorMatch[1].replace(/\./g, "").replace(",", ".");
                    valor_principal = parseFloat(cleanValor);
                }
            }
        }

        // Tribunal
        if (!tribunal) {
            const tribunalMatch = line.match(/(TJSP|TJ[A-Z]{2}|TRF\d|Tribunal de Justiça)/i);
            if (tribunalMatch) {
                tribunal = tribunalMatch[1];
            }
        }
    }

    return {
        credor_nome,
        valor_principal,
        numero_precatorio,
        tribunal,
        raw_text: text.substring(0, 1000)
    };
}
