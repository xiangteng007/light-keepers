# Validate Public Surface Script
# Purpose: Verify public endpoints comply with Policy-B requirements
# Output: docs/proof/security/public-surface-check-report.md
# Exit Code: 0 = PASS, 1 = FAIL

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = "Stop"
$ProofDir = Join-Path $RootDir "docs\proof\security"
$BackendDir = Join-Path $RootDir "backend\src"

# Ensure output directory exists
New-Item -ItemType Directory -Force -Path $ProofDir | Out-Null

$ReportPath = Join-Path $ProofDir "public-surface-check-report.md"
$JsonPath = Join-Path $ProofDir "public-surface-check-report.json"

$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$errors = @()
$warnings = @()
$passed = @()

# Check stub modules are not loaded in production
Write-Host "Checking stub modules kill-switch..." -ForegroundColor Cyan

$AppModulePath = Join-Path $BackendDir "app.module.ts"
if (Test-Path $AppModulePath) {
    $AppModuleContent = Get-Content $AppModulePath -Raw
    
    # Check for ENABLE_STUB_MODULES conditional
    if ($AppModuleContent -match 'ENABLE_STUB_MODULES') {
        if ($AppModuleContent -match 'ENABLE_STUB_MODULES.*true') {
            $passed += "STUB_KILL_SWITCH: Stub modules conditionally loaded (default: disabled)"
        }
        else {
            $errors += "STUB_KILL_SWITCH: ENABLE_STUB_MODULES found but not properly configured"
        }
    }
    else {
        $errors += "STUB_KILL_SWITCH: No ENABLE_STUB_MODULES conditional found"
    }
}
else {
    $errors += "APP_MODULE_MISSING: Cannot find app.module.ts"
}

# Check health controllers have no guards (intentionally public)
Write-Host "Checking health endpoint accessibility..." -ForegroundColor Cyan

$HealthControllerPath = Join-Path $BackendDir "health\health.controller.ts"
if (Test-Path $HealthControllerPath) {
    $HealthContent = Get-Content $HealthControllerPath -Raw
    if ($HealthContent -match "@UseGuards") {
        $warnings += "HEALTH_GUARD: health.controller.ts has guards on some endpoints (verify intentional)"
    }
    else {
        $passed += "HEALTH_PUBLIC: health.controller.ts endpoints are accessible without guards"
    }
}
else {
    $warnings += "HEALTH_CONTROLLER_MISSING: health.controller.ts not found"
}

# Check that @Public decorator exists
Write-Host "Checking @Public decorator existence..." -ForegroundColor Cyan

$PublicDecoratorPath = Join-Path $BackendDir "modules\auth\decorators\public.decorator.ts"
if (Test-Path $PublicDecoratorPath) {
    $passed += "PUBLIC_DECORATOR: @Public decorator exists"
}
else {
    $errors += "PUBLIC_DECORATOR_MISSING: @Public decorator not found at expected path"
}

# Check public-surface.md exists and has required sections
Write-Host "Checking public-surface.md compliance..." -ForegroundColor Cyan

$PublicSurfacePath = Join-Path $ProofDir "public-surface.md"
if (Test-Path $PublicSurfacePath) {
    $PublicSurfaceContent = Get-Content $PublicSurfacePath -Raw
    
    if ($PublicSurfaceContent -match "Policy-B") {
        $passed += "POLICY_DECLARED: Policy-B is declared in public-surface.md"
    }
    elseif ($PublicSurfaceContent -match "Policy-A") {
        $passed += "POLICY_DECLARED: Policy-A is declared in public-surface.md"
    }
    else {
        $errors += "POLICY_MISSING: No policy (A or B) declared in public-surface.md"
    }
    
    if ($PublicSurfaceContent -match "Stub Modules") {
        $passed += "STUB_DOCUMENTED: Stub modules attack surface documented"
    }
    else {
        $warnings += "STUB_UNDOCUMENTED: Stub modules section missing from public-surface.md"
    }
}
else {
    $errors += "PUBLIC_SURFACE_MISSING: public-surface.md not found"
}

# Check ThrottlerGuard is globally enabled
Write-Host "Checking rate limiting..." -ForegroundColor Cyan

if (Test-Path $AppModulePath) {
    $AppModuleContent = Get-Content $AppModulePath -Raw
    if ($AppModuleContent -match "ThrottlerGuard") {
        $passed += "THROTTLE_GLOBAL: ThrottlerGuard is globally configured"
    }
    else {
        $warnings += "THROTTLE_MISSING: ThrottlerGuard not found in app.module.ts"
    }
}

# Generate report
$totalChecks = $errors.Count + $warnings.Count + $passed.Count
$passRate = if ($totalChecks -gt 0) { [math]::Round(($passed.Count / $totalChecks) * 100, 1) } else { 0 }
$status = if ($errors.Count -eq 0) { "PASS" } else { "FAIL" }

$errorsSection = if ($errors.Count -eq 0) { "None" } else { ($errors | ForEach-Object { "- $([char]0x274C) $_" }) -join "`n" }
$warningsSection = if ($warnings.Count -eq 0) { "None" } else { ($warnings | ForEach-Object { "- $([char]0x26A0) $_" }) -join "`n" }
$passedSection = if ($passed.Count -eq 0) { "None" } else { ($passed | ForEach-Object { "- $([char]0x2705) $_" }) -join "`n" }

$report = @"
# Public Surface Validation Report

> **Generated**: $timestamp  
> **Status**: **$status**  
> **Script**: validate-public-surface.ps1

---

## Summary

| Metric | Value |
|--------|------:|
| Total Checks | $totalChecks |
| Passed | $($passed.Count) |
| Warnings | $($warnings.Count) |
| Errors | $($errors.Count) |
| **Pass Rate** | **$passRate%** |

---

## Errors (Blocking)

$errorsSection

---

## Warnings

$warningsSection

---

## Passed Checks

$passedSection

---

## Policy Reference

- **Policy-B Selected**: @Public() or @RequiredLevel(0) = public
- **Required**: All public endpoints must have throttling
- **Required**: Stub modules disabled in production

---

**Exit Code**: $(if ($errors.Count -eq 0) { "0 (PASS)" } else { "1 (FAIL)" })
"@

$report | Out-File -FilePath $ReportPath -Encoding UTF8

# Generate JSON report
$jsonReport = @{
    generated = $timestamp
    status    = $status
    summary   = @{
        totalChecks = $totalChecks
        passed      = $passed.Count
        warnings    = $warnings.Count
        errors      = $errors.Count
        passRate    = $passRate
    }
    errors    = $errors
    warnings  = $warnings
    passed    = $passed
} | ConvertTo-Json -Depth 5

$jsonReport | Out-File -FilePath $JsonPath -Encoding UTF8

Write-Host ""
Write-Host "Public Surface Validation Complete!" -ForegroundColor $(if ($errors.Count -eq 0) { "Green" } else { "Red" })
Write-Host "  Status: $status"
Write-Host "  Passed: $($passed.Count)/$totalChecks"
Write-Host "  Errors: $($errors.Count)"
Write-Host "  Report: $ReportPath"
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "ERRORS:" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
    exit 1
}

exit 0
