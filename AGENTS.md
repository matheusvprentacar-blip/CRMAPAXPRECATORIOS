# Agent Release Rules

Quando o usuario disser `faca o update` (com ou sem cedilha), trate como comando de release.

Fluxo obrigatorio:
1. Rodar `npm run release:update`.
2. Garantir bump de versao em:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
3. Fazer commit e criar tag `vX.Y.Z`.
4. Fazer push da branch atual e da tag para `origin`.
5. Confirmar para o usuario a versao publicada.

Regras:
- Bump padrao: `patch`.
- Se o usuario pedir versao exata, usar:
  - `npm run release:update -- -Version X.Y.Z`
- Se pedir `minor` ou `major`, usar:
  - `npm run release:update:minor`
  - `npm run release:update:major`
- Nao incluir artefatos de build em commit (`dist/`, `backups/`, `supabase/.temp/`).
- O updater do Tauri e gerado pelo workflow de release em `.github/workflows/release.yml` apos push da tag.
