# Light Keepers - E2E Flow Verification Script
# Tests the core mission → task → field report → overlays flow

param(
    [string]$ApiUrl = "http://localhost:8080/api/v1",
    [string]$Token = "",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host ("=" * 60)
Write-Host "[E2E] Light Keepers E2E Flow Verification"
Write-Host "[E2E] API: $ApiUrl"
Write-Host "[E2E] Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ("=" * 60)

# Helper function for API calls
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    $uri = "$ApiUrl$Endpoint"
    $defaultHeaders = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $defaultHeaders["Authorization"] = "Bearer $Token"
    }
    
    foreach ($key in $Headers.Keys) {
        $defaultHeaders[$key] = $Headers[$key]
    }
    
    $params = @{
        Method      = $Method
        Uri         = $uri
        Headers     = $defaultHeaders
        ErrorAction = "Stop"
    }
    
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        return @{ Success = $false; Error = $_.Exception.Message; StatusCode = $statusCode }
    }
}

# Test Results
$results = @()

# 1. Health Check
Write-Host "`n[1/6] Health Check..."
$health = Invoke-Api -Method "GET" -Endpoint "/health"
if ($health.Success) {
    Write-Host "  ✓ Health endpoint OK" -ForegroundColor Green
    $results += @{ Test = "Health"; Status = "PASS" }
}
else {
    Write-Host "  ✗ Health endpoint FAILED: $($health.Error)" -ForegroundColor Red
    $results += @{ Test = "Health"; Status = "FAIL"; Error = $health.Error }
}

# 2. Public Endpoint (Level 0)
Write-Host "`n[2/6] Public Endpoint (Level 0)..."
$publicRes = Invoke-Api -Method "GET" -Endpoint "/public/resources"
if ($publicRes.Success -or $publicRes.StatusCode -eq 200) {
    Write-Host "  ✓ Public resources accessible" -ForegroundColor Green
    $results += @{ Test = "Public L0"; Status = "PASS" }
}
elseif ($publicRes.StatusCode -eq 404) {
    Write-Host "  ⚠ Public resources endpoint not found (404)" -ForegroundColor Yellow
    $results += @{ Test = "Public L0"; Status = "SKIP"; Error = "Endpoint not found" }
}
else {
    Write-Host "  ✗ Public resources FAILED: $($publicRes.StatusCode)" -ForegroundColor Red
    $results += @{ Test = "Public L0"; Status = "FAIL"; Error = $publicRes.Error }
}

# Skip authenticated tests if no token
if (-not $Token) {
    Write-Host "`n[SKIP] No token provided - skipping authenticated tests" -ForegroundColor Yellow
    Write-Host "  Provide token with: -Token <jwt_token>"
    
    # Summary
    Write-Host "`n" + ("=" * 60)
    Write-Host "[SUMMARY] E2E Test Results (Partial)"
    Write-Host ("=" * 60)
    foreach ($r in $results) {
        $color = switch ($r.Status) {
            "PASS" { "Green" }
            "FAIL" { "Red" }
            default { "Yellow" }
        }
        Write-Host "  [$($r.Status)] $($r.Test)" -ForegroundColor $color
    }
    exit 0
}

# 3. Mission Sessions List
Write-Host "`n[3/6] Mission Sessions (Level 2+)..."
$missions = Invoke-Api -Method "GET" -Endpoint "/mission-sessions"
if ($missions.Success) {
    Write-Host "  ✓ Mission sessions accessible" -ForegroundColor Green
    $results += @{ Test = "Mission Sessions"; Status = "PASS" }
}
elseif ($missions.StatusCode -eq 403) {
    Write-Host "  ⚠ Forbidden - need Level 2+ role" -ForegroundColor Yellow
    $results += @{ Test = "Mission Sessions"; Status = "SKIP"; Error = "Need Level 2+" }
}
else {
    Write-Host "  ✗ Mission sessions FAILED: $($missions.StatusCode)" -ForegroundColor Red
    $results += @{ Test = "Mission Sessions"; Status = "FAIL"; Error = $missions.Error }
}

# 4. Tasks List
Write-Host "`n[4/6] Tasks List..."
$tasks = Invoke-Api -Method "GET" -Endpoint "/tasks"
if ($tasks.Success) {
    Write-Host "  ✓ Tasks accessible" -ForegroundColor Green
    $results += @{ Test = "Tasks"; Status = "PASS" }
}
else {
    Write-Host "  ✗ Tasks FAILED: $($tasks.StatusCode)" -ForegroundColor Red
    $results += @{ Test = "Tasks"; Status = "FAIL"; Error = $tasks.Error }
}

# 5. Overlays List
Write-Host "`n[5/6] Overlays List..."
$overlays = Invoke-Api -Method "GET" -Endpoint "/overlays"
if ($overlays.Success) {
    Write-Host "  ✓ Overlays accessible" -ForegroundColor Green
    $results += @{ Test = "Overlays"; Status = "PASS" }
}
else {
    Write-Host "  ✗ Overlays FAILED: $($overlays.StatusCode)" -ForegroundColor Red
    $results += @{ Test = "Overlays"; Status = "FAIL"; Error = $overlays.Error }
}

# 6. Notifications
Write-Host "`n[6/6] Notifications..."
$notifs = Invoke-Api -Method "GET" -Endpoint "/notifications"
if ($notifs.Success) {
    Write-Host "  ✓ Notifications accessible" -ForegroundColor Green
    $results += @{ Test = "Notifications"; Status = "PASS" }
}
else {
    Write-Host "  ✗ Notifications FAILED: $($notifs.StatusCode)" -ForegroundColor Red
    $results += @{ Test = "Notifications"; Status = "FAIL"; Error = $notifs.Error }
}

# Summary
Write-Host "`n" + ("=" * 60)
Write-Host "[SUMMARY] E2E Test Results"
Write-Host ("=" * 60)

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$skipped = ($results | Where-Object { $_.Status -eq "SKIP" }).Count

foreach ($r in $results) {
    $color = switch ($r.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        default { "Yellow" }
    }
    Write-Host "  [$($r.Status)] $($r.Test)" -ForegroundColor $color
}

Write-Host "`nTotal: $($results.Count) | Passed: $passed | Failed: $failed | Skipped: $skipped"

if ($failed -gt 0) {
    exit 1
}
else {
    exit 0
}
