# Agent Release Rules

Quando o usuario disser `faca o update` (com ou sem cedilha), trate como comando de release.

Fluxo obrigatorio:
1. Escrever notas da release (obrigatorio) com o que foi feito.
2. Rodar `npm run release:update -- -ReleaseNotes "..."` ou `npm run release:update -- -ReleaseNotesFile caminho`.
3. Garantir bump de versao em:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
4. Fazer commit e criar tag `vX.Y.Z`.
5. Fazer push da branch atual e da tag para `origin`.
6. Confirmar para o usuario a versao publicada.

Regras:
- Bump padrao: `patch`.
- Se o usuario pedir versao exata, usar:
  - `npm run release:update -- -Version X.Y.Z -ReleaseNotes "..."`
- Se pedir `minor` ou `major`, usar:
  - `npm run release:update:minor -- -ReleaseNotes "..."`
  - `npm run release:update:major -- -ReleaseNotes "..."`
- Toda release deve ter notas; sem notas o script deve falhar.
- As notas da release devem ser publicadas no GitHub Release.
- Nao incluir artefatos de build em commit (`dist/`, `backups/`, `supabase/.temp/`).
- O updater do Tauri e gerado pelo workflow de release em `.github/workflows/release.yml` apos push da tag.
