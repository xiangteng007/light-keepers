# tools/audit/generate-domain-map.ps1
# v1.2.0 (DETERMINISTIC)
# Purpose:
# - Normalize domain-map.yaml header metadata to a single canonical block
# - Remove duplicated metadata keys (lastUpdated/generatedAt/generator/commitSha)
# - Remove UTF-8 BOM if present (avoid cross-platform diffs)
# - Deterministic timestamps: use HEAD commit time (so CI re-run does NOT drift)

param(
    [string]$DomainMapPath = "docs/architecture/domain-map.yaml",
    [string]$GeneratorId = "tools/audit/generate-domain-map.ps1@1.2.0"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path $DomainMapPath)) {
    throw "Missing domain map file: $DomainMapPath"
}

function Get-HeadCommitSha() {
    if ($env:GITHUB_SHA) { return $env:GITHUB_SHA.Trim() }
    return (git rev-parse HEAD).Trim()
}

function Get-HeadCommitIso([string]$sha) {
    # Commit timestamp in ISO-8601 (deterministic per commit)
    $iso = (git show -s --format=%cI $sha).Trim()
    if ([string]::IsNullOrWhiteSpace($iso)) {
        # Fallback (should not happen in git-enabled environments)
        return (Get-Date).ToString("o")
    }
    return $iso
}

$commitSha = Get-HeadCommitSha
$commitIso = Get-HeadCommitIso $commitSha
$commitDate = ([datetime]$commitIso).ToString("yyyy-MM-dd")

# Read raw (remove BOM if present)
$raw = Get-Content $DomainMapPath -Raw -Encoding UTF8
$raw = $raw.TrimStart([char]0xFEFF)
$lines = $raw -split "`r?`n"

# 1) Remove ALL duplicated metadata keys (keep version)
$filtered = New-Object System.Collections.Generic.List[string]
foreach ($line in $lines) {
    if ($line -match '^(lastUpdated|generatedAt|generator|commitSha):\s*') { continue }
    $filtered.Add($line) | Out-Null
}

# 2) Find version line (required)
$versionIdx = -1
for ($i = 0; $i -lt $filtered.Count; $i++) {
    if ($filtered[$i] -match '^version:\s*') { $versionIdx = $i; break }
}

if ($versionIdx -eq -1) {
    # Insert version after initial comment/blank block
    $insertAt = 0
    while ($insertAt -lt $filtered.Count) {
        $t = $filtered[$insertAt].Trim()
        if ($t -eq "" -or $t.StartsWith("#")) { $insertAt++ } else { break }
    }
    $filtered.Insert($insertAt, 'version: "1.0"')
    $versionIdx = $insertAt
}

# 3) Normalize version line formatting (keep current value, ensure quoted)
$verLine = $filtered[$versionIdx]
$verVal = ($verLine -replace '^version:\s*', '').Trim()
$verVal = $verVal.Trim('"')
$filtered[$versionIdx] = "version: `"$verVal`""

# 4) Update "# Generated: YYYY-MM-DD" if present (deterministic by commit date)
for ($i = 0; $i -lt $filtered.Count; $i++) {
    if ($filtered[$i] -match '^#\s*Generated:\s*\d{4}-\d{2}-\d{2}\s*$') {
        $filtered[$i] = "# Generated: $commitDate"
    }
}

# 5) Insert canonical metadata block AFTER version line (deterministic)
$meta = @(
    "lastUpdated: `"$commitIso`"",
    "generatedAt: `"$commitIso`"",
    "generator: `"$GeneratorId`"",
    "commitSha: `"$commitSha`""
)

$insertPos = $versionIdx + 1
foreach ($m in $meta) {
    $filtered.Insert($insertPos, $m)
    $insertPos++
}

# 6) Write back as UTF-8 NO BOM (stable)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$outText = ($filtered -join "`n").TrimEnd() + "`n"
[System.IO.File]::WriteAllText($DomainMapPath, $outText, $utf8NoBom)

Write-Host "Domain map metadata normalized (deterministic):"
Write-Host " - $DomainMapPath"
Write-Host " - version=$verVal"
Write-Host " - generatedAt=$commitIso"
Write-Host " - commitSha=$commitSha"
