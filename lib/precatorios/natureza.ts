// O banco impõe CHECK (natureza IN ('Alimentar','Comum')) na tabela precatorios.
// Valores informados por OCR, Excel ou digitação livre chegam fora do padrão
// ("ALIMENTAR", "alimentício", "Não Alimentar", cabeçalhos de planilha...), e um
// único valor inválido derruba o insert (inclusive lotes inteiros na importação).
// Normalizamos para os dois valores aceitos ou null antes de gravar.
export function normalizarNatureza(valor: string | null | undefined): "Alimentar" | "Comum" | null {
  if (!valor) return null
  const txt = valor.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()
  if (!txt) return null
  if (txt.includes("aliment")) return /nao\s*aliment/.test(txt) ? "Comum" : "Alimentar"
  if (txt.includes("comum") || txt.includes("comun")) return "Comum"
  return null
}
