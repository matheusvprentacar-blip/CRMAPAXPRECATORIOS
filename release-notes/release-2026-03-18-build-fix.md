# Release 2026-03-18 (Build Fix)

- Corrigida incompatibilidade de build com `output: export` na rota `/api/market/latest`, removendo dependência de cookies/auth e configurando resposta estática com revalidação.
- Removida rota dinâmica `/api/precatorios/[id]/simulate` (incompatível com export estático) e criada rota estável `/api/precatorios/simulate`.
- Atualizado o painel de projeção comparativo para usar o novo endpoint `/api/precatorios/simulate`, enviando `precatorioId` no payload.
- Validado localmente com `npm run build` completo, incluindo geração e exportação estática sem erros.
