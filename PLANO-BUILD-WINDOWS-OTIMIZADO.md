# 🚀 Plano de Build Windows .exe Otimizado

## 📋 Objetivo
Gerar instalável Windows (.exe) o mais leve possível, sem quebrar funcionalidades.

---

## 🔍 Análise Atual

### Estrutura do Projeto:
- **Frontend**: Next.js 15.1.1 + React 18.2.0
- **Desktop**: Tauri 2.9.5
- **Build**: `npm run build` → `out/` → Tauri empacota

### Problemas Identificados:
1. ❌ `next.config.js` sem `output: "export"` (necessário para Tauri)
2. ❌ Source maps não desabilitados
3. ❌ Sem otimizações de produção no Next.js
4. ❌ Cargo.toml sem otimizações de release
5. ❌ tauri.conf.json sem exclusões de arquivos

---

## 📝 Plano de Otimização

### Etapa 1: Otimizar Next.js
**Arquivo:** `next.config.js`
- ✅ Adicionar `output: "export"` (SSG)
- ✅ Desabilitar source maps
- ✅ Habilitar minificação
- ✅ Otimizar imagens
- ✅ Remover console.log em produção

### Etapa 2: Otimizar Cargo.toml (Rust)
**Arquivo:** `src-tauri/Cargo.toml`
- ✅ Adicionar profile.release com:
  - `opt-level = "z"` (tamanho mínimo)
  - `lto = true` (Link Time Optimization)
  - `codegen-units = 1` (melhor otimização)
  - `strip = true` (remover símbolos de debug)
  - `panic = "abort"` (reduzir tamanho)

### Etapa 3: Otimizar tauri.conf.json
**Arquivo:** `src-tauri/tauri.conf.json`
- ✅ Adicionar bundle.resources.exclude
- ✅ Excluir: docs/, scripts/, *.md, *.map, tests/
- ✅ Configurar bundle.windows.nsis
- ✅ Habilitar compressão

### Etapa 4: Limpar Build Anterior
```bash
# Limpar caches
rm -rf .next out src-tauri/target

# Limpar node_modules (opcional, mas recomendado)
rm -rf node_modules
npm install --production=false
```

### Etapa 5: Build de Produção
```bash
# 1. Build do Next.js (SSG)
npm run build

# 2. Build do Tauri (Release)
npm run tauri build
```

### Etapa 6: Localizar Instalador
```
src-tauri/target/release/bundle/nsis/CRMAPAXPRECATORIOS_0.1.0_x64-setup.exe
```

---

## 🎯 Otimizações Esperadas

### Tamanho Estimado:
- **Antes**: ~150-200 MB
- **Depois**: ~50-80 MB

### Melhorias:
- ✅ Sem source maps (-30%)
- ✅ Minificação agressiva (-20%)
- ✅ Rust otimizado (-15%)
- ✅ Sem arquivos desnecessários (-10%)
- ✅ Compressão NSIS (-25%)

---

## ⚠️ Verificações Pós-Build

### Funcionalidades a Testar:
1. ✅ Login (autenticação Supabase)
2. ✅ Kanban (drag & drop)
3. ✅ Abrir card (visualização/edição)
4. ✅ Upload de documentos
5. ✅ Download de PDFs
6. ✅ Calculadora (7 etapas)
7. ✅ Busca avançada
8. ✅ Dashboard

---

## 🚀 Execução

Vou implementar todas as otimizações e gerar o build.

**Tempo estimado:** 10-15 minutos (dependendo do hardware)
