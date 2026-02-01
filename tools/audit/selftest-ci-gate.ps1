# tools/audit/selftest-ci-gate.ps1
# Negative Test Gate — Self-Verification of CI Gate Check
# VERSION: 1.0.0
#
# Purpose:
# - Verify that ci-gate-check.ps1 -Strict actually FAILS when given bad data
# - This is a "test the test" pattern to ensure the gate is reliable
#
# PASS condition: injecting bad data causes ci-gate-check.ps1 -Strict to exit 1
# FAIL condition: gate PASSES despite bad data (means gate is broken)

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Negative Test Gate — Self-Verification"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paths
$gateSummaryPath = Join-Path $RootDir "docs/proof/gates/gate-summary.json"
$domainMapCheckPath = Join-Path $RootDir "docs/proof/logs/T0-domain-map-check.json"
$backupSuffix = ".selftest-backup"

# Backup original files
$filesToTest = @($gateSummaryPath, $domainMapCheckPath)
$backups = @{}

foreach ($f in $filesToTest) {
    if (Test-Path $f) {
        $backupPath = "$f$backupSuffix"
        Copy-Item $f $backupPath -Force
        $backups[$f] = $backupPath
        Write-Host "Backed up: $f" -ForegroundColor DarkGray
    }
}

function Restore-Backups {
    foreach ($entry in $backups.GetEnumerator()) {
        if (Test-Path $entry.Value) {
            Copy-Item $entry.Value $entry.Key -Force
            Remove-Item $entry.Value -Force
            Write-Host "Restored: $($entry.Key)" -ForegroundColor DarkGray
        }
    }
}

function Run-StrictGateCheck {
    try {
        $scriptPath = Join-Path $RootDir "tools/audit/ci-gate-check.ps1"
        $result = & pwsh -File $scriptPath -Strict 2>&1
        return @{ ExitCode = $LASTEXITCODE; Output = $result }
    }
    catch {
        return @{ ExitCode = 1; Output = $_.Exception.Message }
    }
}

$testResults = @()
$allPassed = $true

# ============================================
# Test 1: Inject route with missing protected field
# This triggers UnknownProtectionCount > 0, causing G5a to WARN
# In -Strict mode, any WARN = overall FAIL
# ============================================
Write-Host ""
Write-Host "[Test 1] Injecting UnknownProtectionCount = 1 ..." -ForegroundColor Yellow

$routesMappingPath = Join-Path $RootDir "docs/proof/security/T1-routes-guards-mapping.json"

if (Test-Path $routesMappingPath) {
    # Backup the routes mapping file
    $routesBackupPath = "$routesMappingPath$backupSuffix"
    Copy-Item $routesMappingPath $routesBackupPath -Force
    $backups[$routesMappingPath] = $routesBackupPath
    Write-Host "Backed up: $routesMappingPath" -ForegroundColor DarkGray

    $routesMapping = Get-Content $routesMappingPath -Raw | ConvertFrom-Json
    
    # Add a fake route WITHOUT the 'protected' field to trigger UnknownProtectionCount
    $badRoute = [ordered]@{
        method     = "GET"
        path       = "/api/v1/selftest-bad-route"
        controller = "SelftestController"
        handler    = "badHandler"
        guards     = @()
        # NOTE: Intentionally omitting 'protected' field to trigger fail-closed behavior
    }
    
    # Inject into routes array
    if ($null -ne $routesMapping.routes) {
        $routesMapping.routes = @($routesMapping.routes) + $badRoute
    }
    elseif ($null -ne $routesMapping.data -and $null -ne $routesMapping.data.routes) {
        $routesMapping.data.routes = @($routesMapping.data.routes) + $badRoute
    }
    else {
        $routesMapping | Add-Member -NotePropertyName "routes" -NotePropertyValue @($badRoute) -Force
    }
    
    ($routesMapping | ConvertTo-Json -Depth 20) | Out-File -FilePath $routesMappingPath -Encoding UTF8

    $result = Run-StrictGateCheck

    if ($result.ExitCode -ne 0) {
        Write-Host "   PASS: Gate correctly FAILED on UnknownProtectionCount injection" -ForegroundColor Green
        $testResults += @{ Name = "UnknownProtectionCount Injection"; Passed = $true }
    }
    else {
        Write-Host "   FAIL: Gate should have FAILED but PASSED!" -ForegroundColor Red
        $testResults += @{ Name = "UnknownProtectionCount Injection"; Passed = $false }
        $allPassed = $false
    }

    # Restore routes mapping
    if (Test-Path $routesBackupPath) {
        Copy-Item $routesBackupPath $routesMappingPath -Force
        Remove-Item $routesBackupPath -Force
        $backups.Remove($routesMappingPath)
        Write-Host "Restored: $routesMappingPath" -ForegroundColor DarkGray
    }
}
else {
    Write-Host "   SKIP: T1-routes-guards-mapping.json not found" -ForegroundColor DarkGray
    $testResults += @{ Name = "UnknownProtectionCount Injection"; Passed = $true; Skipped = $true }
}

# ============================================
# Test 2: Inject DomainMapOk = false
# ============================================
Write-Host ""
Write-Host "[Test 2] Injecting DomainMapOk = false ..." -ForegroundColor Yellow

if (Test-Path $domainMapCheckPath) {
    $dm = Get-Content $domainMapCheckPath -Raw | ConvertFrom-Json
    $dm.ok = $false
    $dm.status = "FAIL"
    ($dm | ConvertTo-Json -Depth 20) | Out-File -FilePath $domainMapCheckPath -Encoding UTF8

    $result = Run-StrictGateCheck

    if ($result.ExitCode -ne 0) {
        Write-Host "   PASS: Gate correctly FAILED on DomainMapOk=false" -ForegroundColor Green
        $testResults += @{ Name = "DomainMapOk Injection"; Passed = $true }
    }
    else {
        Write-Host "   FAIL: Gate should have FAILED but PASSED!" -ForegroundColor Red
        $testResults += @{ Name = "DomainMapOk Injection"; Passed = $false }
        $allPassed = $false
    }

    Restore-Backups
}
else {
    Write-Host "   SKIP: T0-domain-map-check.json not found" -ForegroundColor DarkGray
    $testResults += @{ Name = "DomainMapOk Injection"; Passed = $true; Skipped = $true }
}

# ============================================
# Final Restore & Summary
# ============================================
Write-Host ""
Write-Host "Restoring all backups..." -ForegroundColor DarkGray
Restore-Backups

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Negative Test Results"
Write-Host "========================================" -ForegroundColor Cyan

foreach ($t in $testResults) {
    $status = if ($t.Skipped) { "SKIP" } elseif ($t.Passed) { "PASS" } else { "FAIL" }
    $color = if ($t.Skipped) { "DarkGray" } elseif ($t.Passed) { "Green" } else { "Red" }
    Write-Host "   [$status] $($t.Name)" -ForegroundColor $color
}

Write-Host ""
if ($allPassed) {
    Write-Host "Negative Test Gate: PASS" -ForegroundColor Green
    Write-Host "(ci-gate-check.ps1 -Strict correctly rejects bad data)"
    exit 0
}
else {
    Write-Host "Negative Test Gate: FAIL" -ForegroundColor Red
    Write-Host "(ci-gate-check.ps1 -Strict failed to reject bad data — gate is unreliable!)"
    exit 1
}
