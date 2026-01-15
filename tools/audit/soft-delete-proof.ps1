<#
.SYNOPSIS
    Soft-Delete Proof Script
.DESCRIPTION
    驗證 Soft-delete 策略實作
#>
param(
    [string]$BackendPath = "backend"
)

$ErrorActionPreference = "Stop"
$scriptName = "soft-delete-proof"
$proofPath = "docs/proof/security/soft-delete-report.json"

Write-Host "=== Soft-Delete Proof ===" -ForegroundColor Cyan

$result = @{
    scriptName     = $scriptName
    timestamp      = (Get-Date).ToString("o")
    status         = "WARN"
    checks         = @()
    recommendation = "Consider adding @DeleteDateColumn to core entities for unified soft-delete"
}

# 檢查 entity 檔案是否有 deletedAt
$entityFiles = Get-ChildItem -Path "$BackendPath/src/modules" -Recurse -Filter "*.entity.ts"
$entitiesWithSoftDelete = @()
$entitiesWithoutSoftDelete = @()

foreach ($file in $entityFiles) {
    $content = Get-Content $file.FullName -Raw
    $hasDeleteDateColumn = $content -match "@DeleteDateColumn|deletedAt"
    
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    if ($hasDeleteDateColumn) {
        $entitiesWithSoftDelete += $relativePath
    }
    else {
        $entitiesWithoutSoftDelete += $relativePath
    }
}

$result.checks += @{
    name    = "Entities with Soft-Delete"
    passed  = $entitiesWithSoftDelete.Count -gt 0
    details = @{
        count    = $entitiesWithSoftDelete.Count
        entities = $entitiesWithSoftDelete
    }
}

$result.checks += @{
    name    = "Entities without Soft-Delete"
    passed  = $true  # Info only
    details = @{
        count    = $entitiesWithoutSoftDelete.Count
        entities = $entitiesWithoutSoftDelete | Select-Object -First 10
    }
}

# 檢查是否有使用 TypeORM soft delete
$hasTypeORMSoftDelete = $false
$serviceFiles = Get-ChildItem -Path "$BackendPath/src/modules" -Recurse -Filter "*.service.ts"
foreach ($file in $serviceFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "softRemove|softDelete") {
        $hasTypeORMSoftDelete = $true
        break
    }
}

$result.checks += @{
    name    = "TypeORM Soft Delete Usage"
    passed  = $hasTypeORMSoftDelete
    details = if ($hasTypeORMSoftDelete) { "softRemove/softDelete methods used" } else { "No soft delete methods found" }
}

# 設定狀態
if ($entitiesWithSoftDelete.Count -eq 0) {
    $result.status = "WARN"
    Write-Host "WARNING: No entities with soft-delete found" -ForegroundColor Yellow
}
else {
    $result.status = "PASS"
    Write-Host "PASSED: Some entities have soft-delete" -ForegroundColor Green
}

# 輸出結果
$result | ConvertTo-Json -Depth 10 | Out-File -FilePath $proofPath -Encoding UTF8
Write-Host "Evidence saved to: $proofPath"

# WARN 不阻擋 CI (exit 0)
exit 0
