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
                $key = $parts[0].Trim()
                $val = $parts[1].Trim().Trim('"').Trim("'")
                
                # Set env var for current session (child processes inherit this)
                Set-Item -Path "env:$key" -Value $val
            }
        }
    }
    if ($env:TAURI_SIGNING_PRIVATE_KEY) { Write-Host "    [+] Signing key loaded." }
    else { Write-Warning "    [-] Signing key NOT found." }
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
# npm run tauri now runs just 'tauri', so we need to pass 'build'
npm run tauri -- build
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

# --- CHECK SIGNATURE AND FALLBACK ---
$sigFile = "$exe.sig"
if (-not (Test-Path $sigFile)) {
    Write-Warning "Signature file not found automatically. Attempting manual signing..."
    
    if (-not $env:TAURI_SIGNING_PRIVATE_KEY) { throw "Cannot sign manually: Private key env var missing." }

    $tempKey = Join-Path $env:TEMP "tauri_key_$new.txt"
    # Robustly clean the key: remove outer whitespace, then outer quotes
    $rawKey = $env:TAURI_SIGNING_PRIVATE_KEY.Trim().Trim('"').Trim("'")
    
    # Check if we have the raw "untrusted comment" header.
    if ($rawKey.StartsWith("untrusted comment")) {
        Write-Host "    [i] Key appears to be raw Minisign text."
        # Ensure we preserve the content but normalize newlines if needed
        $rawKey | Out-File -FilePath $tempKey -Encoding utf8 -NoNewline
    }
    else {
        try {
            Write-Host "    [i] Key appears Base64 encoded (no header). Decoding..."
            # For Base64, we CAN safely strip all whitespace/newlines
            $cleanBase64 = $rawKey -replace '\s', ''
            $bytes = [Convert]::FromBase64String($cleanBase64)
            $decoded = [System.Text.Encoding]::UTF8.GetString($bytes)
            $decoded | Out-File -FilePath $tempKey -Encoding utf8 -NoNewline
        }
        catch {
            Write-Warning "    [!] Failed to decode Base64 key. Writing raw content as fallback."
            Write-Warning "    [!] Error: $_"
            $rawKey | Out-File -FilePath $tempKey -Encoding utf8 -NoNewline
        }
    }

    Write-Host "    Signing EXE..."
    # Using npx tauri signer sign
    $pass = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
    if (-not $pass) { $pass = "" }
    
    # Run npx command. Note: quoting complexity with powershell/cmd.
    # We use direct arguments.
    $signingArgs = @("tauri", "signer", "sign", "-k", $tempKey)
    if ($pass) { $signingArgs += "--password"; $signingArgs += $pass }
    $signingArgs += $exe

    & npx.cmd $signingArgs
    
    Remove-Item -Force $tempKey
    
    if (-not (Test-Path $sigFile)) { throw "Manual signing failed. Sig file still missing." }
    Write-Host "    [+] Manual signing successful."
}

# --- GENERATE LATEST.JSON FOR UPDATER ---
Write-Host ">>> Generating latest.json..."
$sigContent = Get-Content $sigFile -Raw
$jsonPath = Join-Path $base "latest.json"
$downloadUrl = "https://github.com/matheusvprentacar-blip/CRMAPAXPRECATORIOS/releases/download/v$new/CRMAPAXPRECATORIOS_${new}_x64-setup.exe"

$updateJson = @{
    version   = "v$new"
    notes     = "Auto-release $new"
    pub_date  = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{
        "windows-x86_64" = @{
            signature = $sigContent
            url       = $downloadUrl
        }
    }
}

$updateJson | ConvertTo-Json -Depth 5 | Set-Content $jsonPath

# --- UPLOAD TO GITHUB ---
Write-Host ">>> GitHub Release..."
gh release create "v$new" "$exe" "$sigFile" "$msi" "$msi.sig" "$jsonPath" --title "v$new" --notes "Auto-release $new"

Write-Host "DONE! Version $new released."
