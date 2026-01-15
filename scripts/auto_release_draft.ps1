# -------------------------------------------------
# scripts/auto_release.ps1
# Automação completa: build → version bump → tag → push → release
# -------------------------------------------------
$ErrorActionPreference = "Stop"

# ---- 0️⃣ Função para incrementar versão (minor) ----
function Increment-Version {
    param([string]$current)
    # Expected format: major.minor.patch (e.g., 1.0.0)
    $parts = $current -split "\."
    if ($parts.Length -lt 2) { throw "Versão inválida: $current" }
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    # Incrementa o número minor
    $minor++
    $newVersion = "${major}.${minor}.0"
    return $newVersion
}

# ---- 1️⃣ Carregar variáveis de ambiente (.env.local) ----
Write-Host "🔑 Carregando chaves de .env.local ..."
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envFile) {
    try {
        $lines = Get-Content $envFile
        foreach ($line in $lines) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $line = $line.Trim()
            if ($line.StartsWith("#")) { continue }
            
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $val = $parts[1].Trim()
                # Remove aspas 
                $val = $val -replace '^["'']|["'']$', ''
                
                [Environment]::SetEnvironmentVariable($key, $val, "Process")
                Write-Host "   -> Variável carregada: $key"
            }
        }
    }
    catch {
        Write-Warning "Erro ao ler .env.local: $_"
    }
}
else {
    Write-Warning "Arquivo .env.local não encontrado! O build pode não ser assinado."
}

# ---- 2️⃣ Build Tauri (assinatura automática) ----
Write-Host "🔧 Executando build Tauri (assinatura)..."
npm run tauri
if ($LASTEXITCODE -ne 0) { throw "Falha no build do Tauri" }

# ---- 3️⃣ Ler versão atual do package.json ----
Write-Host "📦 Lendo versão atual ..."
$packageJsonPath = Join-Path $PSScriptRoot "..\package.json"
$targetJsonPath = Join-Path $PSScriptRoot "..\src-tauri\tauri.conf.json"

$pkgContent = Get-Content $packageJsonPath -Raw
$pkg = $pkgContent | ConvertFrom-Json
$currentVersion = $pkg.version

# ---- 4️⃣ Incrementar versão (minor) ----
$newVersion = Increment-Version $currentVersion
Write-Host "🔢 Versão atual: $currentVersion -> Nova versão: $newVersion"

# ---- 5️⃣ Atualizar package.json e tauri.conf.json ----
# Update package.json
$pkg.version = $newVersion
$pkg | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8

# Update tauri.conf.json (necessário para o updater funcionar corretamente)
$tauriConfContent = Get-Content $targetJsonPath -Raw
$tauriConf = $tauriConfContent | ConvertFrom-Json
$tauriConf.version = $newVersion
$tauriConf | ConvertTo-Json -Depth 10 | Set-Content $targetJsonPath -Encoding UTF8

Write-Host "✅ Arquivos de versão atualizados."

# ---- 6️⃣ Commit e tag ----
Write-Host "🏷️ Commitando e criando tag v$newVersion"
git add $packageJsonPath $targetJsonPath
git commit -m "chore: release v$newVersion"
git tag -a "v$newVersion" -m "Release v$newVersion"
git push origin main
git push origin "v$newVersion"

# ---- 7️⃣ Identificar artefatos ----
$bundleDir = Join-Path $PSScriptRoot "..\src-tauri\target\release\bundle"
# Nota: O Tauri gera o nome do arquivo com base na versão definida no tauri.conf.json ANTES do build.
# Como atualizamos a versão DEPOIS do build neste script (erro de lógica comum), o build atual ainda terá a versão ANTIGA nos arquivos.
# CORREÇÃO: Devemos atualizar a versão ANTES do build. 
# Vou interromper este script para reordenar os passos na próxima iteração se eu pudesse, 
# mas vou ajustar a lógica aqui mesmo: O build foi feito no passo 2 com a versão ANTIGA.
# Isso significa que o executável terá a versão $currentVersion.
# Se quisermos que o executável tenha a versão $newVersion, temos que bumpar ANTES do build.

Write-Warning "⚠️ ATENÇÃO: O build foi feito com a versão $currentVersion (antes do bump)."
Write-Warning "Idealmente, o bump de versão deve ocorrer antes do build."
Write-Host "Procurando artefatos com versão $currentVersion..."

$exePath = Join-Path $bundleDir "nsis\CRMAPAXPRECATORIOS_${currentVersion}_x64-setup.exe"
$exeSig = "${exePath}.sig"
$msiPath = Join-Path $bundleDir "msi\CRMAPAXPRECATORIOS_${currentVersion}_x64_en-US.msi"
$msiSig = "${msiPath}.sig"

# ---- 8️⃣ Upload para GitHub ----
Write-Host "🚀 Criando release v$newVersion (com artefatos v$currentVersion)..."
# Nota: É confuso a tag ser v1.1 mas o exe ser v1.0. 
# Vou ajustar o script para que na PRÓXIMA vez ele faça a ordem certa? 
# O usuário pediu para "sempre atualizar a versão".
# Vou manter a tag sincronizada com o nome do arquivo para evitar erro 404 no updater.
# Para este script funcionar "agora", vou usar a versão $currentVersion para tudo.
# Mas vou forçar o bump no final para a próxima.

# Espere, o usuário quer que eu atualize a versão. 
# Então a ordem correta é:
# 1. Load Env
# 2. Read Version -> Calculate New Version
# 3. Update Files (package.json + tauri.conf.json)
# 4. Build
# 5. Commit/Tag
# 6. Release

# Vou reescrever o arquivo com a ordem CORRETA agora.
