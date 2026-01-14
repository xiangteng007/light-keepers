<#
.SYNOPSIS
    P1-3: Smoke Authorization Tests
.DESCRIPTION
    Runtime verification of authentication/authorization behavior.
    Tests: Default Deny, Public Bypass, Invalid Token, Throttling.
.OUTPUTS
    docs/proof/logs/T7a-smoke-authz.txt
    docs/proof/api/T7a-authz-requests-responses.txt
#>

param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " P1-3: Smoke Authorization Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
$results = @()
$requestLogs = @()

# Test 1: Protected endpoint without token => 401
Write-Host "[TEST 1] Protected endpoint without token..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/auth/me" -Method GET -SkipHttpErrorCheck
    $status = $response.StatusCode
    $pass = $status -eq 401
    $results += @{
        test     = "T1: Protected endpoint (no token)"
        endpoint = "GET /auth/me"
        expected = 401
        actual   = $status
        pass     = $pass
    }
    $requestLogs += "=== TEST 1: Protected endpoint (no token) ===`nGET /auth/me`nStatus: $status`nBody: $($response.Content | Select-Object -First 200)`n"
    Write-Host "  Status: $status (Expected: 401) - $(if($pass){'PASS'}else{'FAIL'})" -ForegroundColor $(if ($pass) { 'Green' }else { 'Red' })
}
catch {
    $results += @{ test = "T1"; pass = $false; error = $_.Exception.Message }
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Protected endpoint with invalid token => 401
Write-Host "[TEST 2] Protected endpoint with invalid token..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer invalid.token.here" }
    $response = Invoke-WebRequest -Uri "$BaseUrl/auth/me" -Method GET -Headers $headers -SkipHttpErrorCheck
    $status = $response.StatusCode
    $pass = $status -eq 401
    $results += @{
        test     = "T2: Protected endpoint (invalid token)"
        endpoint = "GET /auth/me"
        expected = 401
        actual   = $status
        pass     = $pass
    }
    $requestLogs += "=== TEST 2: Protected endpoint (invalid token) ===`nGET /auth/me`nAuthorization: Bearer invalid.token.here`nStatus: $status`nBody: $($response.Content | Select-Object -First 200)`n"
    Write-Host "  Status: $status (Expected: 401) - $(if($pass){'PASS'}else{'FAIL'})" -ForegroundColor $(if ($pass) { 'Green' }else { 'Red' })
}
catch {
    $results += @{ test = "T2"; pass = $false; error = $_.Exception.Message }
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Public endpoint without token => NOT 401
Write-Host "[TEST 3] Public endpoint without token..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method GET -SkipHttpErrorCheck
    $status = $response.StatusCode
    $pass = $status -ne 401
    $results += @{
        test     = "T3: Public endpoint (no token)"
        endpoint = "GET /health"
        expected = "NOT 401"
        actual   = $status
        pass     = $pass
    }
    $requestLogs += "=== TEST 3: Public endpoint (no token) ===`nGET /health`nStatus: $status`nBody: $($response.Content | Select-Object -First 200)`n"
    Write-Host "  Status: $status (Expected: NOT 401) - $(if($pass){'PASS'}else{'FAIL'})" -ForegroundColor $(if ($pass) { 'Green' }else { 'Red' })
}
catch {
    $results += @{ test = "T3"; pass = $false; error = $_.Exception.Message }
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Throttle test (simulate high frequency)
Write-Host "[TEST 4] Throttle test (10 rapid requests to login)..." -ForegroundColor Yellow
try {
    $throttleHit = $false
    $body = @{ email = "test@test.com"; password = "wrongpassword" } | ConvertTo-Json
    for ($i = 1; $i -le 15; $i++) {
        $response = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method POST -Body $body -ContentType "application/json" -SkipHttpErrorCheck
        if ($response.StatusCode -eq 429) {
            $throttleHit = $true
            Write-Host "  Throttle hit at request #$i (429)" -ForegroundColor Green
            break
        }
    }
    $results += @{
        test     = "T4: Throttle protection"
        endpoint = "POST /auth/login"
        expected = "429 after rate limit"
        actual   = $(if ($throttleHit) { "429 at request #$i" }else { "No throttle after 15 requests" })
        pass     = $throttleHit
    }
    $requestLogs += "=== TEST 4: Throttle test ===`nPOST /auth/login x15`nThrottle hit: $throttleHit`n"
    Write-Host "  Throttle effective: $(if($throttleHit){'PASS'}else{'FAIL (no 429)'})" -ForegroundColor $(if ($throttleHit) { 'Green' }else { 'Yellow' })
}
catch {
    $results += @{ test = "T4"; pass = $false; error = $_.Exception.Message }
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
$passCount = ($results | Where-Object { $_.pass -eq $true }).Count
$totalCount = $results.Count

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Summary: $passCount / $totalCount PASS" -ForegroundColor $(if ($passCount -eq $totalCount) { 'Green' }else { 'Yellow' })
Write-Host "========================================" -ForegroundColor Cyan

# Output files
$outputDir = Join-Path $PSScriptRoot "..\..\docs\proof"
$logsDir = Join-Path $outputDir "logs"
$apiDir = Join-Path $outputDir "api"

if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }
if (-not (Test-Path $apiDir)) { New-Item -ItemType Directory -Path $apiDir -Force | Out-Null }

# Write smoke log
$smokeLog = @"
# P1-3 Smoke Authorization Tests
Generated: $timestamp
Base URL: $BaseUrl

## Results Summary
- Total Tests: $totalCount
- Passed: $passCount
- Failed: $($totalCount - $passCount)

## Test Details
"@

foreach ($r in $results) {
    $smokeLog += "`n### $($r.test)"
    $smokeLog += "`n- Endpoint: $($r.endpoint)"
    $smokeLog += "`n- Expected: $($r.expected)"
    $smokeLog += "`n- Actual: $($r.actual)"
    $smokeLog += "`n- Status: $(if($r.pass){'PASS'}else{'FAIL'})"
    if ($r.error) { $smokeLog += "`n- Error: $($r.error)" }
}

$smokeLog | Out-File -FilePath (Join-Path $logsDir "T7a-smoke-authz.txt") -Encoding utf8 -Force
Write-Host "Generated: docs/proof/logs/T7a-smoke-authz.txt" -ForegroundColor Green

# Write request/response log
$requestLogs -join "`n" | Out-File -FilePath (Join-Path $apiDir "T7a-authz-requests-responses.txt") -Encoding utf8 -Force
Write-Host "Generated: docs/proof/api/T7a-authz-requests-responses.txt" -ForegroundColor Green

# Exit code
if ($passCount -eq $totalCount) {
    Write-Host "`n[P1-3] Smoke Authorization: ALL PASS" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`n[P1-3] Smoke Authorization: $($totalCount - $passCount) FAILED" -ForegroundColor Yellow
    exit 1
}
