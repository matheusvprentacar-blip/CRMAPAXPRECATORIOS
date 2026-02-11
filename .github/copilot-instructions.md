# Copilot Instructions

Comando natural `faca o update` significa executar release.

Checklist:
1. Execute `npm run release:update`.
2. Confirme que a versao foi sincronizada em:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
3. Confirme commit + push da branch e push da tag `vX.Y.Z`.
4. Informe a versao final para o usuario.

Variacoes:
- Versao especifica: `npm run release:update -- -Version X.Y.Z`
- Minor: `npm run release:update:minor`
- Major: `npm run release:update:major`
