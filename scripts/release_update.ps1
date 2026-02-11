param(
  [ValidateSet("patch", "minor", "major")]
  [string]$Bump = "patch",
  [string]$Version,
  [string]$CommitMessage,
  [string]$Remote = "origin",
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $false)][string[]]$Args = @(),
    [switch]$CaptureOutput,
    [switch]$AllowFailure
  )

  $display = "$File $($Args -join ' ')".Trim()
  Write-Host ">>> $display"

  if ($CaptureOutput) {
    $output = & $File @Args 2>&1
    $exitCode = $LASTEXITCODE
    if (-not $AllowFailure -and $exitCode -ne 0) {
      throw "Falha ao executar: $display`n$($output -join "`n")"
    }
    return ($output | Out-String).Trim()
  }

  & $File @Args
  $exitCode = $LASTEXITCODE
  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "Falha ao executar: $display (exit code $exitCode)"
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$insideRepo = Invoke-External -File "git" -Args @("rev-parse", "--is-inside-work-tree") -CaptureOutput
if ($insideRepo -ne "true") {
  throw "Diretorio atual nao e um repositorio git."
}

$branch = Invoke-External -File "git" -Args @("rev-parse", "--abbrev-ref", "HEAD") -CaptureOutput
if ($branch -eq "HEAD") {
  throw "Branch em detached HEAD. Faca checkout de uma branch antes do update."
}

$currentVersion = Invoke-External -File "node" -Args @("-p", "require('./package.json').version") -CaptureOutput

if ($Version) {
  if ($Version -ne $currentVersion) {
    Invoke-External -File "npm.cmd" -Args @("version", $Version, "--no-git-tag-version")
  } else {
    Write-Host ">>> Versao ja esta em $Version. Seguindo sem novo bump."
  }
} else {
  Invoke-External -File "npm.cmd" -Args @("version", $Bump, "--no-git-tag-version")
}

$newVersion = Invoke-External -File "node" -Args @("-p", "require('./package.json').version") -CaptureOutput
$tag = "v$newVersion"

$tauriConfPath = Join-Path $repoRoot "src-tauri/tauri.conf.json"
$tauriRaw = Get-Content -Raw $tauriConfPath
$tauriConf = $tauriRaw | ConvertFrom-Json
$tauriConf.version = $newVersion
if ($tauriConf.package -and ($tauriConf.package -is [psobject])) {
  $tauriConf.package.version = $newVersion
}
[System.IO.File]::WriteAllText(
  $tauriConfPath,
  (($tauriConf | ConvertTo-Json -Depth 100) + "`n")
)

$cargoTomlPath = Join-Path $repoRoot "src-tauri/Cargo.toml"
$cargoRaw = [System.IO.File]::ReadAllText($cargoTomlPath)
$cargoPattern = '(\[package\][\s\S]*?^\s*version\s*=\s*")[^"]+(")'
$cargoUpdated = [System.Text.RegularExpressions.Regex]::Replace(
  $cargoRaw,
  $cargoPattern,
  {
    param($match)
    return $match.Groups[1].Value + $newVersion + $match.Groups[2].Value
  },
  [System.Text.RegularExpressions.RegexOptions]::Multiline
)
if ($cargoUpdated -eq $cargoRaw) {
  throw "Nao foi possivel atualizar a versao em src-tauri/Cargo.toml"
}
[System.IO.File]::WriteAllText($cargoTomlPath, $cargoUpdated)

$localTag = Invoke-External -File "git" -Args @("tag", "-l", $tag) -CaptureOutput
if (-not [string]::IsNullOrWhiteSpace($localTag)) {
  throw "A tag $tag ja existe localmente."
}

$remoteTag = Invoke-External -File "git" -Args @("ls-remote", "--tags", $Remote, "refs/tags/$tag") -CaptureOutput
if (-not [string]::IsNullOrWhiteSpace($remoteTag)) {
  throw "A tag $tag ja existe no remoto $Remote."
}

Invoke-External -File "git" -Args @("add", "-u")
Invoke-External -File "git" -Args @("reset", "-q", "--", "supabase/.temp/cli-latest") -AllowFailure

$untrackedRaw = Invoke-External -File "git" -Args @("ls-files", "--others", "--exclude-standard") -CaptureOutput
$untracked = @()
if (-not [string]::IsNullOrWhiteSpace($untrackedRaw)) {
  $untracked = $untrackedRaw -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}

$filteredUntracked = @($untracked | Where-Object {
  ($_ -notmatch "^dist/") -and
  ($_ -notmatch "^backups/") -and
  ($_ -notmatch "^supabase/\\.temp/") -and
  ($_ -notmatch "\\.zip$") -and
  ($_ -notmatch "^build_log.*\\.txt$")
})

if ($filteredUntracked.Count -gt 0) {
  $addArgs = @("add", "--") + $filteredUntracked
  Invoke-External -File "git" -Args $addArgs
}

& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  throw "Nenhuma alteracao staged para commit."
}

if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
  $CommitMessage = "chore(release): $tag"
}

Invoke-External -File "git" -Args @("commit", "-m", $CommitMessage)
Invoke-External -File "git" -Args @("tag", "-a", $tag, "-m", "release $tag")

if (-not $SkipPush) {
  Invoke-External -File "git" -Args @("push", $Remote, $branch)
  Invoke-External -File "git" -Args @("push", $Remote, $tag)
  Write-Host "Release enviada: branch $branch + tag $tag"
  Write-Host "A Action '.github/workflows/release.yml' vai gerar o updater."
} else {
  Write-Host "Commit e tag criados localmente: $tag"
}
