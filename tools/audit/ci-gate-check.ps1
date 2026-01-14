# tools/audit/ci-gate-check.ps1
# v1.2.0
# Purpose:
# - Produce machine-verifiable CI gate summary (docs/proof/gates/gate-summary.json)
# - Enforce hard rules (overall FAIL blocks merge)
# - Enforce strict blockers only when -Strict (main branch)

param(
    [switch]$Strict = $false,
    [string]$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
    if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

function Read-Json([string]$p) {
    if (!(Test-Path $p)) { return $null }
    return (Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Get-RouteKey($r) {
    # Try multiple schemas
    $m = $null
    $p = $null

    if ($r.PSObject.Properties.Name -contains "method") { $m = $r.method }
    if ($r.PSObject.Properties.Name -contains "path") { $p = $r.path }

    if ([string]::IsNullOrWhiteSpace($m) -or [string]::IsNullOrWhiteSpace($p)) {
        if ($r.PSObject.Properties.Name -contains "route") {
            # e.g. "GET /api/v1/health/ready"
            $parts = ($r.route -split "\s+", 2)
            if ($parts.Count -eq 2) { $m = $parts[0]; $p = $parts[1] }
        }
    }

    if ([string]::IsNullOrWhiteSpace($m) -or [string]::IsNullOrWhiteSpace($p)) {
        return ""
    }
    return ("{0} {1}" -f ($m.ToString().ToUpperInvariant().Trim()), $p.ToString().Trim())
}

$ProofDir = Join-Path $RootDir "docs/proof"
$LogsDir = Join-Path $ProofDir "logs"
$SecurityDir = Join-Path $ProofDir "security"
$GatesDir = Join-Path $ProofDir "gates"
$PolicyDir = Join-Path $RootDir "docs/policy"
$BackendDir = Join-Path $RootDir "backend/src"

Ensure-Dir $GatesDir

$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$strictBlockers = New-Object System.Collections.Generic.List[string]

$gates = [ordered]@{}
$metrics = [ordered]@{}

# -------------------------
# G1: Baseline SSOT
# -------------------------
$t0Path = Join-Path $LogsDir "T0-count-summary.json"
$t0 = Read-Json $t0Path
if ($null -eq $t0) {
    $failures.Add("G1: Missing T0-count-summary.json") | Out-Null
    $gates.G1 = @{ name = "Baseline SSOT"; status = "FAIL"; detail = "T0-count-summary.json missing" }
}
else {
    # tolerate multiple schemas
    $bm = $null
    $fp = $null
    try {
        if ($t0.counts.backend_modules.total) { $bm = [int]$t0.counts.backend_modules.total }
        elseif ($t0.counts.backend_modules) { $bm = [int]$t0.counts.backend_modules }
        if ($t0.counts.frontend_pages.total) { $fp = [int]$t0.counts.frontend_pages.total }
        elseif ($t0.counts.frontend_pages) { $fp = [int]$t0.counts.frontend_pages }
    }
    catch {}

    if ($null -eq $bm -or $null -eq $fp) {
        $failures.Add("G1: Invalid schema in T0-count-summary.json") | Out-Null
        $gates.G1 = @{ name = "Baseline SSOT"; status = "FAIL"; detail = "counts.backend_modules / counts.frontend_pages missing" }
    }
    else {
        $metrics.BaselineModules = $bm
        $metrics.BaselinePages = $fp
        $gates.G1 = @{ name = "Baseline SSOT"; status = "PASS"; detail = "modules=$bm, pages=$fp" }
    }
}

# -------------------------
# G2: Guard Coverage Mapping
# -------------------------
$t1Path = Join-Path $SecurityDir "T1-routes-guards-mapping.json"
$t1 = Read-Json $t1Path
if ($null -eq $t1 -or $null -eq $t1.routes -or $t1.routes.Count -eq 0) {
    $failures.Add("G2: Missing or empty T1-routes-guards-mapping.json") | Out-Null
    $gates.G2 = @{ name = "Guard Coverage"; status = "FAIL"; detail = "routes missing/empty" }
}
else {
    $routes = $t1.routes
    $total = [int]$routes.Count
    $protected = [int](($routes | Where-Object { $_.protected -eq $true }).Count)
    $unprotected = $total - $protected
    $coverage = if ($total -gt 0) { [math]::Round(($protected / $total) * 100, 1) } else { 0 }

    $metrics.TotalRoutesProd = $total
    $metrics.ProtectedRoutesProd = $protected
    $metrics.UnprotectedProd = $unprotected
    $metrics.CoverageProd = $coverage

    $gates.G2 = @{ name = "Guard Coverage"; status = "PASS"; detail = "$total routes, $coverage% protected" }
}

# -------------------------
# G3: Public Surface Policy + Validator Report
# -------------------------
$policyPath = Join-Path $PolicyDir "public-surface.policy.json"
$policy = Read-Json $policyPath
$validatorPath = Join-Path $SecurityDir "public-surface-check-report.json"
$validator = Read-Json $validatorPath

if ($null -eq $policy -or $null -eq $policy.version) {
    $failures.Add("G3: Missing/invalid public-surface.policy.json") | Out-Null
    $gates.G3 = @{ name = "Public Surface"; status = "FAIL"; detail = "public-surface.policy.json missing/invalid" }
}
else {
    $epCount = 0
    if ($policy.endpoints) { $epCount = [int]$policy.endpoints.Count }
    $metrics.PolicyVersion = $policy.version
    $metrics.PolicyEndpoints = $epCount

    $gates.G3 = @{ name = "Public Surface"; status = "PASS"; detail = "policy=$($policy.version), endpoints=$epCount" }

    if ($null -eq $validator) {
        $warnings.Add("G3a: validator report missing (public-surface-check-report.json)") | Out-Null
        $gates.G3a = @{ name = "Validator"; status = "WARN"; detail = "validator report missing" }
    }
    else {
        if ($validator.ok -eq $true -or $validator.status -eq "PASS") {
            $gates.G3a = @{ name = "Validator"; status = "PASS"; detail = "public surface validation ok=true" }
        }
        else {
            $failures.Add("G3a: Public surface validator FAIL") | Out-Null
            $gates.G3a = @{ name = "Validator"; status = "FAIL"; detail = "public surface validation failed" }
        }
    }
}

# -------------------------
# G4: Stub Modules Kill-Switch
# -------------------------
$appModulePath = Join-Path $BackendDir "app.module.ts"
if (!(Test-Path $appModulePath)) {
    $failures.Add("G4: app.module.ts missing") | Out-Null
    $gates.G4 = @{ name = "Stub Kill-Switch"; status = "FAIL"; detail = "backend/src/app.module.ts missing" }
}
else {
    $txt = Get-Content $appModulePath -Raw -Encoding UTF8
    $ok = $false
    # Require explicit env gate: process.env.ENABLE_STUB_MODULES === 'true'
    if ($txt -match "process\.env\.ENABLE_STUB_MODULES\s*===\s*'true'") { $ok = $true }
    if ($ok) {
        $metrics.StubModulesDisabled = $true
        $gates.G4 = @{ name = "Stub Kill-Switch"; status = "PASS"; detail = "ENABLE_STUB_MODULES env-gated" }
    }
    else {
        $failures.Add("G4: Stub modules are not env-gated") | Out-Null
        $gates.G4 = @{ name = "Stub Kill-Switch"; status = "FAIL"; detail = "ENABLE_STUB_MODULES guard missing" }
    }
}

# -------------------------
# G6: Domain Map Integrity (soft in PR, blocker in strict)
# -------------------------
$dmPath = Join-Path $LogsDir "T0-domain-map-check.json"
$dm = Read-Json $dmPath
if ($null -eq $dm) {
    $warnings.Add("G6: Domain map check report missing (T0-domain-map-check.json)") | Out-Null
    $gates.G6 = @{ name = "Domain Map Integrity"; status = "WARN"; detail = "report missing" }
}
else {
    if ($dm.ok -eq $true) {
        $gates.G6 = @{ name = "Domain Map Integrity"; status = "PASS"; detail = "all referenced modules/pages exist" }
    }
    else {
        $warnings.Add("G6: Domain map has missing references (modules/pages)") | Out-Null
        $gates.G6 = @{ name = "Domain Map Integrity"; status = "WARN"; detail = "missingModules=$($dm.counts.missingModules), missingPages=$($dm.counts.missingPages)" }
        if ($Strict) {
            $strictBlockers.Add("DomainMapMissingReferences > 0") | Out-Null
        }
    }
}

# -------------------------
# G5: Strict blocker = Unprotected routes not allowlisted
# -------------------------
if ($t1 -and $t1.routes) {
    $policySet = New-Object System.Collections.Generic.HashSet[string]
    if ($policy -and $policy.endpoints) {
        foreach ($e in $policy.endpoints) {
            if ($e.method -and $e.path) {
                $policySet.Add(("{0} {1}" -f ($e.method.ToString().ToUpperInvariant().Trim()), $e.path.ToString().Trim())) | Out-Null
            }
        }
    }

    $routes = $t1.routes
    $unprotected = @($routes | Where-Object { $_.protected -ne $true })
    $allowlisted = 0
    $notAllowlisted = 0

    foreach ($r in $unprotected) {
        $k = Get-RouteKey $r
        $isPublic = $false
        if ($r.PSObject.Properties.Name -contains "public") { if ($r.public -eq $true) { $isPublic = $true } }

        if ($isPublic) { $allowlisted++; continue }
        if ($k -ne "" -and $policySet.Contains($k)) { $allowlisted++; continue }
        $notAllowlisted++
    }

    $metrics.UnprotectedNotAllowlistedProd = $notAllowlisted
    $metrics.UnprotectedAllowlistedProd = $allowlisted

    # Threshold gate (non-strict informational)
    $threshold = 999999
    if ($metrics.UnprotectedProd -le $threshold) {
        $gates.G5 = @{ name = "Unprotected Threshold"; status = "PASS"; detail = "$($metrics.UnprotectedProd) within threshold" }
    }
    else {
        $failures.Add("G5: Unprotected routes exceed threshold") | Out-Null
        $gates.G5 = @{ name = "Unprotected Threshold"; status = "FAIL"; detail = "$($metrics.UnprotectedProd) exceeds threshold" }
    }

    if ($notAllowlisted -gt 0) {
        $strictBlockers.Add("UnprotectedNotAllowlistedProd > 0 ($notAllowlisted routes)") | Out-Null
    }
}

# -------------------------
# Emit summary
# -------------------------
$overall = $(if ($failures.Count -gt 0) { "FAIL" } else { "PASS" })
$strictMode = $(if ($strictBlockers.Count -gt 0) { "BLOCKED" } else { "PASS" })
$blockedReason = $(if ($strictMode -eq "BLOCKED") { ($strictBlockers -join "; ") } else { "" })

$summary = [ordered]@{
    version       = "1.2.0"
    generatedAt   = (Get-Date).ToString("o")
    generator     = "tools/audit/ci-gate-check.ps1@1.2.0"
    overall       = $overall
    strictMode    = $strictMode
    blockedReason = $blockedReason
    strictEnabled = $Strict.IsPresent
    metrics       = $metrics
    gates         = $gates
    failures      = $failures
    warnings      = $warnings
    sources       = @{
        baseline        = "docs/proof/logs/T0-count-summary.json"
        routeMapping    = "docs/proof/security/T1-routes-guards-mapping.json"
        publicPolicy    = "docs/policy/public-surface.policy.json"
        validatorReport = "docs/proof/security/public-surface-check-report.json"
        domainMapReport = "docs/proof/logs/T0-domain-map-check.json"
    }
}

$outSummary = Join-Path $GatesDir "gate-summary.json"
$outReport = Join-Path $GatesDir "gate-summary.md"

($summary | ConvertTo-Json -Depth 20) | Set-Content -Path $outSummary -Encoding UTF8

$md = @"
# CI Gate Summary

- GeneratedAt: ``$($summary.generatedAt)``
- Overall: **$overall**
- StrictEnabled: ``$($summary.strictEnabled)``
- StrictMode: **$strictMode**
- BlockedReason: ``$blockedReason``

## Gates
$(($gates.GetEnumerator() | Sort-Object Name | ForEach-Object { "- **$($_.Key)** [$($_.Value.status)]: $($_.Value.detail)" }) -join "`n")

## Metrics
$(($metrics.GetEnumerator() | Sort-Object Name | ForEach-Object { "- $($_.Key): $($_.Value)" }) -join "`n")

## Failures
$(if ($failures.Count -eq 0) { "- (none)" } else { ($failures | ForEach-Object { "- $_" }) -join "`n" })

## Warnings
$(if ($warnings.Count -eq 0) { "- (none)" } else { ($warnings | ForEach-Object { "- $_" }) -join "`n" })
"@

Set-Content -Path $outReport -Value $md -Encoding UTF8

Write-Host "========================================"
Write-Host " CI Gate Summary"
Write-Host "========================================"
Write-Host "Overall: $overall"
Write-Host "StrictEnabled: $($summary.strictEnabled)"
Write-Host "StrictMode: $strictMode"
if ($blockedReason) { Write-Host "BlockedReason: $blockedReason" }
Write-Host "Summary: $outSummary"
Write-Host "Report : $outReport"

if ($overall -eq "FAIL") { exit 1 }
if ($Strict -and $strictMode -eq "BLOCKED") { exit 1 }
exit 0
