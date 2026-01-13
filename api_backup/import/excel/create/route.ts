import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizarCPFCNPJ, normalizarData, normalizarValor, validarCPF, validarCNPJ } from '@/lib/utils/normalizacao'

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

    // Obter dados do body
    const { precatorios } = await request.json()
    
    if (!precatorios || !Array.isArray(precatorios) || precatorios.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum precatório fornecido' },
        { status: 400 }
      )
    }

    // Resultados
    const resultados = {
      total: precatorios.length,
      criados: 0,
      erros: 0,
      detalhes: [] as any[],
    }

    // Processar cada precatório
    for (let i = 0; i < precatorios.length; i++) {
      const precatorio = precatorios[i]
      
      try {
        // Validar campos obrigatórios
        if (!precatorio.credor_nome) {
          throw new Error('Nome do credor é obrigatório')
        }
        
        if (!precatorio.credor_cpf_cnpj) {
          throw new Error('CPF/CNPJ do credor é obrigatório')
        }
        
        if (!precatorio.valor_principal) {
          throw new Error('Valor principal é obrigatório')
        }

        // Normalizar dados
        const dadosNormalizados: any = {
          // Campos obrigatórios
          credor_nome: precatorio.credor_nome.trim(),
          credor_cpf_cnpj: normalizarCPFCNPJ(precatorio.credor_cpf_cnpj),
          valor_principal: parseFloat(normalizarValor(String(precatorio.valor_principal))),
          
          // Criado por
          created_by: user.id,
          responsavel: user.id, // Operador que importou é o responsável inicial
          
          // Status inicial
          status: 'novo',
        }

        // Validar CPF/CNPJ
        const cpfCnpj = dadosNormalizados.credor_cpf_cnpj
        if (cpfCnpj.length === 11) {
          if (!validarCPF(cpfCnpj)) {
            throw new Error('CPF inválido')
          }
        } else if (cpfCnpj.length === 14) {
          if (!validarCNPJ(cpfCnpj)) {
            throw new Error('CNPJ inválido')
          }
        } else {
          throw new Error('CPF/CNPJ com tamanho inválido')
        }

        // Validar valor
        if (isNaN(dadosNormalizados.valor_principal) || dadosNormalizados.valor_principal <= 0) {
          throw new Error('Valor principal inválido')
        }

        // Campos opcionais
        if (precatorio.numero_precatorio) {
          dadosNormalizados.numero_precatorio = precatorio.numero_precatorio.trim()
        }
        
        if (precatorio.numero_processo) {
          dadosNormalizados.numero_processo = precatorio.numero_processo.trim()
        }
        
        if (precatorio.tribunal) {
          dadosNormalizados.tribunal = precatorio.tribunal.trim()
        }
        
        if (precatorio.devedor) {
          dadosNormalizados.devedor = precatorio.devedor.trim()
        }
        
        if (precatorio.credor_profissao) {
          dadosNormalizados.credor_profissao = precatorio.credor_profissao.trim()
        }
        
        if (precatorio.credor_estado_civil) {
          dadosNormalizados.credor_estado_civil = precatorio.credor_estado_civil.trim()
        }
        
        if (precatorio.credor_data_nascimento) {
          const dataNormalizada = normalizarData(precatorio.credor_data_nascimento)
          if (dataNormalizada) {
            dadosNormalizados.credor_data_nascimento = dataNormalizada
          }
        }
        
        if (precatorio.conjuge_nome) {
          dadosNormalizados.conjuge_nome = precatorio.conjuge_nome.trim()
        }
        
        if (precatorio.conjuge_cpf_cnpj) {
          dadosNormalizados.conjuge_cpf_cnpj = normalizarCPFCNPJ(precatorio.conjuge_cpf_cnpj)
        }
        
        if (precatorio.advogado_nome) {
          dadosNormalizados.advogado_nome = precatorio.advogado_nome.trim()
        }
        
        if (precatorio.advogado_cpf_cnpj) {
          dadosNormalizados.advogado_cpf_cnpj = normalizarCPFCNPJ(precatorio.advogado_cpf_cnpj)
        }
        
        if (precatorio.advogado_oab) {
          dadosNormalizados.advogado_oab = precatorio.advogado_oab.trim()
        }
        
        if (precatorio.valor_juros) {
          dadosNormalizados.valor_juros = parseFloat(normalizarValor(String(precatorio.valor_juros)))
        }
        
        if (precatorio.valor_atualizado) {
          dadosNormalizados.valor_atualizado = parseFloat(normalizarValor(String(precatorio.valor_atualizado)))
        }
        
        if (precatorio.data_base) {
          const dataNormalizada = normalizarData(precatorio.data_base)
          if (dataNormalizada) {
            dadosNormalizados.data_base = dataNormalizada
          }
        }
        
        if (precatorio.data_expedicao) {
          const dataNormalizada = normalizarData(precatorio.data_expedicao)
          if (dataNormalizada) {
            dadosNormalizados.data_expedicao = dataNormalizada
          }
        }
        
        if (precatorio.banco) {
          dadosNormalizados.banco = precatorio.banco.trim()
        }
        
        if (precatorio.agencia) {
          dadosNormalizados.agencia = precatorio.agencia.trim()
        }
        
        if (precatorio.conta) {
          dadosNormalizados.conta = precatorio.conta.trim()
        }
        
        if (precatorio.tipo_conta) {
          dadosNormalizados.tipo_conta = precatorio.tipo_conta.trim()
        }
        
        if (precatorio.endereco_completo) {
          dadosNormalizados.endereco_completo = precatorio.endereco_completo.trim()
        }
        
        if (precatorio.cep) {
          dadosNormalizados.cep = precatorio.cep.replace(/\D/g, '')
        }
        
        if (precatorio.cidade) {
          dadosNormalizados.cidade = precatorio.cidade.trim()
        }
        
        if (precatorio.estado) {
          dadosNormalizados.estado = precatorio.estado.trim().toUpperCase()
        }

        // Inserir no banco
        const { data: precatorioCriado, error: insertError } = await supabase
          .from('precatorios')
          .insert(dadosNormalizados)
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        // Sucesso
        resultados.criados++
        resultados.detalhes.push({
          index: i,
          sucesso: true,
          precatorio_id: precatorioCriado.id,
          credor_nome: dadosNormalizados.credor_nome,
        })

      } catch (error) {
        // Erro
        resultados.erros++
        resultados.detalhes.push({
          index: i,
          sucesso: false,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
          credor_nome: precatorio.credor_nome || 'Não informado',
        })
      }
    }

    return NextResponse.json({
      success: true,
      resultados,
    })

  } catch (error) {
    console.error('[Import Excel Create] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao criar precatórios' },
      { status: 500 }
    )
  }
}
