# Claude Project Instructions

Para este repositorio, interprete `faca o update` como comando de release.

Execute:
- `npm run release:update`

Comportamento esperado:
- Bump de versao (patch default).
- Sincroniza versao em `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`.
- Commit automatico com tag `vX.Y.Z`.
- Push da branch atual e da tag para `origin`.
- Informar a versao final ao usuario.

Comandos alternativos:
- Versao fixa: `npm run release:update -- -Version X.Y.Z`
- Minor: `npm run release:update:minor`
- Major: `npm run release:update:major`
