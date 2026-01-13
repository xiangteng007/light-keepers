/**
* Route-Guard Mapping Scanner
* 
* Purpose: Generate a mapping of all API routes to their guards/decorators
* Strategy: Parse controller files for decorators (static analysis)
* 
* Output:
* - /docs/proof/security/T1-routes-guards-mapping.json
* - /docs/proof/security/T1-routes-guards-report.md
* - /docs/proof/logs/T1-route-guard-scan.txt
* 
* Usage: pwsh tools/audit/scan-routes-guards.ps1
*/

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = "Stop"

# Paths
$BackendSrc = Join-Path $RootDir "backend\src"
$OutputDir = Join-Path $RootDir "docs\proof\security"
$LogsDir = Join-Path $RootDir "docs\proof\logs"

# Ensure output directories exist
foreach ($dir in @($OutputDir, $LogsDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

Write-Host "Starting route-guard mapping scan..." -ForegroundColor Cyan
Write-Host "   Backend: $BackendSrc"
Write-Host ""

# Result storage
$allRoutes = @()
$controllerStats = @{
    total         = 0
    withGuards    = 0
    withoutGuards = 0
}

# Find all controller files
$controllerFiles = Get-ChildItem -Path $BackendSrc -Recurse -Filter "*.controller.ts" -File |
Where-Object { 
    $_.FullName -notmatch "\\(node_modules|dist|test|mock|deprecated)\\"
}

Write-Host "Found $($controllerFiles.Count) controller files" -ForegroundColor Yellow

foreach ($controllerFile in $controllerFiles) {
    $content = Get-Content $controllerFile.FullName -Raw
    $lines = Get-Content $controllerFile.FullName
    $relativePath = $controllerFile.FullName.Substring($RootDir.Length + 1).Replace("\", "/")
    
    # Extract controller path
    $controllerPath = ""
    $controllerMatch = [regex]::Match($content, '@Controller\([''"]([^''"]*)[''"]')
    if ($controllerMatch.Success) {
        $controllerPath = $controllerMatch.Groups[1].Value
    }
    
    # Check for controller-level guards
    $controllerGuards = @()
    $useGuardsMatch = [regex]::Match($content, '@UseGuards\(([^)]+)\)')
    if ($useGuardsMatch.Success) {
        $controllerGuards = $useGuardsMatch.Groups[1].Value -split ",\s*" | ForEach-Object { $_.Trim() }
    }
    
    # Check for RequireLevel at controller level
    $controllerLevel = $null
    $levelMatch = [regex]::Match($content, '@RequireLevel\((\d+)\)')
    if ($levelMatch.Success) {
        $controllerLevel = [int]$levelMatch.Groups[1].Value
    }
    
    $controllerStats.total++
    $hasAnyGuard = $controllerGuards.Count -gt 0 -or $null -ne $controllerLevel
    
    # Find all route methods
    $httpMethods = @("Get", "Post", "Put", "Patch", "Delete", "All")
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        foreach ($method in $httpMethods) {
            $methodPattern = "@$method\s*\(([^)]*)\)"
            $methodMatch = [regex]::Match($line, $methodPattern)
            
            if ($methodMatch.Success) {
                $routePath = ""
                $pathMatch = [regex]::Match($methodMatch.Groups[1].Value, '[''"]([^''"]*)[''"]')
                if ($pathMatch.Success) {
                    $routePath = $pathMatch.Groups[1].Value
                }
                
                $fullPath = if ($controllerPath -and $routePath) {
                    "/$controllerPath/$routePath"
                }
                elseif ($controllerPath) {
                    "/$controllerPath"
                }
                elseif ($routePath) {
                    "/$routePath"
                }
                else {
                    "/"
                }
                
                # Clean up path
                $fullPath = $fullPath -replace "//+", "/"
                
                # Look backwards for guards/decorators (up to 15 lines)
                $methodGuards = @()
                $methodLevel = $null
                $methodRoles = @()
                $isPublic = $false
                $hasThrottle = $false
                
                $lookbackStart = [Math]::Max(0, $i - 15)
                for ($j = $lookbackStart; $j -lt $i; $j++) {
                    $prevLine = $lines[$j]
                    
                    $guardsMatch = [regex]::Match($prevLine, '@UseGuards\(([^)]+)\)')
                    if ($guardsMatch.Success) {
                        $methodGuards += $guardsMatch.Groups[1].Value -split ",\s*" | ForEach-Object { $_.Trim() }
                    }
                    
                    $levelMatch = [regex]::Match($prevLine, '@RequireLevel\((\d+)\)')
                    if ($levelMatch.Success) {
                        $methodLevel = [int]$levelMatch.Groups[1].Value
                    }
                    
                    $rolesMatch = [regex]::Match($prevLine, '@Roles\(([^)]+)\)')
                    if ($rolesMatch.Success) {
                        $methodRoles += $rolesMatch.Groups[1].Value -split ",\s*" | ForEach-Object { $_.Trim().Trim("'`"") }
                    }
                    
                    if ($prevLine -match '@Public\(\)') {
                        $isPublic = $true
                    }
                    
                    if ($prevLine -match '@Throttle\(') {
                        $hasThrottle = $true
                    }
                }
                
                # Combine guards
                $effectiveGuards = @()
                $effectiveGuards += $controllerGuards
                $effectiveGuards += $methodGuards
                $effectiveGuards = $effectiveGuards | Select-Object -Unique
                
                $effectiveLevel = if ($null -ne $methodLevel) { $methodLevel } else { $controllerLevel }
                
                $hasGuard = ($effectiveGuards.Count -gt 0) -or ($null -ne $effectiveLevel) -or $isPublic
                if ($hasGuard) { $hasAnyGuard = $true }
                
                $routeInfo = [PSCustomObject]@{
                    method        = $method.ToUpper()
                    path          = $fullPath
                    controller    = $relativePath
                    lineNumber    = $i + 1
                    guards        = $effectiveGuards
                    requireLevel  = $effectiveLevel
                    requiredLevel = $effectiveLevel  # alias for validator
                    roles         = $methodRoles
                    isPublic      = $isPublic
                    public        = $isPublic  # alias for validator
                    hasThrottle   = $hasThrottle
                    throttle      = if ($hasThrottle) { "decorator-present" } else { $null }
                    hasGuard      = $hasGuard
                    protected     = $hasGuard -and (-not $isPublic)  # protected if has guard and not public
                    risk          = if (-not $hasGuard) { "HIGH" } elseif ($isPublic) { "LOW" } else { "MEDIUM" }
                }
                
                $allRoutes += $routeInfo
            }
        }
    }
    
    if ($hasAnyGuard) {
        $controllerStats.withGuards++
    }
    else {
        $controllerStats.withoutGuards++
    }
}

# Calculate statistics
$totalRoutes = $allRoutes.Count
$protectedRoutes = @($allRoutes | Where-Object { $_.hasGuard }).Count
$unprotectedRoutes = $totalRoutes - $protectedRoutes
$publicRoutes = @($allRoutes | Where-Object { $_.isPublic }).Count
$highRiskRoutes = @($allRoutes | Where-Object { $_.risk -eq "HIGH" })

$coverage = if ($totalRoutes -gt 0) {
    [math]::Round(($protectedRoutes / $totalRoutes) * 100, 1)
}
else { 0 }

Write-Host ""
Write-Host "Route Statistics:" -ForegroundColor Cyan
Write-Host "   Total Routes: $totalRoutes"
Write-Host "   Protected: $protectedRoutes ($coverage%)"
Write-Host "   Unprotected: $unprotectedRoutes"
Write-Host "   Public: $publicRoutes"
Write-Host "   High Risk: $($highRiskRoutes.Count)"

# Generate outputs
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# JSON Mapping
$mapping = @{
    version      = "1.0.0"
    generated_at = $timestamp
    generated_by = "scan-routes-guards.ps1"
    summary      = @{
        total_routes       = $totalRoutes
        protected_routes   = $protectedRoutes
        unprotected_routes = $unprotectedRoutes
        public_routes      = $publicRoutes
        high_risk_routes   = $highRiskRoutes.Count
        coverage_percent   = $coverage
        controller_stats   = $controllerStats
    }
    routes       = $allRoutes
}

$mappingJson = $mapping | ConvertTo-Json -Depth 10
$mappingPath = Join-Path $OutputDir "T1-routes-guards-mapping.json"
$mappingJson | Out-File -FilePath $mappingPath -Encoding utf8
Write-Host "Written: $mappingPath" -ForegroundColor Green

# Markdown Report
$highRiskTable = ""
if ($highRiskRoutes.Count -gt 0) {
    $highRiskTable = "| Method | Path | Controller | Line |`n|--------|------|------------|-----:|`n"
    foreach ($route in $highRiskRoutes) {
        $highRiskTable += "| $($route.method) | ``$($route.path)`` | $($route.controller) | $($route.lineNumber) |`n"
    }
}
else {
    $highRiskTable = "> All routes are protected!"
}

$protectedWithLevel = $allRoutes | Where-Object { $null -ne $_.requireLevel } | Select-Object -First 30
$levelList = ""
foreach ($route in $protectedWithLevel) {
    $levelList += "- ``$($route.method) $($route.path)`` -> Level $($route.requireLevel)`n"
}

$publicList = ""
foreach ($route in @($allRoutes | Where-Object { $_.isPublic })) {
    $publicList += "- ``$($route.method) $($route.path)`` -> @Public()`n"
}

$report = @"
# Route-Guard Mapping Report

> **Generated**: $timestamp  
> **Script**: scan-routes-guards.ps1  
> **Spec**: baseline-counting-spec.md@v1

---

## Summary

| Metric | Value |
|--------|------:|
| Total Routes | $totalRoutes |
| Protected Routes | $protectedRoutes |
| Unprotected Routes | $unprotectedRoutes |
| Public Routes | $publicRoutes |
| **Coverage** | **$coverage%** |

---

## Controller Statistics

| Metric | Value |
|--------|------:|
| Total Controllers | $($controllerStats.total) |
| With Guards | $($controllerStats.withGuards) |
| Without Guards | $($controllerStats.withoutGuards) |

---

## High-Risk Routes (Missing Guards)

$highRiskTable

---

## Protected Routes by Guard Type

### With RequireLevel

$levelList

### Explicitly Public

$publicList

---

## Next Steps

1. Review high-risk routes and add appropriate guards
2. Run E2E tests on 10 high-risk endpoints
3. Calculate security maturity score

---

**Full data**: [T1-routes-guards-mapping.json](T1-routes-guards-mapping.json)
"@

$reportPath = Join-Path $OutputDir "T1-routes-guards-report.md"
$report | Out-File -FilePath $reportPath -Encoding utf8
Write-Host "Written: $reportPath" -ForegroundColor Green

# Scan log
$highRiskList = ""
if ($highRiskRoutes.Count -eq 0) {
    $highRiskList = "None - all routes are protected!"
}
else {
    foreach ($route in $highRiskRoutes) {
        $highRiskList += "$($route.method) $($route.path) [$($route.controller):$($route.lineNumber)]`n"
    }
}

$logContent = @"
Route-Guard Scan Log
====================
Generated: $timestamp
Script: scan-routes-guards.ps1

SCAN RESULTS
------------
Controllers Scanned: $($controllerStats.total)
Total Routes Found: $totalRoutes
Protected Routes: $protectedRoutes ($coverage%)
Unprotected Routes: $unprotectedRoutes
Public Routes: $publicRoutes

HIGH-RISK ROUTES
----------------
$highRiskList

"@

$logPath = Join-Path $LogsDir "T1-route-guard-scan.txt"
$logContent | Out-File -FilePath $logPath -Encoding utf8
Write-Host "Written: $logPath" -ForegroundColor Green

Write-Host ""
Write-Host "Route-guard mapping scan complete!" -ForegroundColor Green
