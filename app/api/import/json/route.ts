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
    const body = await request.json()
    const { precatorios, action } = body
    
    if (!precatorios || !Array.isArray(precatorios) || precatorios.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum precatório fornecido' },
        { status: 400 }
      )
    }

    // Se action = 'preview', apenas valida e retorna
    if (action === 'preview') {
      const preview = precatorios.map((p, index) => {
        const avisos: string[] = []
        let temErro = false
        
        // Validar apenas nome (único obrigatório)
        if (!p.credor_nome || !p.credor_nome.trim()) {
          temErro = true
          avisos.push('Nome do credor é obrigatório')
        }
        
        // Avisos para campos importantes mas não obrigatórios
        if (!p.credor_cpf_cnpj) {
          avisos.push('CPF/CNPJ não informado (pode completar depois)')
        } else {
          // Validar CPF/CNPJ se fornecido
          const cpfCnpj = normalizarCPFCNPJ(p.credor_cpf_cnpj)
          if (cpfCnpj.length === 11 && !validarCPF(cpfCnpj)) {
            temErro = true
            avisos.push('CPF inválido')
          } else if (cpfCnpj.length === 14 && !validarCNPJ(cpfCnpj)) {
            temErro = true
            avisos.push('CNPJ inválido')
          } else if (cpfCnpj.length > 0 && cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
            avisos.push('CPF/CNPJ com formato inválido (será salvo para correção)')
          }
        }
        
        if (!p.valor_principal || p.valor_principal <= 0) {
          avisos.push('Valor principal não informado (pode completar depois)')
        }
        
        if (!p.numero_processo) {
          avisos.push('Número do processo não informado')
        }
        
        return {
          index,
          dados: p,
          avisos,
          valido: !temErro
        }
      })
      
      const totalValidos = preview.filter(p => p.valido).length
      const totalInvalidos = preview.length - totalValidos
      
      return NextResponse.json({
        success: true,
        action: 'preview',
        total: precatorios.length,
        validos: totalValidos,
        invalidos: totalInvalidos,
        preview
      })
    }

    // Se action = 'create', cria os precatórios
    if (action === 'create') {
      const resultados = {
        total: precatorios.length,
        criados: 0,
        erros: 0,
        detalhes: [] as any[],
      }

      for (let i = 0; i < precatorios.length; i++) {
        const precatorio = precatorios[i]
        let dadosNormalizados: any = {}
        
        try {
          // Validar apenas nome (único campo realmente obrigatório)
          if (!precatorio.credor_nome || !precatorio.credor_nome.trim()) {
            throw new Error('Nome do credor é obrigatório')
          }

          // Normalizar dados básicos
          dadosNormalizados = {
            titulo: precatorio.credor_nome.trim(), // Campo obrigatório
            credor_nome: precatorio.credor_nome.trim(),
            criado_por: user.id,
            responsavel: user.id,
            status: 'novo',
          }

          // CPF/CNPJ (opcional, mas se fornecido deve ser válido)
          if (precatorio.credor_cpf_cnpj && precatorio.credor_cpf_cnpj.trim()) {
            const cpfCnpj = normalizarCPFCNPJ(precatorio.credor_cpf_cnpj)
            
            // Validar apenas se tiver tamanho correto
            if (cpfCnpj.length === 11) {
              if (!validarCPF(cpfCnpj)) {
                throw new Error('CPF inválido')
              }
              dadosNormalizados.credor_cpf_cnpj = cpfCnpj
            } else if (cpfCnpj.length === 14) {
              if (!validarCNPJ(cpfCnpj)) {
                throw new Error('CNPJ inválido')
              }
              dadosNormalizados.credor_cpf_cnpj = cpfCnpj
            } else if (cpfCnpj.length > 0) {
              // Se tem algo mas não é válido, salva mesmo assim para completar depois
              dadosNormalizados.credor_cpf_cnpj = cpfCnpj
            }
          }

          // Valor principal (opcional, mas se fornecido deve ser número)
          if (precatorio.valor_principal != null && precatorio.valor_principal !== '') {
            const valor = parseFloat(String(precatorio.valor_principal))
            if (!isNaN(valor) && valor > 0) {
              dadosNormalizados.valor_principal = valor
            }
          }

          // Campos opcionais (todos) - verificar se não é null e tem conteúdo
          if (precatorio.numero_precatorio && precatorio.numero_precatorio.trim && precatorio.numero_precatorio.trim() && precatorio.numero_precatorio !== '()') {
            dadosNormalizados.numero_precatorio = precatorio.numero_precatorio.trim()
          }
          if (precatorio.numero_processo && precatorio.numero_processo.trim) {
            dadosNormalizados.numero_processo = precatorio.numero_processo.trim()
          }
          if (precatorio.numero_oficio && precatorio.numero_oficio.trim) {
            dadosNormalizados.numero_oficio = precatorio.numero_oficio.trim()
          }
          if (precatorio.tribunal && precatorio.tribunal.trim) {
            dadosNormalizados.tribunal = precatorio.tribunal.trim()
          }
          if (precatorio.devedor && precatorio.devedor.trim) {
            dadosNormalizados.devedor = precatorio.devedor.trim()
          }
          if (precatorio.esfera_devedor && precatorio.esfera_devedor.trim) {
            dadosNormalizados.esfera_devedor = precatorio.esfera_devedor.trim()
          }
          if (precatorio.credor_profissao && precatorio.credor_profissao.trim) {
            dadosNormalizados.credor_profissao = precatorio.credor_profissao.trim()
          }
          if (precatorio.credor_estado_civil && precatorio.credor_estado_civil.trim) {
            dadosNormalizados.credor_estado_civil = precatorio.credor_estado_civil.trim()
          }
          
          if (precatorio.credor_data_nascimento && precatorio.credor_data_nascimento.trim) {
            const dataNormalizada = normalizarData(precatorio.credor_data_nascimento)
            if (dataNormalizada) dadosNormalizados.credor_data_nascimento = dataNormalizada
          }
          
          if (precatorio.conjuge_nome && precatorio.conjuge_nome.trim) {
            dadosNormalizados.conjuge_nome = precatorio.conjuge_nome.trim()
          }
          if (precatorio.conjuge_cpf_cnpj && precatorio.conjuge_cpf_cnpj.trim) {
            const cpfCnpjConjuge = normalizarCPFCNPJ(precatorio.conjuge_cpf_cnpj)
            if (cpfCnpjConjuge.length > 0) {
              dadosNormalizados.conjuge_cpf_cnpj = cpfCnpjConjuge
            }
          }
          if (precatorio.advogado_nome && precatorio.advogado_nome.trim) {
            dadosNormalizados.advogado_nome = precatorio.advogado_nome.trim()
          }
          if (precatorio.advogado_cpf_cnpj && precatorio.advogado_cpf_cnpj.trim) {
            const cpfCnpjAdv = normalizarCPFCNPJ(precatorio.advogado_cpf_cnpj)
            if (cpfCnpjAdv.length > 0) {
              dadosNormalizados.advogado_cpf_cnpj = cpfCnpjAdv
            }
          }
          if (precatorio.advogado_oab && precatorio.advogado_oab.trim) {
            dadosNormalizados.advogado_oab = precatorio.advogado_oab.trim()
          }
          
          if (precatorio.valor_juros != null && precatorio.valor_juros !== '') {
            const vj = parseFloat(String(precatorio.valor_juros))
            if (!isNaN(vj)) dadosNormalizados.valor_juros = vj
          }
          if (precatorio.valor_atualizado != null && precatorio.valor_atualizado !== '') {
            const va = parseFloat(String(precatorio.valor_atualizado))
            if (!isNaN(va)) dadosNormalizados.valor_atualizado = va
          }
          
          if (precatorio.data_base && precatorio.data_base.trim) {
            const dataNormalizada = normalizarData(precatorio.data_base)
            if (dataNormalizada) dadosNormalizados.data_base = dataNormalizada
          }
          
          if (precatorio.data_expedicao && precatorio.data_expedicao.trim) {
            const dataNormalizada = normalizarData(precatorio.data_expedicao)
            if (dataNormalizada) dadosNormalizados.data_expedicao = dataNormalizada
          }
          
          if (precatorio.banco && precatorio.banco.trim) {
            dadosNormalizados.banco = precatorio.banco.trim()
          }
          if (precatorio.agencia && precatorio.agencia.trim) {
            dadosNormalizados.agencia = precatorio.agencia.trim()
          }
          if (precatorio.conta && precatorio.conta.trim) {
            dadosNormalizados.conta = precatorio.conta.trim()
          }
          if (precatorio.tipo_conta && precatorio.tipo_conta.trim) {
            dadosNormalizados.tipo_conta = precatorio.tipo_conta.trim()
          }
          if (precatorio.endereco_completo && precatorio.endereco_completo.trim) {
            dadosNormalizados.endereco_completo = precatorio.endereco_completo.trim()
          }
          if (precatorio.cep && precatorio.cep.replace) {
            const cepLimpo = precatorio.cep.replace(/\D/g, '')
            if (cepLimpo.length > 0) {
              dadosNormalizados.cep = cepLimpo
            }
          }
          // REMOVIDO: campo cidade não existe na tabela
          if (precatorio.estado && precatorio.estado.trim) {
            dadosNormalizados.estado = precatorio.estado.trim().toUpperCase()
          }
          if (precatorio.observacoes && precatorio.observacoes.trim) {
            dadosNormalizados.observacoes = precatorio.observacoes.trim()
          }
          if (precatorio.contatos && precatorio.contatos.trim) {
            dadosNormalizados.contatos = precatorio.contatos.trim()
          }

          // Inserir no banco
          const { data: precatorioCriado, error: insertError } = await supabase
            .from('precatorios')
            .insert(dadosNormalizados)
            .select()
            .single()

          if (insertError) throw insertError

          resultados.criados++
          resultados.detalhes.push({
            index: i,
            sucesso: true,
            precatorio_id: precatorioCriado.id,
            credor_nome: dadosNormalizados.credor_nome,
          })

        } catch (error) {
          console.error(`[Import JSON] Erro no precatório ${i}:`, error)
          console.error(`[Import JSON] Dados:`, dadosNormalizados)
          
          resultados.erros++
          
          // Extrair mensagem de erro MUITO detalhada
          let mensagemErro = 'Erro desconhecido'
          let detalhesErro: any = {}
          
          if (error instanceof Error) {
            mensagemErro = error.message
            detalhesErro = {
              message: error.message,
              name: error.name,
              stack: error.stack?.split('\n').slice(0, 3).join('\n')
            }
          } else if (typeof error === 'object' && error !== null) {
            mensagemErro = JSON.stringify(error, null, 2)
            detalhesErro = error
          }
          
          resultados.detalhes.push({
            index: i,
            sucesso: false,
            erro: mensagemErro,
            erro_detalhado: detalhesErro,
            dados_enviados: dadosNormalizados,
            credor_nome: precatorio.credor_nome || 'Não informado',
          })
        }
      }

      return NextResponse.json({
        success: true,
        action: 'create',
        resultados,
      })
    }

    return NextResponse.json(
      { error: 'Action inválida. Use "preview" ou "create"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('[Import JSON] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar importação' },
      { status: 500 }
    )
  }
}
