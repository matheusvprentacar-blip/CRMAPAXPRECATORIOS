// =====================================================
// Normalização de Dados Extraídos
// =====================================================

/**
 * Normaliza CPF/CNPJ removendo caracteres especiais
 */
export function normalizarCPFCNPJ(valor: string): string {
  return valor.replace(/[^\d]/g, '')
}

/**
 * Normaliza data para formato ISO (YYYY-MM-DD)
 */
export function normalizarData(valor: string): string | null {
  // Tenta vários formatos comuns
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD (já normalizado)
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ]

  for (const format of formats) {
    const match = valor.match(format)
    if (match) {
      if (format === formats[1]) {
        // Já está no formato correto
        return match[0]
      } else if (format === formats[0] || format === formats[2]) {
        // DD/MM/YYYY ou DD-MM-YYYY → YYYY-MM-DD
        return `${match[3]}-${match[2]}-${match[1]}`
      }
    }
  }

  return null
}

/**
 * Normaliza valor monetário
 */
export function normalizarValor(valor: string): string {
  // Remove R$, pontos e substitui vírgula por ponto
  return valor
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim()
}

/**
 * Normaliza CEP
 */
export function normalizarCEP(valor: string): string {
  return valor.replace(/[^\d]/g, '')
}

/**
 * Normaliza telefone
 */
export function normalizarTelefone(valor: string): string {
  return valor.replace(/[^\d]/g, '')
}

/**
 * Normaliza nome (capitaliza)
 */
export function normalizarNome(valor: string): string {
  return valor
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Valida CPF
 */
export function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '')
  
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let resto = 11 - (soma % 11)
  let digito1 = resto >= 10 ? 0 : resto

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i)
  }
  resto = 11 - (soma % 11)
  let digito2 = resto >= 10 ? 0 : resto

  return parseInt(cpf.charAt(9)) === digito1 && parseInt(cpf.charAt(10)) === digito2
}

/**
 * Valida CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '')
  
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  let tamanho = cnpj.length - 2
  let numeros = cnpj.substring(0, tamanho)
  let digitos = cnpj.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--
    if (pos < 2) pos = 9
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0))) return false

  tamanho = tamanho + 1
  numeros = cnpj.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--
    if (pos < 2) pos = 9
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  return resultado === parseInt(digitos.charAt(1))
}
