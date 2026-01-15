$ErrorActionPreference = "Stop"

# --- DEFINITIONS MUST BE AT TOP ---

function Get-Json($path) {
    $f = Join-Path $PSScriptRoot $path
    return Get-Content $f -Raw | ConvertFrom-Json
}

function Bump-Version {
    param($ver)
    $parts = $ver -split "\."
    
    # Ensure standard SemVer format X.Y.Z
    while ($parts.Count -lt 3) { $parts += "0" }
    
    $major = $parts[0]
    $minor = $parts[1]
    $patch = [int]$parts[2]
    
    # User requested pattern: 1.1.1 -> 1.1.2 -> 1.1.3 (PATCH increment)
    $patch++
    
    return "$major.$minor.$patch"
}

# --- EXECUTION ---

Write-Host ">>> Loading variables..."
$envPath = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envPath) {
    $lines = Get-Content $envPath
    foreach ($line in $lines) {
        $l = $line.Trim()
        if ($l -and $l[0] -ne '#') {
            $parts = $l.Split('=', 2)
            if ($parts.Count -eq 2) {
                $val = $parts[1].Trim().Trim('"').Trim("'")
                [Environment]::SetEnvironmentVariable($parts[0].Trim(), $val, "Process")
            }
        }
    }
}

Write-Host ">>> Calculating version..."
$pkgFile = Join-Path $PSScriptRoot "..\package.json"
$confFile = Join-Path $PSScriptRoot "..\src-tauri\tauri.conf.json"

$pkgContent = [System.IO.File]::ReadAllText($pkgFile)
$pkg = $pkgContent | ConvertFrom-Json
$old = $pkg.version

$new = Bump-Version $old
Write-Host "      $old -> $new"

# Update package.json
$pkg.version = $new
$newPkgJson = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($pkgFile, $newPkgJson)

# Update tauri.conf.json
$confContent = [System.IO.File]::ReadAllText($confFile)
$conf = $confContent | ConvertFrom-Json
if ($conf.package) { $conf.package.version = $new }
if ($conf.version) { $conf.version = $new }
$newConfJson = $conf | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($confFile, $newConfJson)

Write-Host ">>> Building Tauri..."
npm run tauri
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host ">>> Git Tag..."
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: release $new"

# Handle tag deletion safely
try { git tag -d "v$new" } catch { } 
$global:Error.Clear()

git tag -a "v$new" -m "Release $new"
git push origin main
git push origin "v$new"

Write-Host ">>> GitHub Release..."
$base = Join-Path $PSScriptRoot "..\src-tauri\target\release\bundle"
$exe = Join-Path $base "nsis\CRMAPAXPRECATORIOS_${new}_x64-setup.exe"
$msi = Join-Path $base "msi\CRMAPAXPRECATORIOS_${new}_x64_en-US.msi"

if (-not (Test-Path $exe)) { throw "Executable not found: $exe" }

gh release create "v$new" "$exe" "$exe.sig" "$msi" "$msi.sig" --title "v$new" --notes "Auto-release $new"

Write-Host "DONE! Version $new released."
