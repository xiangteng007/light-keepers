# tools/audit/ci-gate-check.ps1
# Verifiable Engineering Pipeline — CI Gate Check (Authoritative Gate Summary)
# VERSION: 1.3.0
# SEC-T9.1 Hardening + SEC-SD.1 Soft-delete:
# - R1: Strict mode fail-on-WARN (any WARN = overall FAIL)
# - R4: protected field missing = fail-closed (UnknownProtectionCount)
# - SEC-SD.1: Soft-delete gate (G7) - strict mode requires PASS
param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [switch]$Strict = $false
)

$ErrorActionPreference = "Stop"

# -------------------------
# Helpers
# -------------------------
function NowIso() { (Get-Date).ToString("o") }

function Ensure-Dir([string]$path) {
    $dir = Split-Path -Parent $path
    if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
}

function Read-Json([string]$path) {
    if (!(Test-Path $path)) { throw "Missing file: $path" }
    return (Get-Content $path -Raw | ConvertFrom-Json)
}

function Write-Json([object]$obj, [string]$path) {
    Ensure-Dir $path
    ($obj | ConvertTo-Json -Depth 20) | Out-File -FilePath $path -Encoding UTF8
}

function Write-Text([string]$text, [string]$path) {
    Ensure-Dir $path
    $text | Out-File -FilePath $path -Encoding UTF8
}

function Try-GitSha([string]$root) {
    try {
        $sha = (git -C $root rev-parse HEAD 2>$null).Trim()
        if ($sha) { return $sha }
    }
    catch {}
    return $null
}

function Normalize-Path([string]$p) {
    if (-not $p) { return $p }
    $x = $p.Trim()
    if ($x.Length -gt 1 -and $x.EndsWith("/")) { $x = $x.TrimEnd("/") }
    $x = [regex]::Replace($x, "\{[^}]+\}", ":param")
    $x = [regex]::Replace($x, ":[^/]+", ":param")
    return $x
}

function Normalize-Method([string]$m) {
    if (-not $m) { return $m }
    return $m.Trim().ToUpper()
}

function Route-Key([string]$method, [string]$path) {
    return ("{0} {1}" -f (Normalize-Method $method), (Normalize-Path $path))
}

function Get-RouteMethod($r) {
    foreach ($k in @("method", "httpMethod", "verb")) { if ($null -ne $r.$k) { return [string]$r.$k } }
    return $null
}
function Get-RoutePath($r) {
    foreach ($k in @("path", "route", "url", "fullPath")) { if ($null -ne $r.$k) { return [string]$r.$k } }
    return $null
}

# SEC-T9.1 R4: protected field missing = fail-closed (return $null to indicate missing)
function Get-RouteProtected($r) {
    if ($null -ne $r.protected) { return [bool]$r.protected }
    if ($null -ne $r.isProtected) { return [bool]$r.isProtected }
    if ($null -ne $r.metadata) {
        if ($null -ne $r.metadata.protected) { return [bool]$r.metadata.protected }
        if ($null -ne $r.metadata.isProtected) { return [bool]$r.metadata.isProtected }
    }
    # SEC-T9.1 R4: return $null to indicate missing (fail-closed = treated as unprotected)
    return $null
}

function Get-GlobalAuthGuardActive($mapping) {
    # Check top level first
    foreach ($k in @("globalAuthGuardActive", "GlobalAuthGuardActive")) {
        if ($null -ne $mapping.$k) { return [bool]$mapping.$k }
    }
    # Check summary subobject (scan-routes-guards.ps1 outputs it there)
    if ($null -ne $mapping.summary) {
        foreach ($k in @("globalAuthGuardActive", "GlobalAuthGuardActive")) {
            if ($null -ne $mapping.summary.$k) { return [bool]$mapping.summary.$k }
        }
    }
    return $null
}

function Get-GlobalGuardsDetected($mapping) {
    # Check top level first
    foreach ($k in @("globalGuardsDetected", "GlobalGuardsDetected")) {
        if ($null -ne $mapping.$k) { return @($mapping.$k) }
    }
    # Check summary subobject
    if ($null -ne $mapping.summary) {
        foreach ($k in @("globalGuardsDetected", "GlobalGuardsDetected")) {
            if ($null -ne $mapping.summary.$k) { return @($mapping.summary.$k) }
        }
    }
    return @()
}

function Gate([string]$name, [string]$status, [string]$detail) {
    return [ordered]@{ name = $name; status = $status; detail = $detail }
}

# -------------------------
# Paths (authoritative)
# -------------------------
$baselinePath = Join-Path $RootDir "docs/proof/logs/T0-count-summary.json"
$mappingPath = Join-Path $RootDir "docs/proof/security/T1-routes-guards-mapping.json"
$policyPath = Join-Path $RootDir "docs/policy/public-surface.policy.json"
$validatorPath = Join-Path $RootDir "docs/proof/security/public-surface-check-report.json"
$appGuardPath = Join-Path $RootDir "docs/proof/security/T9-app-guard-registration-report.json"
$domainMapCheck = Join-Path $RootDir "docs/proof/logs/T0-domain-map-check.json"
$softDeletePath = Join-Path $RootDir "docs/proof/security/soft-delete-report.json"

$outGateJson = Join-Path $RootDir "docs/proof/gates/gate-summary.json"
$outGateMd = Join-Path $RootDir "docs/proof/gates/gate-summary.md"
$outReportJson = Join-Path $RootDir "docs/proof/gates/ci-gate-check-report.json"
$outReportMd = Join-Path $RootDir "docs/proof/gates/ci-gate-check-report.md"

$generatedAt = NowIso
$commitSha = Try-GitSha $RootDir

# -------------------------
# Load inputs
# -------------------------
$gates = [ordered]@{}
$failures = @()
$warnings = @()

$baseline = $null
$mapping = $null
$policy = $null
$validator = $null
$appGuard = $null
$domainOk = $null

try { $baseline = Read-Json $baselinePath } catch { $failures += $_.Exception.Message }
try { $mapping = Read-Json $mappingPath } catch { $failures += $_.Exception.Message }
try { $policy = Read-Json $policyPath } catch { $failures += $_.Exception.Message }
try { $validator = Read-Json $validatorPath } catch { $warnings += "Missing validator report: $validatorPath" }
try { $appGuard = Read-Json $appGuardPath } catch { $warnings += "Missing app guard report: $appGuardPath" }
try { $domainOk = Read-Json $domainMapCheck } catch { $warnings += "Missing domain-map check report: $domainMapCheck" }
try { $softDelete = Read-Json $softDeletePath } catch { $warnings += "Missing soft-delete report: $softDeletePath"; $softDelete = $null }

# -------------------------
# Compute metrics
# -------------------------
$moduleCount = $null
$pageCount = $null
if ($baseline) {
    foreach ($k in @("moduleCount", "modules", "modulesCount")) {
        if ($null -ne $baseline.$k) { $moduleCount = [int]$baseline.$k; break }
    }
    foreach ($k in @("pageCount", "pages", "pagesCount")) {
        if ($null -ne $baseline.$k) { $pageCount = [int]$baseline.$k; break }
    }
    # try nested counts
    if ($null -eq $moduleCount -and $null -ne $baseline.counts) {
        if ($null -ne $baseline.counts.backend_modules) {
            if ($null -ne $baseline.counts.backend_modules.total) { $moduleCount = [int]$baseline.counts.backend_modules.total }
            else { $moduleCount = [int]$baseline.counts.backend_modules }
        }
    }
    if ($null -eq $pageCount -and $null -ne $baseline.counts) {
        if ($null -ne $baseline.counts.frontend_pages) {
            if ($null -ne $baseline.counts.frontend_pages.total) { $pageCount = [int]$baseline.counts.frontend_pages.total }
            else { $pageCount = [int]$baseline.counts.frontend_pages }
        }
    }
}

$routes = @()
if ($mapping) {
    if ($null -ne $mapping.routes) { $routes = @($mapping.routes) }
    elseif ($null -ne $mapping.data -and $null -ne $mapping.data.routes) { $routes = @($mapping.data.routes) }
}

$totalRoutesProd = $routes.Count
$protectedRoutesProd = 0
$unprotectedRoutes = @()
$unknownProtectionCount = 0  # SEC-T9.1 R4: count routes with missing protected field

foreach ($r in $routes) {
    $isProtected = Get-RouteProtected $r
    if ($null -eq $isProtected) {
        # SEC-T9.1 R4: fail-closed = treat as unprotected
        $unknownProtectionCount++
        $unprotectedRoutes += $r
    }
    elseif ($isProtected) {
        $protectedRoutesProd++
    }
    else {
        $unprotectedRoutes += $r
    }
}

$coverageProd = 0
if ($totalRoutesProd -gt 0) {
    $coverageProd = [math]::Round(($protectedRoutesProd / $totalRoutesProd) * 100, 1)
}

# Policy allowlist keys
$policyEndpoints = 0
$policyVersion = $null
$policyName = $null
$allowKeys = @{}

if ($policy) {
    $policyVersion = [string]$policy.version
    $policyName = [string]$policy.policy
    if (-not $policyName) { $policyName = "Policy-A" }

    if ($null -ne $policy.endpoints) {
        foreach ($ep in @($policy.endpoints)) {
            if (-not $ep.method -or -not $ep.path) { continue }
            $k = Route-Key $ep.method $ep.path
            if (-not $allowKeys.ContainsKey($k)) { $allowKeys[$k] = $true }
        }
    }
    $policyEndpoints = $allowKeys.Keys.Count
}

# Compare unprotected vs allowlist
$unprotectedAllowlistedProd = 0
$unprotectedNotAllowlistedProd = @()

foreach ($r in $unprotectedRoutes) {
    $m = Get-RouteMethod $r
    $p = Get-RoutePath $r
    if (-not $m -or -not $p) { continue }
    $k = Route-Key $m $p
    if ($allowKeys.ContainsKey($k)) { $unprotectedAllowlistedProd++ }
    else { $unprotectedNotAllowlistedProd += $k }
}

$unprotectedProd = $unprotectedRoutes.Count
$notAllowlistedCount = $unprotectedNotAllowlistedProd.Count

# Stub kill-switch
$stubModulesDisabled = $true
if ($env:ENABLE_STUB_MODULES) {
    if ($env:ENABLE_STUB_MODULES.ToLower() -in @("1", "true", "yes", "on")) { $stubModulesDisabled = $false }
}

# Global auth guard evidence (mapping + appGuard report)
$globalAuthGuardActive = Get-GlobalAuthGuardActive $mapping
$globalGuardsDetected = Get-GlobalGuardsDetected $mapping
$globalAuthGuardRegistered = $null
if ($appGuard -and $null -ne $appGuard.globalAuthGuardRegistered) {
    $globalAuthGuardRegistered = [bool]$appGuard.globalAuthGuardRegistered
}

# Validator ok
$validatorOk = $null
if ($validator -and $null -ne $validator.ok) { $validatorOk = [bool]$validator.ok }

# Domain map ok
$domainMapOk = $null
if ($domainOk -and $null -ne $domainOk.ok) { $domainMapOk = [bool]$domainOk.ok }

# Strict evaluation
$strictMode = "PASS"
$blockedReason = $null
if ($notAllowlistedCount -gt 0) {
    $strictMode = "BLOCKED"
    $blockedReason = "UnprotectedNotAllowlistedProd = $notAllowlistedCount :: " + (($unprotectedNotAllowlistedProd | Select-Object -First 10) -join ", ")
}

# -------------------------
# Gates
# -------------------------
# G1: Baseline SSOT
if ($baseline -and $moduleCount -gt 0) {
    $gates["G1"] = Gate "Baseline SSOT" "PASS" "modules=$moduleCount, pages=$pageCount"
}
else {
    $gates["G1"] = Gate "Baseline SSOT" "FAIL" "Missing or invalid baseline: $baselinePath"
}

# G2: Guard Coverage mapping present
if ($mapping -and $totalRoutesProd -gt 0) {
    $gates["G2"] = Gate "Guard Coverage" "PASS" "$totalRoutesProd routes, $coverageProd% protected"
}
else {
    $gates["G2"] = Gate "Guard Coverage" "FAIL" "Missing or invalid mapping: $mappingPath"
}

# G2a: APP_GUARD registration report
if ($appGuard -and $globalAuthGuardRegistered -eq $true) {
    $gates["G2a"] = Gate "App Guard Registration" "PASS" "GlobalAuthGuard registered as APP_GUARD"
}
elseif ($appGuard) {
    $gates["G2a"] = Gate "App Guard Registration" "FAIL" "T9 report present but guard not registered"
}
else {
    $gates["G2a"] = Gate "App Guard Registration" "WARN" "Missing T9 report (non-blocking unless Strict)"
}

# G2b: Global guard applied (scanner) - SEC-T9.1 R3
if ($globalAuthGuardActive -eq $true) {
    $gates["G2b"] = Gate "Global Guard Coverage Applied" "PASS" "globalAuthGuardActive=true"
}
elseif ($null -eq $globalAuthGuardActive) {
    # SEC-T9.1 R3: missing field = WARN (in Strict mode, fail-on-warn will catch this)
    $gates["G2b"] = Gate "Global Guard Coverage Applied" "WARN" "globalAuthGuardActive not present in mapping schema"
}
else {
    $gates["G2b"] = Gate "Global Guard Coverage Applied" "FAIL" "globalAuthGuardActive=false"
}

# G3: Public Surface policy
if ($policy -and $policyEndpoints -gt 0) {
    $gates["G3"] = Gate "Public Surface" "PASS" "$policyName, endpoints=$policyEndpoints, version=$policyVersion"
}
else {
    $gates["G3"] = Gate "Public Surface" "FAIL" "Missing/empty policy endpoints: $policyPath"
}

# G3a: Validator ok
if ($validatorOk -eq $true) {
    $gates["G3a"] = Gate "Validator" "PASS" "public surface validation ok=true"
}
elseif ($validator) {
    $gates["G3a"] = Gate "Validator" "FAIL" "validator ok=false"
}
else {
    $gates["G3a"] = Gate "Validator" "WARN" "validator report missing (non-blocking unless Strict)"
}

# G4: Stub kill-switch
if ($stubModulesDisabled) {
    $gates["G4"] = Gate "Stub Kill-Switch" "PASS" "ENABLE_STUB_MODULES disabled"
}
else {
    $gates["G4"] = Gate "Stub Kill-Switch" "FAIL" "ENABLE_STUB_MODULES enabled in CI environment"
}

# G5: Unprotected vs allowlist
if ($notAllowlistedCount -eq 0) {
    $gates["G5"] = Gate "Unprotected Threshold" "PASS" "$unprotectedProd unprotected (all allowlisted)"
}
else {
    $gates["G5"] = Gate "Unprotected Threshold" "FAIL" "$notAllowlistedCount not allowlisted"
}

# G5a: Unknown Protection Count - SEC-T9.1 R4
if ($unknownProtectionCount -eq 0) {
    $gates["G5a"] = Gate "Protection Field Integrity" "PASS" "all routes have protected field"
}
else {
    $gates["G5a"] = Gate "Protection Field Integrity" "WARN" "$unknownProtectionCount routes missing protected field (fail-closed)"
}

# G6: Domain map integrity
if ($domainMapOk -eq $true) {
    $gates["G6"] = Gate "Domain Map Integrity" "PASS" "all referenced modules/pages exist"
}
elseif ($domainOk) {
    $gates["G6"] = Gate "Domain Map Integrity" "FAIL" "domain-map check ok=false"
}
else {
    $gates["G6"] = Gate "Domain Map Integrity" "WARN" "domain-map check missing (non-blocking unless Strict)"
}

# G7: Soft-delete (SEC-SD.1)
$softDeleteStatus = $null
if ($softDelete) { $softDeleteStatus = $softDelete.status }

if ($softDeleteStatus -eq "PASS") {
    $gates["G7"] = Gate "Soft-delete (SEC-SD.1)" "PASS" "Core entities have deletedAt, soft-delete verified"
}
elseif ($softDeleteStatus -eq "WARN") {
    $gates["G7"] = Gate "Soft-delete (SEC-SD.1)" "WARN" "Soft-delete report status=WARN (needs softRemove usage)"
}
elseif ($softDelete) {
    $gates["G7"] = Gate "Soft-delete (SEC-SD.1)" "FAIL" "Soft-delete report status=$softDeleteStatus"
}
else {
    $gates["G7"] = Gate "Soft-delete (SEC-SD.1)" "WARN" "soft-delete report missing (non-blocking unless Strict)"
}

# STRICT gate (computed)
if ($strictMode -eq "PASS") {
    $gates["STRICT"] = Gate "Strict Mode Check" "PASS" "UnprotectedNotAllowlistedProd = 0"
}
else {
    $gates["STRICT"] = Gate "Strict Mode Check" "BLOCKED" $blockedReason
}

# -------------------------
# Overall result - SEC-T9.1 R1: Strict fail-on-WARN
# -------------------------
$overall = "PASS"

if ($Strict) {
    # SEC-T9.1 R1: In strict mode, any non-PASS (WARN/FAIL/BLOCKED) = overall FAIL
    foreach ($k in $gates.Keys) {
        if ($gates[$k].status -ne "PASS") {
            $overall = "FAIL"
            break
        }
    }
    # strict semantic rule
    if ($strictMode -ne "PASS") { $overall = "FAIL" }
}
else {
    # Non-strict: only FAIL/BLOCKED causes overall FAIL (WARN is allowed)
    foreach ($k in $gates.Keys) {
        if ($gates[$k].status -in @("FAIL", "BLOCKED")) {
            $overall = "FAIL"
            break
        }
    }
}

# -------------------------
# Write outputs (JSON + MD) — authoritative
# -------------------------
$gateSummary = [ordered]@{
    version       = "1.3.0"
    generatedAt   = $generatedAt
    generator     = "tools/audit/ci-gate-check.ps1@1.3.0"
    commitSha     = $commitSha
    overall       = $overall
    strictEnabled = [bool]$Strict
    strictMode    = $strictMode
    blockedReason = $blockedReason
    metrics       = [ordered]@{
        BaselineModules               = $moduleCount
        BaselinePages                 = $pageCount
        TotalRoutesProd               = $totalRoutesProd
        ProtectedRoutesProd           = $protectedRoutesProd
        CoverageProd                  = $coverageProd
        UnprotectedProd               = $unprotectedProd
        UnprotectedAllowlistedProd    = $unprotectedAllowlistedProd
        UnprotectedNotAllowlistedProd = $notAllowlistedCount
        UnknownProtectionCount        = $unknownProtectionCount
        PolicyEndpoints               = $policyEndpoints
        PolicyVersion                 = $policyVersion
        StubModulesDisabled           = $stubModulesDisabled
        GlobalAuthGuardActive         = $globalAuthGuardActive
        GlobalGuardsDetected          = $globalGuardsDetected
        GlobalAuthGuardRegistered     = $globalAuthGuardRegistered
        ValidatorOk                   = $validatorOk
        DomainMapOk                   = $domainMapOk
    }
    gates         = $gates
    sources       = [ordered]@{
        baseline     = "docs/proof/logs/T0-count-summary.json"
        routeMapping = "docs/proof/security/T1-routes-guards-mapping.json"
        publicPolicy = "docs/policy/public-surface.policy.json"
        validator    = "docs/proof/security/public-surface-check-report.json"
        appGuard     = "docs/proof/security/T9-app-guard-registration-report.json"
        domainMap    = "docs/proof/logs/T0-domain-map-check.json"
        softDelete   = "docs/proof/security/soft-delete-report.json"
    }
}

# Detailed report includes failing keys list
$report = [ordered]@{
    generatedAt                   = $generatedAt
    strictEnabled                 = [bool]$Strict
    overall                       = $overall
    strictMode                    = $strictMode
    blockedReason                 = $blockedReason
    unprotectedNotAllowlistedKeys = @($unprotectedNotAllowlistedProd | Sort-Object -Unique)
    gateSummary                   = $gateSummary
}

Write-Json $gateSummary $outGateJson
Write-Json $report $outReportJson

# Markdown summary must match JSON
$md = @()
$md += "# CI Gate Summary"
$md += ""
$md += "- GeneratedAt: ``$generatedAt``"
$md += "- Overall: **$overall**"
$md += "- StrictEnabled: ``$([bool]$Strict)``"
$md += "- StrictMode: **$strictMode**"
$md += "- BlockedReason: ``$(if($blockedReason){$blockedReason}else{''})``"
$md += ""
$md += "## Gates"
foreach ($k in $gates.Keys) {
    $g = $gates[$k]
    $md += "- **$k** [$($g.status)]: $($g.detail)"
}
$md += ""
$md += "## Metrics"
$md += "- BaselineModules: $moduleCount"
$md += "- BaselinePages: $pageCount"
$md += "- CoverageProd: $coverageProd"
$md += "- PolicyEndpoints: $policyEndpoints"
$md += "- PolicyVersion: $policyVersion"
$md += "- ProtectedRoutesProd: $protectedRoutesProd"
$md += "- TotalRoutesProd: $totalRoutesProd"
$md += "- UnprotectedProd: $unprotectedProd"
$md += "- UnprotectedAllowlistedProd: $unprotectedAllowlistedProd"
$md += "- UnprotectedNotAllowlistedProd: $notAllowlistedCount"
$md += "- UnknownProtectionCount: $unknownProtectionCount"
$md += ""
$md += "## Failures"
if ($unprotectedNotAllowlistedProd.Count -gt 0) {
    foreach ($x in ($unprotectedNotAllowlistedProd | Select-Object -First 50)) { $md += "- $x" }
}
else {
    $md += "- (none)"
}
$md += ""
$md += "## Warnings"
if ($warnings.Count -gt 0) {
    foreach ($w in $warnings) { $md += "- $w" }
}
else {
    $md += "- (none)"
}

Write-Text ($md -join "`n") $outGateMd
Write-Text ($md -join "`n") $outReportMd

Write-Host "Gate Summary written:"
Write-Host " - $outGateJson"
Write-Host " - $outGateMd"
Write-Host " - $outReportJson"
Write-Host " - $outReportMd"
Write-Host "Overall: $overall | StrictEnabled: $([bool]$Strict) | StrictMode: $strictMode"

if ($Strict -and $overall -ne "PASS") {
    throw "CI Gate FAILED in STRICT mode. blockedReason=$blockedReason"
}
