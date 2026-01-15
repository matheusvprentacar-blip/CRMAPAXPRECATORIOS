# -------------------------------------------------
# scripts/auto_release.ps1
# Automação corrigida: Bump Versão → Build → Tag → Release
# -------------------------------------------------
$ErrorActionPreference = "Stop"

function Increment-Version {
    param([string]$current)
    $parts = $current -split "\."
    if ($parts.Length -lt 2) { $parts = @($current, "0", "0") }
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $minor++
    return "${major}.${minor}.0"
}

# 1️⃣ Carregar variáveis (.env.local)
Write-Host "🔑 Carregando chaves de .env.local ..."
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and $line[0] -ne '#') {
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $val = $parts[1].Trim().Trim('"').Trim("'")
                [Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }
    }
}

# 2️⃣ Ler e Incrementar Versão
Write-Host "� Calculando nova versão..."
$pkgJsonPath = Join-Path $PSScriptRoot "..\package.json"
$tauriConfPath = Join-Path $PSScriptRoot "..\src-tauri\tauri.conf.json"

$pkg = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
$oldVer = $pkg.version
$newVer = Increment-Version $oldVer
Write-Host "   $oldVer -> $newVer"

# 3️⃣ Atualizar Arquivos
$pkg.version = $newVer
$pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgJsonPath -Encoding UTF8

$tauriConf = Get-Content $tauriConfPath -Raw | ConvertFrom-Json
$tauriConf.package.version = $newVer # Tauri v1 structure
if ($tauriConf.version) { $tauriConf.version = $newVer } # Tauri v2 structure check
$tauriConf | ConvertTo-Json -Depth 10 | Set-Content $tauriConfPath -Encoding UTF8

Write-Host "✅ Versão atualizada nos arquivos."

# 4️⃣ Build (com a nova versão)
Write-Host "🔧 Executando build Tauri (v$newVer)..."
npm run tauri
if ($LASTEXITCODE -ne 0) { throw "Erro no build." }

# 5️⃣ Commit & Tag
Write-Host "🏷️ Criando tag v$newVer..."
git add $pkgJsonPath $tauriConfPath
git commit -m "chore: release v$newVer"
git tag -a "v$newVer" -m "Release v$newVersion"
git push origin main
git push origin "v$newVersion"

# 6️⃣ Release no GitHub
Write-Host "🚀 Enviando release v$newVersion..."
$bundleDir = Join-Path $PSScriptRoot "..\src-tauri\target\release\bundle"
$exe = Join-Path $bundleDir "nsis\CRMAPAXPRECATORIOS_${newVer}_x64-setup.exe"
$msi = Join-Path $bundleDir "msi\CRMAPAXPRECATORIOS_${newVer}_x64_en-US.msi"

# Verifica assinaturas
$exeSig = "$exe.sig"
$msiSig = "$msi.sig"

$files = @()
if (Test-Path $exe) { $files += $exe }
if (Test-Path $exeSig) { $files += $exeSig }
if (Test-Path $msi) { $files += $msi }
if (Test-Path $msiSig) { $files += $msiSig }

gh release create "v$newVer" $files `
    -t "v$newVersion" `
    -n "Auto-release v$newVersion. Assinado e verificado."

Write-Host "🎉 Sucesso! v$newVersion publicada."
