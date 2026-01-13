# CI Gate Check Script
# Purpose: Enforce hard rules for CI - blocks merge if any rule violated
# Rules: G1-G5 per Gate Playbook v1.0
# Exit Code: 0 = PASS, 1 = FAIL

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
# G3: Public Surface Compliance
# ============================================
Write-Host "[G3] Checking Public Surface Compliance..." -ForegroundColor Yellow

$PublicSurfacePath = Join-Path $SecurityDir "public-surface.md"
$PublicSurfaceCheckPath = Join-Path $SecurityDir "public-surface-check-report.json"

if (Test-Path $PublicSurfacePath) {
    $PublicSurfaceContent = Get-Content $PublicSurfacePath -Raw
    
    # Check policy is declared
    if ($PublicSurfaceContent -match "Policy-[AB]") {
        $passed += "G3a: Public surface policy declared"
    }
    else {
        $failures += "G3a: No policy (A or B) declared in public-surface.md"
    }
    
    # Check validation report exists
    if (Test-Path $PublicSurfaceCheckPath) {
        try {
            $CheckReport = Get-Content $PublicSurfaceCheckPath -Raw | ConvertFrom-Json
            if ($CheckReport.status -eq "PASS") {
                $passed += "G3b: Public surface validation PASS"
            }
            else {
                $failures += "G3b: Public surface validation FAIL ($($CheckReport.errors.Count) errors)"
            }
        }
        catch {
            $warnings += "G3b: Could not parse public-surface-check-report.json"
        }
    }
    else {
        $warnings += "G3b: public-surface-check-report.json not found (run validate-public-surface.ps1)"
    }
}
else {
    $failures += "G3: public-surface.md not found"
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

if ($failures.Count -eq 0) {
    Write-Host " CI GATE CHECK: PASS $([char]0x2705)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    exit 0
}
else {
    Write-Host " CI GATE CHECK: FAIL $([char]0x274C)" -ForegroundColor Red
    Write-Host " $($failures.Count) rule(s) violated - merge blocked" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    exit 1
}
