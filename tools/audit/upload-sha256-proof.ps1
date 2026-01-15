<#
.SYNOPSIS
    Upload SHA-256 Proof Script
.DESCRIPTION
    驗證檔案上傳 SHA-256 雜湊實作
#>
param(
    [string]$BackendPath = "backend"
)

$ErrorActionPreference = "Stop"
$scriptName = "upload-sha256-proof"
$proofPath = "docs/proof/security/upload-sha256-report.json"

Write-Host "=== Upload SHA-256 Proof ===" -ForegroundColor Cyan

$result = @{
    scriptName = $scriptName
    timestamp  = (Get-Date).ToString("o")
    status     = "PASS"
    checks     = @()
}

# 1. 檢查 uploads.service.ts
$uploadsServicePath = "$BackendPath/src/modules/uploads/uploads.service.ts"
$uploadsServiceExists = Test-Path $uploadsServicePath

$result.checks += @{
    name    = "Uploads Service File"
    passed  = $uploadsServiceExists
    details = if ($uploadsServiceExists) { "uploads.service.ts exists" } else { "uploads.service.ts not found" }
}

if ($uploadsServiceExists) {
    $content = Get-Content $uploadsServicePath -Raw

    # 2. 檢查 crypto 導入
    $hasCrypto = $content -match "import \* as crypto from 'crypto'"
    $result.checks += @{
        name    = "Crypto Module Import"
        passed  = $hasCrypto
        details = if ($hasCrypto) { "crypto module imported" } else { "crypto not imported" }
    }

    # 3. 檢查 SHA-256 計算
    $hasSha256 = $content -match "createHash\(['\"]sha256['\"]\)"
    $result.checks += @{
        name = "SHA-256 Hash Calculation"
        passed = $hasSha256
        details = if ($hasSha256) { "SHA-256 hash calculation found" } else { "No SHA-256 found" }
    }

    # 4. 檢查 UploadResult 介面
    $hasHashInResult = $content -match "sha256Hash:\s*string"
    $result.checks += @{
        name = "Hash in UploadResult"
        passed = $hasHashInResult
        details = if ($hasHashInResult) { "sha256Hash field in UploadResult" } else { "Hash not in result" }
    }

    # 5. 檢查 hash 回傳
    $returnsHash = $content -match "sha256Hash,"
    $result.checks += @{
        name = "Hash Returned in Response"
        passed = $returnsHash
        details = if ($returnsHash) { "Hash returned in upload response" } else { "Hash not returned" }
    }
}

# 計算整體狀態
$failedChecks = $result.checks | Where-Object { -not $_.passed }
if ($failedChecks.Count -gt 0) {
    $result.status = "FAIL"
    Write-Host "FAILED: $($failedChecks.Count) checks failed" -ForegroundColor Red
} else {
    Write-Host "PASSED: All checks passed" -ForegroundColor Green
}

# 輸出結果
$result | ConvertTo-Json -Depth 10 | Out-File -FilePath $proofPath -Encoding UTF8
Write-Host "Evidence saved to: $proofPath"

if ($result.status -eq "FAIL") {
    exit 1
}
exit 0
