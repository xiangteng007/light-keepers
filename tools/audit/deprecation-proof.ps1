<#
.SYNOPSIS
    Deprecation Proof Script
.DESCRIPTION
    掃描過時程式碼和文件
#>
param(
    [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"
$scriptName = "deprecation-proof"
$inventoryPath = "docs/proof/cleanup/deprecation-inventory.json"

Write-Host "=== Deprecation Proof ===" -ForegroundColor Cyan

$result = @{
    scriptName      = $scriptName
    timestamp       = (Get-Date).ToString("o")
    status          = "PASS"
    deprecatedItems = @()
    checks          = @()
}

# 1. 掃描 TODO/FIXME/DEPRECATED 註解
$codeFiles = Get-ChildItem -Path $ProjectRoot -Recurse -Include "*.ts", "*.tsx", "*.js" -ErrorAction SilentlyContinue | 
Where-Object { $_.FullName -notmatch "node_modules|dist|build" }

$todoCount = 0
$deprecatedCount = 0

foreach ($file in $codeFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
        
        if ($content -match "// TODO:|// FIXME:") {
            $todoCount++
        }
        if ($content -match "@deprecated|DEPRECATED") {
            $deprecatedCount++
            $result.deprecatedItems += @{
                type   = "code"
                path   = $relativePath
                reason = "Contains @deprecated annotation"
            }
        }
    }
}

$result.checks += @{
    name    = "TODO/FIXME Comments"
    passed  = $true  # Info only
    details = @{
        count       = $todoCount
        description = "Items requiring attention"
    }
}

$result.checks += @{
    name    = "Deprecated Code"
    passed  = $deprecatedCount -lt 10
    details = @{
        count     = $deprecatedCount
        threshold = 10
    }
}

# 2. 檢查空目錄
$emptyDirs = Get-ChildItem -Path $ProjectRoot -Directory -Recurse -ErrorAction SilentlyContinue | 
Where-Object { 
    $_.FullName -notmatch "node_modules|\.git|dist|build" -and
    (Get-ChildItem $_.FullName -File -Recurse -ErrorAction SilentlyContinue).Count -eq 0
}

$result.checks += @{
    name    = "Empty Directories"
    passed  = $emptyDirs.Count -eq 0
    details = @{
        count       = $emptyDirs.Count
        directories = ($emptyDirs | Select-Object -First 5 | ForEach-Object { $_.FullName.Replace((Get-Location).Path + "\", "") })
    }
}

# 3. 檢查孤立 stub 文件
$stubFiles = Get-ChildItem -Path $ProjectRoot -Recurse -Include "*.stub.ts", "*-stub.ts" -ErrorAction SilentlyContinue |
Where-Object { $_.FullName -notmatch "node_modules" }

$result.checks += @{
    name    = "Stub Files"
    passed  = $stubFiles.Count -lt 5
    details = @{
        count = $stubFiles.Count
        files = ($stubFiles | Select-Object -First 5 | ForEach-Object { $_.Name })
    }
}

# 4. 計算整體狀態
$failedChecks = $result.checks | Where-Object { -not $_.passed }
if ($failedChecks.Count -gt 0) {
    $result.status = "WARN"
    Write-Host "WARNING: Some deprecation checks need attention" -ForegroundColor Yellow
}
else {
    Write-Host "PASSED: Deprecation check complete" -ForegroundColor Green
}

# 輸出結果
$result | ConvertTo-Json -Depth 10 | Out-File -FilePath $inventoryPath -Encoding UTF8
Write-Host "Evidence saved to: $inventoryPath"

# WARN 不阻擋 (exit 0)
exit 0
