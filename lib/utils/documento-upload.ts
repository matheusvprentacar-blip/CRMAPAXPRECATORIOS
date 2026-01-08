"use client"

import { createBrowserClient } from "@/lib/supabase/client"
import type {
  DocumentoPrecatorio,
  UploadDocumentoData,
  TipoDocumento,
} from "@/lib/types/documento"
import {
  validarArquivo,
  gerarStoragePath,
  sanitizarNomeArquivo,
} from "@/lib/types/documento"

const BUCKET_NAME = "precatorios-documentos"

/**
 * Faz upload de um documento para o Supabase Storage
 * e registra os metadados no banco de dados
 */
export async function uploadDocumento(
  data: UploadDocumentoData
): Promise<{ success: boolean; documento?: DocumentoPrecatorio; error?: string }> {
  const supabase = createBrowserClient()
  if (!supabase) {
    return { success: false, error: "Cliente Supabase não disponível" }
  }

  try {
    // 1. Validar arquivo
    const validacao = validarArquivo(data.arquivo)
    if (!validacao.valido) {
      return { success: false, error: validacao.erro }
    }

    // 2. Gerar storage path
    const storagePath = gerarStoragePath(
      data.precatorio_id,
      data.tipo_documento,
      data.arquivo.name
    )

    // 3. Upload para o storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, data.arquivo, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("[uploadDocumento] Erro no upload:", uploadError)
      return { success: false, error: `Erro ao fazer upload: ${uploadError.message}` }
    }

    // 4. Obter URL pública (autenticada)
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    // 5. Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Usuário não autenticado" }
    }

    // 6. Registrar metadados no banco
    const { data: documento, error: dbError } = await supabase
      .from("documentos_precatorio")
      .insert({
        precatorio_id: data.precatorio_id,
        tipo_documento: data.tipo_documento,
        nome_arquivo: data.arquivo.name,
        tamanho_bytes: data.arquivo.size,
        mime_type: data.arquivo.type,
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        observacao: data.observacao,
        opcional: data.opcional ?? false,
        enviado_por: user.id, // ← IMPORTANTE: Sempre preencher!
      })
      .select(
        `
        *,
        enviado_por_nome:usuarios!enviado_por(nome),
        enviado_por_email:usuarios!enviado_por(email)
      `
      )
      .single()

    if (dbError) {
      console.error("[uploadDocumento] Erro ao salvar metadados:", dbError)
      // Tentar remover arquivo do storage
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return { success: false, error: `Erro ao salvar metadados: ${dbError.message}` }
    }

    return { success: true, documento: documento as any }
  } catch (error) {
    console.error("[uploadDocumento] Erro inesperado:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

/**
 * Lista todos os documentos de um precatório
 */
export async function listarDocumentos(
  precatorioId: string
): Promise<{ success: boolean; documentos?: DocumentoPrecatorio[]; error?: string }> {
  const supabase = createBrowserClient()
  if (!supabase) {
    return { success: false, error: "Cliente Supabase não disponível" }
  }

  try {
    const { data, error } = await supabase
      .from("documentos_precatorio_view")
      .select("*")
      .eq("precatorio_id", precatorioId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[listarDocumentos] Erro:", error)
      return { success: false, error: error.message }
    }

    return { success: true, documentos: data as any }
  } catch (error) {
    console.error("[listarDocumentos] Erro inesperado:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

/**
 * Faz download de um documento
 */
export async function downloadDocumento(
  storagePath: string,
  nomeArquivo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createBrowserClient()
  if (!supabase) {
    return { success: false, error: "Cliente Supabase não disponível" }
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(storagePath)

    if (error) {
      console.error("[downloadDocumento] Erro:", error)
      return { success: false, error: error.message }
    }

    // Criar URL temporária e iniciar download
    const url = URL.createObjectURL(data)
    const link = document.createElement("a")
    link.href = url
    link.download = nomeArquivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true }
  } catch (error) {
    console.error("[downloadDocumento] Erro inesperado:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

/**
 * Remove um documento (soft delete)
 */
export async function removerDocumento(
  documentoId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createBrowserClient()
  if (!supabase) {
    return { success: false, error: "Cliente Supabase não disponível" }
  }

  try {
    console.log("[removerDocumento] Iniciando remoção do documento:", documentoId)
    
    // Primeiro, buscar o documento para debug
    const { data: docAtual, error: fetchError } = await supabase
      .from("documentos_precatorio")
      .select("*")
      .eq("id", documentoId)
      .single()
    
    if (fetchError) {
      console.error("[removerDocumento] Erro ao buscar documento:", fetchError)
      return { success: false, error: `Erro ao buscar documento: ${fetchError.message}` }
    }
    
    console.log("[removerDocumento] Documento encontrado:", docAtual)
    
    // Soft delete no banco
    const { data, error } = await supabase
      .from("documentos_precatorio")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", documentoId)
      .select()

    console.log("[removerDocumento] Resultado do update:", { data, error })

    if (error) {
      // 🔧 LOG DEFENSIVO COMPLETO
      console.group("[removerDocumento] DEBUG COMPLETO DO ERRO");
      console.log("1. Erro bruto (RAW):", error);
      console.log("2. typeof error:", typeof error);
      console.log("3. instanceof Error:", error instanceof Error);
      console.log("4. Object.keys:", Object.keys(error));
      console.log("5. JSON.stringify:", JSON.stringify(error));
      console.log("6. Propriedades individuais:", {
        message: error?.message ?? "Sem message",
        details: error?.details ?? "Sem details",
        hint: error?.hint ?? "Sem hint",
        code: error?.code ?? "Sem code",
        name: error?.name ?? "Sem name",
      });
      console.groupEnd();
      
      return { success: false, error: error?.message || "Erro ao remover documento" }
    }

    // Nota: Não removemos do storage para manter histórico
    // Se necessário, pode ser feito manualmente pelo admin

    console.log("[removerDocumento] Documento removido com sucesso")
    return { success: true }
  } catch (error) {
    console.error("[removerDocumento] Erro inesperado:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

/**
 * Atualiza observação de um documento
 */
export async function atualizarObservacao(
  documentoId: string,
  observacao: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createBrowserClient()
  if (!supabase) {
    return { success: false, error: "Cliente Supabase não disponível" }
  }

  try {
    const { error } = await supabase
      .from("documentos_precatorio")
      .update({ observacao })
      .eq("id", documentoId)

    if (error) {
      console.error("[atualizarObservacao] Erro:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[atualizarObservacao] Erro inesperado:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

/**
 * Obtém URL autenticada para visualização de documento
 */
export async function getDocumentoUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = createBrowserClient()
  if (!supabase) {
    return { success: false, error: "Cliente Supabase não disponível" }
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      console.error("[getDocumentoUrl] Erro:", error)
      return { success: false, error: error.message }
    }

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error("[getDocumentoUrl] Erro inesperado:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

/**
 * Verifica se um tipo de documento já foi anexado
 */
export async function verificarDocumentoAnexado(
  precatorioId: string,
  tipoDocumento: TipoDocumento
): Promise<{ success: boolean; anexado?: boolean; quantidade?: number; error?: string }> {
  const supabase = createBrowserClient()
  if (!supabase) {
    return { success: false, error: "Cliente Supabase não disponível" }
  }

  try {
    const { data, error, count } = await supabase
      .from("documentos_precatorio")
      .select("id", { count: "exact" })
      .eq("precatorio_id", precatorioId)
      .eq("tipo_documento", tipoDocumento)
      .is("deleted_at", null)

    if (error) {
      console.error("[verificarDocumentoAnexado] Erro:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      anexado: (count ?? 0) > 0,
      quantidade: count ?? 0,
    }
  } catch (error) {
    console.error("[verificarDocumentoAnexado] Erro inesperado:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
