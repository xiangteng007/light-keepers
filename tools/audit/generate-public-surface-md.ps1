# tools/audit/generate-public-surface-md.ps1
# Purpose: Generate public-surface.md from policy.json SSOT
# Output: docs/proof/security/public-surface.md (AUTO-GENERATED, stable, no timestamps)
#
# Usage:
#   pwsh tools/audit/generate-public-surface-md.ps1

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$PolicyPath = "docs/policy/public-surface.policy.json",
    [string]$OutMdPath = "docs/proof/security/public-surface.md"
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$path) {
    $dir = Split-Path -Parent $path
    if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
}

function Sha256([string]$path) {
    if (!(Test-Path $path)) { throw "Missing file: $path" }
    return (Get-FileHash -Algorithm SHA256 -Path $path).Hash.ToLower()
}

$policyAbs = Join-Path $RootDir $PolicyPath
$outAbs = Join-Path $RootDir $OutMdPath

if (!(Test-Path $policyAbs)) { throw "Missing policy JSON: $policyAbs" }

$policyJson = Get-Content $policyAbs -Raw
$policy = $policyJson | ConvertFrom-Json

if ($null -eq $policy.endpoints) { 
    Write-Host "Warning: Policy JSON has no endpoints array, generating empty table" -ForegroundColor Yellow
    $policy | Add-Member -NotePropertyName endpoints -NotePropertyValue @() -Force
}

$sha = Sha256 $policyAbs
$policyName = if ($policy.policy) { [string]$policy.policy } else { "Policy-A" }
$version = if ($policy.version) { [string]$policy.version } else { "1.0" }

# Normalize + stable sort
$eps = @($policy.endpoints) | ForEach-Object {
    [pscustomobject]@{
        method        = ([string]$_.method).Trim().ToUpper()
        path          = ([string]$_.path).Trim()
        reason        = if ($_.reason) { [string]$_.reason } else { "" }
        dataExposure  = if ($_.dataExposure) { [string]$_.dataExposure } else { "" }
        throttle      = $(if ($_.throttle) { 
                if ($_.throttle -is [string]) { $_.throttle } 
                else { "$($_.throttle.limit)/$($_.throttle.ttl)ms" }
            }
            else { "" })
        smokeRequired = if ($null -ne $_.smokeRequired) { [bool]$_.smokeRequired } else { $false }
    }
} | Sort-Object path, method

# Build Markdown (NO timestamps; stable)
$md = @()
$md += "<!-- AUTO-GENERATED FILE. DO NOT EDIT MANUALLY. -->"
$md += "<!-- source: $PolicyPath -->"
$md += "<!-- policySha256: $sha -->"
$md += ""
$md += "# Public Surface Inventory (AUTO-GENERATED)"
$md += ""
$md += "> **WARNING**: This file is auto-generated from ``$PolicyPath``."
$md += "> Do NOT edit manually. Run ``pwsh tools/audit/generate-public-surface-md.ps1`` to regenerate."
$md += ""
$md += "- Policy: **$policyName**"
$md += "- Version: **$version**"
$md += "- SSOT: ``$PolicyPath``"
$md += "- Endpoints: **$($eps.Count)**"
$md += ""
$md += "---"
$md += ""
$md += "## Rules"
$md += ""
if ($policyName -eq "Policy-B") {
    $md += "- **Public Definition**: Only ``@Public()`` or ``@RequiredLevel(0)`` are considered public."
}
else {
    $md += "- **Public Definition**: Allowlisted endpoints must have ``@Public()`` (with throttling recommended)."
}
$md += "- **Enforcement**: Unprotected routes not in allowlist are CI gate violations."
$md += "- **Requirements**: Each public endpoint must specify: dataExposure, throttle, smokeRequired."
$md += ""
$md += "---"
$md += ""
$md += "## Endpoints"
$md += ""

if ($eps.Count -eq 0) {
    $md += "> **Phase 0**: No endpoints in allowlist. All unprotected routes are reported as warnings."
    $md += "> Add ``@Public()`` decorator to code, then add endpoint to policy.json."
}
else {
    $md += "| Endpoint | Intent | Exposure | Throttle | Smoke |"
    $md += "|----------|--------|----------|----------|-------|"
    foreach ($e in $eps) {
        $ep = "``{0} {1}``" -f $e.method, $e.path
        $intent = if ($e.reason) { $e.reason } else { "-" }
        $ex = if ($e.dataExposure) { $e.dataExposure } else { "-" }
        $th = if ($e.throttle) { $e.throttle } else { "-" }
        $sm = if ($e.smokeRequired) { "required" } else { "optional" }
        $md += "| $ep | $intent | $ex | $th | $sm |"
    }
}

$md += ""
$md += "---"
$md += ""
$md += "## Stub Modules Blacklist"
$md += ""
if ($null -ne $policy.stubModulesBlacklist -and $policy.stubModulesBlacklist.Count -gt 0) {
    $md += "The following modules are **disabled by default** in production (``ENABLE_STUB_MODULES=false``):"
    $md += ""
    foreach ($stub in $policy.stubModulesBlacklist) {
        $md += "- ``$stub``"
    }
}
else {
    $md += "> No stub modules blacklisted."
}

$md += ""
$md += "---"
$md += ""
$md += "## Verification"
$md += ""
$md += '```powershell'
$md += "# Regenerate this file"
$md += "pwsh tools/audit/generate-public-surface-md.ps1"
$md += ""
$md += "# Validate (strict mode)"
$md += "pwsh tools/audit/validate-public-surface.ps1 -Strict"
$md += ""
$md += "# Full CI gate check"
$md += "pwsh tools/audit/ci-gate-check.ps1 -Strict"
$md += '```'
$md += ""

Ensure-Dir $outAbs
($md -join "`n") | Out-File -FilePath $outAbs -Encoding UTF8 -NoNewline

Write-Host "Generated: $OutMdPath" -ForegroundColor Green
Write-Host "  Policy: $policyName v$version"
Write-Host "  Endpoints: $($eps.Count)"
Write-Host "  SHA256: $sha"
