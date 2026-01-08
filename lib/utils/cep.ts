/**
 * Utilitário para busca de CEP via API ViaCEP
 */

export interface EnderecoViaCEP {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

/**
 * Busca endereço pelo CEP usando a API ViaCEP
 * @param cep CEP a ser buscado (com ou sem formatação)
 * @returns Dados do endereço ou null se não encontrado
 */
export async function buscarCEP(cep: string): Promise<EnderecoViaCEP | null> {
  try {
    // Remover formatação do CEP
    const cepLimpo = cep.replace(/\D/g, '')
    
    // Validar tamanho
    if (cepLimpo.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos')
    }
    
    // Buscar na API
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    
    if (!response.ok) {
      throw new Error('Erro ao buscar CEP')
    }
    
    const data: EnderecoViaCEP = await response.json()
    
    // Verificar se CEP foi encontrado
    if (data.erro) {
      return null
    }
    
    return data
  } catch (error) {
    console.error('[CEP] Erro ao buscar:', error)
    return null
  }
}

/**
 * Formata CEP para o padrão brasileiro (00000-000)
 * @param cep CEP sem formatação
 * @returns CEP formatado
 */
export function formatarCEP(cep: string): string {
  const cepLimpo = cep.replace(/\D/g, '')
  
  if (cepLimpo.length !== 8) {
    return cep
  }
  
  return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`
}

/**
 * Valida se o CEP tem formato válido
 * @param cep CEP a ser validado
 * @returns true se válido, false caso contrário
 */
export function validarCEP(cep: string): boolean {
  const cepLimpo = cep.replace(/\D/g, '')
  return cepLimpo.length === 8
}
