# tools/audit/generate-domain-map.ps1
# Updates domain-map.yaml with SSOT metadata (generatedAt, commitSha, generator)

param(
    [string]$DomainMapPath = "docs/architecture/domain-map.yaml"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
    if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

if (!(Test-Path $DomainMapPath)) {
    throw "Missing domain map file: $DomainMapPath"
}

$commitSha = (git rev-parse HEAD).Trim()
$generatedAt = (Get-Date).ToString("o")
$generator = "tools/audit/generate-domain-map.ps1@1.0.0"

$txt = Get-Content $DomainMapPath -Raw -Encoding UTF8

# Update header comment "# Generated: YYYY-MM-DD"
$txt = $txt -replace '(?m)^# Generated:\s*\d{4}-\d{2}-\d{2}\s*$', "# Generated: $((Get-Date).ToString('yyyy-MM-dd'))"

# Ensure lastUpdated exists and refresh it
if ($txt -match '(?m)^lastUpdated:\s*".*"$') {
    $txt = $txt -replace '(?m)^lastUpdated:\s*".*"$', "lastUpdated: `"$generatedAt`""
}
else {
    $txt = $txt -replace '(?m)^(version:\s*".*")\s*$', "`$1`nlastUpdated: `"$generatedAt`""
}

# Ensure generatedAt key exists
if ($txt -notmatch '(?m)^generatedAt:\s*".*"$') {
    $txt = $txt -replace '(?m)^(lastUpdated:\s*".*")', "`$1`ngeneratedAt: `"$generatedAt`""
}
else {
    $txt = $txt -replace '(?m)^generatedAt:\s*".*"$', "generatedAt: `"$generatedAt`""
}

# Ensure generator key exists
if ($txt -notmatch '(?m)^generator:\s*".*"$') {
    $txt = $txt -replace '(?m)^(generatedAt:\s*".*")', "`$1`ngenerator: `"$generator`""
}
else {
    $txt = $txt -replace '(?m)^generator:\s*".*"$', "generator: `"$generator`""
}

# Ensure commitSha key exists
if ($txt -notmatch '(?m)^commitSha:\s*".*"$') {
    $txt = $txt -replace '(?m)^(generator:\s*".*")', "`$1`ncommitSha: `"$commitSha`""
}
else {
    $txt = $txt -replace '(?m)^commitSha:\s*".*"$', "commitSha: `"$commitSha`""
}

# Write back
$dir = Split-Path -Parent $DomainMapPath
if ($dir) { Ensure-Dir $dir }

Set-Content -Path $DomainMapPath -Value $txt -Encoding UTF8

Write-Host "[generate-domain-map] Updated: $DomainMapPath"
Write-Host "[generate-domain-map] generatedAt=$generatedAt"
Write-Host "[generate-domain-map] commitSha=$commitSha"
