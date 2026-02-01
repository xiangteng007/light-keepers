#!/usr/bin/env pwsh
# tools/pre-commit/validate-module-references.ps1
# 
# 預防措施腳本：在提交前驗證所有模組參考
# 此腳本可作為 Git pre-commit hook 或手動執行
#
# 用法:
#   pwsh tools/pre-commit/validate-module-references.ps1
#   pwsh tools/pre-commit/validate-module-references.ps1 -AutoFix
#
# 功能:
# 1. 掃描 domain-map.yaml 中的模組參考
# 2. 掃描 app.module.ts 及 core modules 中的導入
# 3. 驗證所有參考的模組都存在於 backend/src/modules/
# 4. 報告任何失效的參考

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [switch]$AutoFix = $false,
    [switch]$Strict = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Module Reference Validator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. 取得所有存在的模組
$modulesDir = Join-Path $RootDir "backend/src/modules"
if (!(Test-Path $modulesDir)) {
    Write-Host "ERROR: Modules directory not found: $modulesDir" -ForegroundColor Red
    exit 1
}

$existingModules = Get-ChildItem $modulesDir -Directory | Select-Object -ExpandProperty Name
Write-Host "`n[1/4] Found $($existingModules.Count) existing modules" -ForegroundColor Green

# 2. 驗證 domain-map.yaml
$domainMapPath = Join-Path $RootDir "docs/architecture/domain-map.yaml"
$domainMapErrors = @()

if (Test-Path $domainMapPath) {
    $content = Get-Content $domainMapPath -Raw
    $moduleMatches = [regex]::Matches($content, '^\s+-\s+(\S+)\s*$', [System.Text.RegularExpressions.RegexOptions]::Multiline)
    
    foreach ($match in $moduleMatches) {
        $moduleName = $match.Groups[1].Value
        # 排除非模組項目（頁面、路由等）
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
    } else {
        Write-Host "`n[2/4] domain-map.yaml: OK" -ForegroundColor Green
    }
} else {
    Write-Host "`n[2/4] domain-map.yaml: Not found (skipping)" -ForegroundColor Yellow
}

# 3. 驗證 TypeScript 導入
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
    # 匹配類似 from '../../modules/xxx/...' 或 '../modules/xxx/...'
    $importMatches = [regex]::Matches($content, "from\s+['\"]\.+/modules/([^/]+)/", [System.Text.RegularExpressions.RegexOptions]::None)
    
    foreach ($match in $importMatches) {
        $moduleName = $match.Groups[1].Value
        if ($existingModules -notcontains $moduleName) {
            $importErrors += @{
                File = $file
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
} else {
    Write-Host "`n[3/4] TypeScript imports: OK" -ForegroundColor Green
}

# 4. 總結
$totalErrors = $domainMapErrors.Count + $importErrors.Count

Write-Host "`n========================================" -ForegroundColor Cyan
if ($totalErrors -eq 0) {
    Write-Host "✅ All module references are valid!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Found $totalErrors invalid module references" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix these issues:" -ForegroundColor Yellow
    Write-Host "1. Remove invalid module references from domain-map.yaml"
    Write-Host "2. Remove or update TypeScript imports in the affected files"
    Write-Host ""
    Write-Host "Tip: Run 'pwsh tools/audit/check-domain-map.ps1' for detailed report"
    
    if ($Strict) {
        exit 1
    } else {
        Write-Host "`n[WARN] Running in non-strict mode, exiting with 0" -ForegroundColor Yellow
        exit 0
    }
}
