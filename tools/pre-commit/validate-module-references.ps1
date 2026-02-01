#!/usr/bin/env pwsh
# tools/pre-commit/validate-module-references.ps1
# Prevention Script: Validate all module references before commit

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [switch]$Strict = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "Module Reference Validator"
Write-Host "========================================"

# 1. Get all existing modules
$modulesDir = Join-Path $RootDir "backend/src/modules"
if (!(Test-Path $modulesDir)) {
    Write-Host "ERROR: Modules directory not found: $modulesDir" -ForegroundColor Red
    exit 1
}

$existingModules = Get-ChildItem $modulesDir -Directory | Select-Object -ExpandProperty Name
Write-Host "`n[1/4] Found $($existingModules.Count) existing modules" -ForegroundColor Green

# 2. Validate domain-map.yaml
$domainMapPath = Join-Path $RootDir "docs/architecture/domain-map.yaml"
$domainMapErrors = @()

if (Test-Path $domainMapPath) {
    $content = Get-Content $domainMapPath -Raw
    $pattern = '^\s+-\s+(\S+)\s*$'
    $moduleMatches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    
    foreach ($match in $moduleMatches) {
        $moduleName = $match.Groups[1].Value
        if ($moduleName -match 'Page$|^/') { continue }
        if ($existingModules -notcontains $moduleName) {
            $domainMapErrors += $moduleName
        }
    }
    
    if ($domainMapErrors.Count -gt 0) {
        Write-Host "`n[2/4] domain-map.yaml: $($domainMapErrors.Count) invalid references" -ForegroundColor Red
        foreach ($err in $domainMapErrors) {
            Write-Host "  - $err" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "`n[2/4] domain-map.yaml: OK" -ForegroundColor Green
    }
}
else {
    Write-Host "`n[2/4] domain-map.yaml: Not found (skipping)" -ForegroundColor Yellow
}

# 3. Validate TypeScript imports
$coreModuleFiles = @(
    "backend/src/app.module.ts",
    "backend/src/core/analytics/analytics-core.module.ts",
    "backend/src/core/environment/environment-core.module.ts",
    "backend/src/core/infrastructure/infrastructure-core.module.ts",
    "backend/src/core/admin/admin-core.module.ts"
)

$importErrors = @()

foreach ($file in $coreModuleFiles) {
    $filePath = Join-Path $RootDir $file
    if (!(Test-Path $filePath)) { continue }
    
    $content = Get-Content $filePath -Raw
    $importPattern = "from\s+[`"'][.]+/modules/([^/]+)/"
    $importMatches = [regex]::Matches($content, $importPattern)
    
    foreach ($match in $importMatches) {
        $moduleName = $match.Groups[1].Value
        if ($existingModules -notcontains $moduleName) {
            $importErrors += @{
                File   = $file
                Module = $moduleName
            }
        }
    }
}

if ($importErrors.Count -gt 0) {
    Write-Host "`n[3/4] TypeScript imports: $($importErrors.Count) broken references" -ForegroundColor Red
    foreach ($err in $importErrors) {
        Write-Host "  - $($err.File): $($err.Module)" -ForegroundColor Yellow
    }
}
else {
    Write-Host "`n[3/4] TypeScript imports: OK" -ForegroundColor Green
}

# 4. Summary
$totalErrors = $domainMapErrors.Count + $importErrors.Count

Write-Host "`n========================================"
if ($totalErrors -eq 0) {
    Write-Host "All module references are valid!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "Found $totalErrors invalid module references" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix these issues:" -ForegroundColor Yellow
    Write-Host "1. Remove invalid module references from domain-map.yaml"
    Write-Host "2. Remove or update TypeScript imports in the affected files"
    
    if ($Strict) {
        exit 1
    }
    else {
        Write-Host "`n[WARN] Running in non-strict mode, exiting with 0" -ForegroundColor Yellow
        exit 0
    }
}
