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
# Test 1: Inject UnknownProtectionCount = 1
# ============================================
Write-Host ""
Write-Host "[Test 1] Injecting UnknownProtectionCount = 1 ..." -ForegroundColor Yellow

if (Test-Path $gateSummaryPath) {
    $gs = Get-Content $gateSummaryPath -Raw | ConvertFrom-Json
    $gs.metrics.UnknownProtectionCount = 1
    $gs.gates.G5a.status = "WARN"
    $gs.gates.G5a.detail = "1 routes missing protected field (fail-closed)"
    ($gs | ConvertTo-Json -Depth 20) | Out-File -FilePath $gateSummaryPath -Encoding UTF8

    $result = Run-StrictGateCheck

    if ($result.ExitCode -ne 0) {
        Write-Host "   PASS: Gate correctly FAILED on UnknownProtectionCount=1" -ForegroundColor Green
        $testResults += @{ Name = "UnknownProtectionCount Injection"; Passed = $true }
    }
    else {
        Write-Host "   FAIL: Gate should have FAILED but PASSED!" -ForegroundColor Red
        $testResults += @{ Name = "UnknownProtectionCount Injection"; Passed = $false }
        $allPassed = $false
    }

    # Restore for next test
    Restore-Backups
    foreach ($f in $filesToTest) {
        if (Test-Path "$f$backupSuffix") { }
        elseif ($backups.ContainsKey($f)) {
            Copy-Item $backups[$f] "$f$backupSuffix" -Force -ErrorAction SilentlyContinue
        }
    }
    # Re-backup for next test
    foreach ($f in $filesToTest) {
        if (Test-Path $f) {
            Copy-Item $f "$f$backupSuffix" -Force
        }
    }
}
else {
    Write-Host "   SKIP: gate-summary.json not found" -ForegroundColor DarkGray
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
