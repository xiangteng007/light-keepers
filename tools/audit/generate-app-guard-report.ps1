<#
.SYNOPSIS
    T9: App Guard Registration Report
.DESCRIPTION
    Scans app.module.ts to verify APP_GUARD registrations.
    Produces machine-readable evidence that GlobalAuthGuard is registered.
.OUTPUTS
    docs/proof/security/T9-app-guard-registration-report.json
    docs/proof/security/T9-app-guard-registration-report.md
.EXAMPLE
    pwsh tools/audit/generate-app-guard-report.ps1
#>

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " T9: App Guard Registration Report" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paths
$AppModulePath = Join-Path $RootDir "backend/src/app.module.ts"
$OutputJsonPath = Join-Path $RootDir "docs/proof/security/T9-app-guard-registration-report.json"
$OutputMdPath = Join-Path $RootDir "docs/proof/security/T9-app-guard-registration-report.md"

# Timestamp
$timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")

# Initialize report
$report = @{
    task                      = "T9"
    name                      = "App Guard Registration Check"
    checkedAt                 = $timestamp
    appModulePath             = "backend/src/app.module.ts"
    guards                    = @()
    globalAuthGuardRegistered = $false
    throttlerGuardRegistered  = $false
    guardOrder                = @()
    status                    = "FAIL"
    evidence                  = @()
}

# Check if app.module.ts exists
if (-not (Test-Path $AppModulePath)) {
    $report.status = "FAIL"
    $report.error = "app.module.ts not found"
    Write-Host "  [FAIL] app.module.ts not found" -ForegroundColor Red
}
else {
    Write-Host "Scanning: $AppModulePath" -ForegroundColor Yellow
    
    $content = Get-Content $AppModulePath -Raw
    $lines = Get-Content $AppModulePath
    
    # Find APP_GUARD registrations
    $guardPattern = "provide:\s*APP_GUARD[\s\S]*?useClass:\s*(\w+)"
    $matches = [regex]::Matches($content, $guardPattern)
    
    $guardIndex = 0
    foreach ($match in $matches) {
        $guardName = $match.Groups[1].Value
        $matchText = $match.Value
        
        # Find line number
        $lineNum = 0
        $charCount = 0
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $charCount += $lines[$i].Length + 2  # +2 for CRLF
            if ($charCount -ge $match.Index) {
                $lineNum = $i + 1
                break
            }
        }
        
        $guardEntry = @{
            name       = $guardName
            order      = $guardIndex
            lineNumber = $lineNum
            snippet    = $matchText.Trim() -replace '\s+', ' '
        }
        
        $report.guards += $guardEntry
        $report.guardOrder += $guardName
        
        if ($guardName -eq "GlobalAuthGuard") {
            $report.globalAuthGuardRegistered = $true
            Write-Host "  [FOUND] GlobalAuthGuard at line $lineNum (order: $guardIndex)" -ForegroundColor Green
        }
        elseif ($guardName -eq "ThrottlerGuard") {
            $report.throttlerGuardRegistered = $true
            Write-Host "  [FOUND] ThrottlerGuard at line $lineNum (order: $guardIndex)" -ForegroundColor Green
        }
        else {
            Write-Host "  [INFO] $guardName at line $lineNum (order: $guardIndex)" -ForegroundColor DarkGray
        }
        
        $guardIndex++
    }
    
    # Check for GlobalAuthGuard import
    $importPattern = "import\s*\{[^}]*GlobalAuthGuard[^}]*\}\s*from"
    $hasImport = $content -match $importPattern
    
    $report.evidence += @{
        type        = "import_check"
        found       = $hasImport
        description = "GlobalAuthGuard import statement"
    }
    
    # Determine status
    if ($report.globalAuthGuardRegistered -and $report.throttlerGuardRegistered) {
        # Check order: ThrottlerGuard should come before GlobalAuthGuard
        $throttlerIndex = $report.guardOrder.IndexOf("ThrottlerGuard")
        $globalAuthIndex = $report.guardOrder.IndexOf("GlobalAuthGuard")
        
        if ($throttlerIndex -lt $globalAuthIndex) {
            $report.status = "PASS"
            $report.evidence += @{
                type        = "guard_order"
                correct     = $true
                description = "ThrottlerGuard (index $throttlerIndex) before GlobalAuthGuard (index $globalAuthIndex)"
            }
            Write-Host "  [PASS] Guard order correct: ThrottlerGuard -> GlobalAuthGuard" -ForegroundColor Green
        }
        else {
            $report.status = "WARNING"
            $report.evidence += @{
                type        = "guard_order"
                correct     = $false
                description = "GlobalAuthGuard (index $globalAuthIndex) before ThrottlerGuard (index $throttlerIndex) - may cause rate limit bypass"
            }
            Write-Host "  [WARN] Guard order may be wrong: GlobalAuthGuard before ThrottlerGuard" -ForegroundColor Yellow
        }
    }
    elseif ($report.globalAuthGuardRegistered) {
        $report.status = "PARTIAL"
        Write-Host "  [PARTIAL] GlobalAuthGuard registered but ThrottlerGuard missing" -ForegroundColor Yellow
    }
    else {
        $report.status = "FAIL"
        Write-Host "  [FAIL] GlobalAuthGuard NOT registered as APP_GUARD" -ForegroundColor Red
    }
}

# Write JSON report
$jsonContent = $report | ConvertTo-Json -Depth 10
$jsonContent | Out-File -FilePath $OutputJsonPath -Encoding utf8 -Force
Write-Host ""
Write-Host "Generated: $OutputJsonPath" -ForegroundColor Green

# Generate MD report
$mdContent = @"
# T9: App Guard Registration Report

- **CheckedAt**: $timestamp
- **File**: ``backend/src/app.module.ts``
- **Status**: **$($report.status)**

## Summary

| Check | Result |
|-------|--------|
| GlobalAuthGuard registered | $(if ($report.globalAuthGuardRegistered) { 'YES' } else { 'NO' }) |
| ThrottlerGuard registered | $(if ($report.throttlerGuardRegistered) { 'YES' } else { 'NO' }) |
| Guard order correct | $(if ($report.status -eq 'PASS') { 'YES' } else { 'CHECK' }) |

## Detected Guards (in registration order)

| Order | Guard | Line |
|-------|-------|------|
"@

foreach ($guard in $report.guards) {
    $mdContent += "| $($guard.order) | ``$($guard.name)`` | $($guard.lineNumber) |`n"
}

$mdContent += @"

## Evidence Snippets

"@

foreach ($guard in $report.guards) {
    $mdContent += "### $($guard.name) (Line $($guard.lineNumber))`n"
    $mdContent += "``````typescript`n$($guard.snippet)`n```````n`n"
}

$mdContent += @"

## Interpretation

$(if ($report.status -eq 'PASS') {
    '**PASS**: GlobalAuthGuard is correctly registered as APP_GUARD after ThrottlerGuard. All routes are protected by default unless marked with `@Public()` or `@RequiredLevel(0)`.'
} elseif ($report.status -eq 'PARTIAL') {
    '**PARTIAL**: GlobalAuthGuard registered but ThrottlerGuard missing. Rate limiting may not be applied before authentication.'
} else {
    '**FAIL**: GlobalAuthGuard is NOT registered as APP_GUARD. Routes are NOT protected by default. Must register GlobalAuthGuard in app.module.ts providers.'
})

---

**Artifacts**:
- JSON: ``docs/proof/security/T9-app-guard-registration-report.json``
"@

$mdContent | Out-File -FilePath $OutputMdPath -Encoding utf8 -Force
Write-Host "Generated: $OutputMdPath" -ForegroundColor Green
Write-Host ""

# Exit code based on status
if ($report.status -eq "PASS") {
    Write-Host "[G2a] App Guard Registration: PASS" -ForegroundColor Green
    exit 0
}
elseif ($report.status -eq "PARTIAL" -or $report.status -eq "WARNING") {
    Write-Host "[G2a] App Guard Registration: WARNING" -ForegroundColor Yellow
    exit 0
}
else {
    Write-Host "[G2a] App Guard Registration: FAIL" -ForegroundColor Red
    exit 1
}
