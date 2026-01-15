<#
.SYNOPSIS
    PWA Service Worker Cache Proof Script
.DESCRIPTION
    驗證 PWA Service Worker 快取配置
#>
param(
    [string]$WebDashboardPath = "web-dashboard"
)

$ErrorActionPreference = "Stop"
$scriptName = "pwa-cache-proof"
$proofPath = "docs/proof/pwa/sw-cache-report.json"

Write-Host "=== PWA Cache Proof ===" -ForegroundColor Cyan

$result = @{
    scriptName = $scriptName
    timestamp = (Get-Date).ToString("o")
    status = "PASS"
    checks = @()
}

# 1. 檢查 vite-plugin-pwa 配置
$viteConfig = Get-Content "$WebDashboardPath/vite.config.ts" -Raw
$hasVitePWA = $viteConfig -match "VitePWA\("

$result.checks += @{
    name = "VitePWA Plugin Configured"
    passed = $hasVitePWA
    details = if ($hasVitePWA) { "VitePWA plugin found in vite.config.ts" } else { "VitePWA plugin not found" }
}

# 2. 檢查 Workbox 配置
$hasWorkbox = $viteConfig -match "workbox:\s*\{"
$hasRuntimeCaching = $viteConfig -match "runtimeCaching:"
$hasGlobPatterns = $viteConfig -match "globPatterns:"

$result.checks += @{
    name = "Workbox Configuration"
    passed = $hasWorkbox -and $hasRuntimeCaching
    details = @{
        workboxBlock = $hasWorkbox
        runtimeCaching = $hasRuntimeCaching
        globPatterns = $hasGlobPatterns
    }
}

# 3. 檢查快取策略
$hasNetworkFirst = $viteConfig -match "handler:\s*'NetworkFirst'"
$hasCacheFirst = $viteConfig -match "handler:\s*'CacheFirst'"

$result.checks += @{
    name = "Caching Strategies"
    passed = $hasNetworkFirst -and $hasCacheFirst
    details = @{
        networkFirst = $hasNetworkFirst
        cacheFirst = $hasCacheFirst
    }
}

# 4. 檢查 manifest
$hasManifest = $viteConfig -match "manifest:\s*\{"
$hasIcons = $viteConfig -match "icons:\s*\["

$result.checks += @{
    name = "PWA Manifest"
    passed = $hasManifest -and $hasIcons
    details = @{
        manifest = $hasManifest
        icons = $hasIcons
    }
}

# 5. 檢查離線 API 快取
$hasApiCache = $viteConfig -match "cacheName:\s*'api-cache'"

$result.checks += @{
    name = "API Cache Configuration"
    passed = $hasApiCache
    details = if ($hasApiCache) { "API cache configured with 'api-cache' name" } else { "No API cache found" }
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
