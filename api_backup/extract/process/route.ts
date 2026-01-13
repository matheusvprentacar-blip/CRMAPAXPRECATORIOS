import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { extractFromText, extractFromImage } from '@/lib/utils/gemini-client'
import { pdfToBase64 } from '@/lib/utils/pdf-extractor'
import type { ExtractionResult, FieldExtraction } from '@/lib/types/extracao'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      )
    }
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Obter precatorio_id do body
    const { precatorio_id } = await request.json()
    
    if (!precatorio_id) {
      return NextResponse.json(
        { error: 'precatorio_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar documentos não processados
    const { data: documentos, error: docsError } = await supabase
      .rpc('get_documentos_nao_processados', { p_precatorio_id: precatorio_id })
    
    if (docsError) {
      console.error('[Extract] Erro ao buscar documentos:', docsError)
      return NextResponse.json(
        { error: 'Erro ao buscar documentos' },
        { status: 500 }
      )
    }

    if (!documentos || documentos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum documento para processar' },
        { status: 404 }
      )
    }

    // Criar registro de extração
    const { data: extracao, error: extracaoError } = await supabase
      .from('precatorio_extracoes')
      .insert({
        precatorio_id,
        status: 'processando',
        created_by: user.id,
        documentos_ids: documentos.map((d: any) => d.id),
        total_documentos: documentos.length,
      })
      .select()
      .single()

    if (extracaoError) {
      console.error('[Extract] Erro ao criar extração:', extracaoError)
      return NextResponse.json(
        { error: 'Erro ao criar extração' },
        { status: 500 }
      )
    }

    // Processar documentos em background (não bloquear resposta)
    processDocuments(extracao.id, precatorio_id, documentos, user.id)
      .catch(error => {
        console.error('[Extract] Erro no processamento:', error)
      })

    return NextResponse.json({
      success: true,
      extracao_id: extracao.id,
      total_documentos: documentos.length,
      message: 'Processamento iniciado',
    })

  } catch (error) {
    console.error('[Extract] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para processar documentos
async function processDocuments(
  extracaoId: string,
  precatorioId: string,
  documentos: any[],
  userId: string
) {
  const supabase = await createServerSupabaseClient()
  
  if (!supabase) {
    console.error('[Extract] Supabase não configurado')
    return
  }
  
  try {
    // Combinar texto de todos os documentos
    let textoCompleto = ''
    const documentosProcessados: string[] = []
    
    for (const doc of documentos) {
      try {
        // Por enquanto, usar Gemini Vision para PDFs
        // TODO: Implementar extração de texto real
        
        if (doc.mime_type === 'application/pdf') {
          // Baixar PDF do storage
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('precatorios-documentos')
            .download(doc.storage_path)
          
          if (downloadError) {
            console.error(`[Extract] Erro ao baixar ${doc.storage_path}:`, downloadError)
            continue
          }

          // Converter para base64
          const buffer = Buffer.from(await fileData.arrayBuffer())
          const base64 = pdfToBase64(buffer)
          
          // Extrair com Gemini Vision
          const result = await extractFromImage(
            base64,
            doc.mime_type,
            doc.tipo_documento || 'documento'
          )
          
          // Adicionar ao texto completo (simulado)
          textoCompleto += `\n\n=== ${doc.tipo_documento} ===\n`
          textoCompleto += JSON.stringify(result.campos)
          
        } else if (doc.mime_type.startsWith('image/')) {
          // Processar imagem
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('precatorios-documentos')
            .download(doc.storage_path)
          
          if (downloadError) {
            console.error(`[Extract] Erro ao baixar ${doc.storage_path}:`, downloadError)
            continue
          }

          const buffer = Buffer.from(await fileData.arrayBuffer())
          const base64 = pdfToBase64(buffer)
          
          const result = await extractFromImage(
            base64,
            doc.mime_type,
            doc.tipo_documento || 'documento'
          )
          
          textoCompleto += `\n\n=== ${doc.tipo_documento} ===\n`
          textoCompleto += JSON.stringify(result.campos)
        }
        
        documentosProcessados.push(doc.id)
        
      } catch (docError) {
        console.error(`[Extract] Erro ao processar documento ${doc.id}:`, docError)
      }
    }

    // Extrair dados com Gemini
    const resultado = await extractFromText(
      textoCompleto,
      'Documentos do Precatório'
    )

    // Salvar campos extraídos
    const camposParaInserir = Object.entries(resultado.campos).map(([nome, campo]) => ({
      extracao_id: extracaoId,
      campo_nome: nome,
      campo_label: formatarLabel(nome),
      campo_valor: campo.valor,
      campo_tipo: campo.tipo,
      valor_normalizado: null,
      confianca: campo.confianca,
      fonte_documento_id: campo.fonte?.documento_id || null,
      fonte_documento_nome: campo.fonte?.documento_nome || null,
      fonte_pagina: campo.fonte?.pagina || null,
      fonte_snippet: campo.fonte?.snippet || null,
    }))

    if (camposParaInserir.length > 0) {
      const { error: camposError } = await supabase
        .from('precatorio_extracao_campos')
        .insert(camposParaInserir)

      if (camposError) {
        throw camposError
      }
    }

    // Atualizar extração
    const { error: updateError } = await supabase
      .from('precatorio_extracoes')
      .update({
        status: 'concluido',
        result_json: resultado,
        total_campos: camposParaInserir.length,
        campos_alta_confianca: camposParaInserir.filter(c => c.confianca >= 80).length,
        campos_baixa_confianca: camposParaInserir.filter(c => c.confianca < 50).length,
        checklist_json: resultado.checklist,
      })
      .eq('id', extracaoId)

    if (updateError) {
      throw updateError
    }

    // Marcar documentos como processados
    await supabase.rpc('marcar_documentos_processados', {
      p_documento_ids: documentosProcessados,
      p_sucesso: true,
    })

  } catch (error) {
    console.error('[Extract] Erro no processamento:', error)
    
    // Atualizar extração com erro
    await supabase
      .from('precatorio_extracoes')
      .update({
        status: 'erro',
        erro_mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
        erro_detalhes: { error: String(error) },
      })
      .eq('id', extracaoId)
  }
}

// Formatar nome do campo para label
function formatarLabel(nome: string): string {
  return nome
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
