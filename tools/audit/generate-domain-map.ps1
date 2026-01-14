# ============================================
# FILE: tools/audit/generate-domain-map.ps1
# VERSION: 1.1.1
# PURPOSE:
# - Normalize domain-map.yaml header metadata to a single canonical block
# - Remove duplicated metadata keys (lastUpdated/generatedAt/generator/commitSha)
# - Remove UTF-8 BOM if present (avoid cross-platform diffs)
# - DETERMINISTIC: uses git commit time, not Get-Date (enables CI drift lock)
# ============================================

param(
    [string]$DomainMapPath = "docs/architecture/domain-map.yaml",
    [string]$GeneratorId = "tools/audit/generate-domain-map.ps1@1.1.1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path $DomainMapPath)) {
    throw "Missing domain map file: $DomainMapPath"
}

# DETERMINISTIC: use git commit time instead of Get-Date
$commitSha = (git rev-parse HEAD).Trim()
$commitIso = (git log -1 --format=%cI HEAD).Trim()
if (-not $commitIso) { $commitIso = (Get-Date).ToString("o") } # fallback only
$nowIso = $commitIso

# Read raw (remove BOM if present)
$raw = Get-Content $DomainMapPath -Raw -Encoding UTF8
$raw = $raw.TrimStart([char]0xFEFF)

$lines = $raw -split "`r?`n"

# 1) Remove ALL duplicated metadata keys (keep version)
$filtered = New-Object System.Collections.Generic.List[string]
foreach ($line in $lines) {
    if ($line -match '^(lastUpdated|generatedAt|generator|commitSha):\s*') {
        continue
    }
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

# 3) Normalize version line formatting (keep current value, just ensure quoted)
$verLine = $filtered[$versionIdx]
$verVal = ($verLine -replace '^version:\s*', '').Trim()
$verVal = $verVal.Trim('"')
$filtered[$versionIdx] = "version: `"$verVal`""

# 4) Update "# Generated: YYYY-MM-DD" if present (deterministic by commit date)
$dateTag = $nowIso.Substring(0, 10)
for ($i = 0; $i -lt $filtered.Count; $i++) {
    if ($filtered[$i] -match '^#\s*Generated:\s*\d{4}-\d{2}-\d{2}\s*$') {
        $filtered[$i] = "# Generated: $dateTag"
    }
}

# 5) Insert canonical metadata block AFTER version line
$meta = @(
    "lastUpdated: `"$nowIso`"",
    "generatedAt: `"$nowIso`"",
    "generator: `"$GeneratorId`"",
    "commitSha: `"$commitSha`""
)

# Insert in fixed order
$insertPos = $versionIdx + 1
foreach ($m in $meta) {
    $filtered.Insert($insertPos, $m)
    $insertPos++
}

# 6) Normalize keyRoutes to strip /api/v1 prefix (if present)
for ($i = 0; $i -lt $filtered.Count; $i++) {
    $filtered[$i] = $filtered[$i] -replace '(^\s*-\s*"?)/api/v1(/[^"]*"?$)', '$1$2'
}

# 7) Write back as UTF-8 NO BOM (stable)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$outText = ($filtered -join "`n").TrimEnd() + "`n"
[System.IO.File]::WriteAllText($DomainMapPath, $outText, $utf8NoBom)

Write-Host "Domain map metadata normalized (DETERMINISTIC):"
Write-Host " - $DomainMapPath"
Write-Host " - version=$verVal"
Write-Host " - generatedAt=$nowIso (commit time)"
Write-Host " - commitSha=$commitSha"
