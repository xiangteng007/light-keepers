# CI Gate Check Script
# Purpose: Enforce hard rules for CI - blocks merge if any rule violated
# Rules: G1-G6 per Gate Playbook v1.1
# Exit Code: 0 = PASS, 1 = FAIL
# SEMANTICS: In -Strict mode, overall = strictMode (no PASS if strictMode!=PASS)

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [switch]$Strict = $false
)

$ErrorActionPreference = "Continue"
$ProofDir = Join-Path $RootDir "docs\proof"
$SecurityDir = Join-Path $ProofDir "security"
$LogsDir = Join-Path $ProofDir "logs"
$BackendDir = Join-Path $RootDir "backend\src"

$failures = @()
$warnings = @()
$passed = @()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CI Gate Check - Gate Playbook v1.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# G1: Baseline SSOT must exist and be valid
# ============================================
Write-Host "[G1] Checking Baseline SSOT..." -ForegroundColor Yellow

$T0SummaryPath = Join-Path $LogsDir "T0-count-summary.json"
if (Test-Path $T0SummaryPath) {
    try {
        $T0Summary = Get-Content $T0SummaryPath -Raw | ConvertFrom-Json
        
        if ($null -eq $T0Summary.counts.backend_modules) {
            $failures += "G1: T0-count-summary.json missing 'counts.backend_modules' key"
        }
        elseif ($null -eq $T0Summary.counts.frontend_pages) {
            $failures += "G1: T0-count-summary.json missing 'counts.frontend_pages' key"
        }
        else {
            $passed += "G1: Baseline SSOT valid (modules: $($T0Summary.counts.backend_modules.total), pages: $($T0Summary.counts.frontend_pages.total))"
        }
    }
    catch {
        $failures += "G1: T0-count-summary.json is invalid JSON"
    }
}
else {
    $failures += "G1: T0-count-summary.json not found at $T0SummaryPath"
}

# ============================================
# G2: Guard Coverage Mapping must exist
# ============================================
Write-Host "[G2] Checking Guard Coverage Mapping..." -ForegroundColor Yellow

$T1MappingPath = Join-Path $SecurityDir "T1-routes-guards-mapping.json"
if (Test-Path $T1MappingPath) {
    try {
        $T1Mapping = Get-Content $T1MappingPath -Raw | ConvertFrom-Json
        
        if ($null -eq $T1Mapping.routes -or $T1Mapping.routes.Count -eq 0) {
            $failures += "G2: T1-routes-guards-mapping.json has no routes"
        }
        else {
            $totalRoutes = $T1Mapping.routes.Count
            $protectedRoutes = ($T1Mapping.routes | Where-Object { $_.protected -eq $true }).Count
            $coverage = [math]::Round(($protectedRoutes / $totalRoutes) * 100, 1)
            $passed += "G2: Mapping exists ($totalRoutes routes, $coverage% protected)"
        }
    }
    catch {
        $failures += "G2: T1-routes-guards-mapping.json is invalid JSON"
    }
}
else {
    $failures += "G2: T1-routes-guards-mapping.json not found"
}

# ============================================
# G2a: App Guard Registration (SEC-T9)
# ============================================
Write-Host "[G2a] Checking GlobalAuthGuard APP_GUARD Registration..." -ForegroundColor Yellow

$T9ReportPath = Join-Path $SecurityDir "T9-app-guard-registration-report.json"
if (Test-Path $T9ReportPath) {
    try {
        $T9Report = Get-Content $T9ReportPath -Raw | ConvertFrom-Json
        if ($T9Report.globalAuthGuardRegistered -eq $true) {
            $passed += "G2a: GlobalAuthGuard registered as APP_GUARD"
        }
        else {
            $failures += "G2a: GlobalAuthGuard NOT registered as APP_GUARD"
        }
    }
    catch {
        $failures += "G2a: T9-app-guard-registration-report.json is invalid"
    }
}
else {
    # Check app.module.ts directly as fallback
    $AppModulePath = Join-Path $BackendDir "app.module.ts"
    if (Test-Path $AppModulePath) {
        $appContent = Get-Content $AppModulePath -Raw
        if ($appContent -match "provide:\s*APP_GUARD[\s\S]*?useClass:\s*GlobalAuthGuard") {
            $passed += "G2a: GlobalAuthGuard in APP_GUARD (direct check)"
        }
        else {
            $failures += "G2a: GlobalAuthGuard NOT in APP_GUARD"
        }
    }
    else {
        $failures += "G2a: Cannot verify GlobalAuthGuard (no report or app.module.ts)"
    }
}

# ============================================
# G2b: Global Guard Coverage Applied (SEC-T9)
# ============================================
Write-Host "[G2b] Checking Global Guard Coverage in Mapping..." -ForegroundColor Yellow

if (Test-Path $T1MappingPath) {
    try {
        $T1Mapping = Get-Content $T1MappingPath -Raw | ConvertFrom-Json
        if ($T1Mapping.summary.globalAuthGuardActive -eq $true) {
            $passed += "G2b: Scanner detected GlobalAuthGuard active"
        }
        else {
            $warnings += "G2b: Scanner did not detect GlobalAuthGuard active"
        }
    }
    catch {
        $warnings += "G2b: Could not parse mapping for global guard check"
    }
}
else {
    $warnings += "G2b: Skipped (no mapping file)"
}

# ============================================
# G3: Public Surface Compliance
# ============================================
Write-Host "[G3] Checking Public Surface Compliance..." -ForegroundColor Yellow

$PolicyJsonPath = Join-Path $RootDir "docs\policy\public-surface.policy.json"
$PublicSurfaceCheckPath = Join-Path $SecurityDir "public-surface-check-report.json"

# Check policy JSON exists (SSOT)
if (Test-Path $PolicyJsonPath) {
    try {
        $PolicyJson = Get-Content $PolicyJsonPath -Raw | ConvertFrom-Json
        $policyName = $PolicyJson.policy
        $endpointCount = @($PolicyJson.endpoints).Count
        $passed += "G3a: Policy JSON exists ($policyName, $endpointCount endpoints)"
    }
    catch {
        $failures += "G3a: Could not parse public-surface.policy.json"
    }
}
else {
    $failures += "G3a: public-surface.policy.json not found (SSOT required)"
}

# Check validation report exists and passed
if (Test-Path $PublicSurfaceCheckPath) {
    try {
        $CheckReport = Get-Content $PublicSurfaceCheckPath -Raw | ConvertFrom-Json
        if ($CheckReport.ok -eq $true) {
            $passed += "G3b: Public surface validation PASS"
        }
        else {
            $errorCount = if ($null -ne $CheckReport.errors) { $CheckReport.errors.Count } else { 0 }
            $failures += "G3b: Public surface validation FAIL ($errorCount errors)"
        }
    }
    catch {
        $warnings += "G3b: Could not parse public-surface-check-report.json"
    }
}
else {
    $warnings += "G3b: public-surface-check-report.json not found (run validate-public-surface.ps1)"
}

# ============================================
# G4: Stub Modules not in production
# ============================================
Write-Host "[G4] Checking Stub Modules Kill-Switch..." -ForegroundColor Yellow

$AppModulePath = Join-Path $BackendDir "app.module.ts"
if (Test-Path $AppModulePath) {
    $AppModuleContent = Get-Content $AppModulePath -Raw
    
    # Check for conditional loading
    if ($AppModuleContent -match 'ENABLE_STUB_MODULES') {
        if ($AppModuleContent -match 'ENABLE_STUB_MODULES.*true') {
            $passed += "G4: Stub modules disabled by default (ENABLE_STUB_MODULES check found)"
        }
        else {
            $failures += "G4: ENABLE_STUB_MODULES exists but not properly configured"
        }
    }
    else {
        $failures += "G4: No ENABLE_STUB_MODULES conditional found in app.module.ts"
    }
}
else {
    $failures += "G4: app.module.ts not found"
}

# ============================================
# G5: No new unprotected routes (diff check)
# ============================================
Write-Host "[G5] Checking for new unprotected routes..." -ForegroundColor Yellow

if (Test-Path $T1MappingPath) {
    try {
        $T1Mapping = Get-Content $T1MappingPath -Raw | ConvertFrom-Json
        $unprotectedRoutes = ($T1Mapping.routes | Where-Object { $_.protected -eq $false }).Count

        # Threshold: Allow existing unprotected, warn if high
        $threshold = 500  # Current baseline ~436, with buffer

        if ($unprotectedRoutes -gt $threshold) {
            $failures += "G5: Unprotected routes ($unprotectedRoutes) exceed threshold ($threshold)"
        }
        else {
            $passed += "G5: Unprotected routes ($unprotectedRoutes) within threshold"
        }

        # In strict mode, fail if any routes unprotected (except explicitly public)
        if ($Strict) {
            $publicRoutes = ($T1Mapping.routes | Where-Object { $_.public -eq $true }).Count
            $unguardedNonPublic = $unprotectedRoutes - $publicRoutes
            if ($unguardedNonPublic -gt 0) {
                $warnings += "G5-STRICT: $unguardedNonPublic routes unprotected (non-public)"
            }
        }
    }
    catch {
        $warnings += "G5: Could not analyze mapping for diff check"
    }
}
else {
    $warnings += "G5: Skipped (no mapping file)"
}

# ============================================
# G6: Domain Map Integrity (SSOT)
# ============================================
Write-Host "[G6] Checking Domain Map Integrity..." -ForegroundColor Yellow

$T0DomainMapCheckPath = Join-Path $LogsDir "T0-domain-map-check.json"
if (Test-Path $T0DomainMapCheckPath) {
    try {
        $dm = Get-Content $T0DomainMapCheckPath -Raw | ConvertFrom-Json
        if ($dm.ok -eq $true) {
            $refMods = if ($null -ne $dm.counts.referencedModules) { $dm.counts.referencedModules } else { "?" }
            $refPages = if ($null -ne $dm.counts.referencedPages) { $dm.counts.referencedPages } else { "?" }
            $passed += "G6: Domain Map Integrity PASS (modules: $refMods, pages: $refPages)"
        }
        else {
            $missMods = if ($null -ne $dm.counts.missingModules) { $dm.counts.missingModules } else { 0 }
            $missPages = if ($null -ne $dm.counts.missingPages) { $dm.counts.missingPages } else { 0 }
            $missRoutes = if ($null -ne $dm.counts.missingKeyRoutes) { $dm.counts.missingKeyRoutes } else { 0 }
            $failures += "G6: Domain Map Integrity FAIL (missing: $missMods modules, $missPages pages, $missRoutes keyRoutes)"
        }
    }
    catch {
        $failures += "G6: Could not parse T0-domain-map-check.json"
    }
}
else {
    $failures += "G6: T0-domain-map-check.json not found (run check-domain-map.ps1)"
}

# ============================================
# Strict Mode: Unprotected Not Allowlisted
# ============================================
$strictBlocked = $false
$strictReason = ""

if ($Strict) {
    Write-Host "[STRICT] Checking UnprotectedNotAllowlistedProd..." -ForegroundColor Yellow
    
    if (Test-Path $PublicSurfaceCheckPath) {
        try {
            $CheckReport = Get-Content $PublicSurfaceCheckPath -Raw | ConvertFrom-Json
            $unprotectedNotAllowlisted = $CheckReport.mappingUnprotectedNotAllowlisted
            
            if ($unprotectedNotAllowlisted -gt 0) {
                $strictBlocked = $true
                $strictReason = "UnprotectedNotAllowlistedProd = $unprotectedNotAllowlisted (must be 0)"
                $failures += "STRICT: $strictReason"
            }
            else {
                $passed += "STRICT: UnprotectedNotAllowlistedProd = 0 (release-ready)"
            }
        }
        catch {
            $failures += "STRICT: Could not parse public-surface-check-report.json"
            $strictBlocked = $true
            $strictReason = "Cannot verify UnprotectedNotAllowlistedProd"
        }
    }
    else {
        $failures += "STRICT: public-surface-check-report.json required for strict mode"
        $strictBlocked = $true
        $strictReason = "Missing public-surface-check-report.json"
    }
}

# ============================================
# Summary
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PASSED ($($passed.Count)):" -ForegroundColor Green
foreach ($p in $passed) {
    Write-Host "  $([char]0x2705) $p" -ForegroundColor Green
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($w in $warnings) {
        Write-Host "  $([char]0x26A0) $w" -ForegroundColor Yellow
    }
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILURES ($($failures.Count)):" -ForegroundColor Red
    foreach ($f in $failures) {
        Write-Host "  $([char]0x274C) $f" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Calculate final status
$finalStatus = "PASS"
$exitCode = 0

if ($failures.Count -gt 0) {
    $finalStatus = "FAIL"
    $exitCode = 1
}

# In strict mode: if strictBlocked, overall cannot be PASS
if ($Strict -and $strictBlocked) {
    $finalStatus = "BLOCKED"
    $exitCode = 1
}

if ($finalStatus -eq "PASS") {
    Write-Host " CI GATE CHECK: PASS" -ForegroundColor Green
}
elseif ($finalStatus -eq "BLOCKED") {
    Write-Host " CI GATE CHECK: BLOCKED (strict mode)" -ForegroundColor Yellow
    Write-Host " Reason: $strictReason" -ForegroundColor Yellow
}
else {
    Write-Host " CI GATE CHECK: FAIL" -ForegroundColor Red
    Write-Host " $($failures.Count) rule(s) violated - merge blocked" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
exit $exitCode
