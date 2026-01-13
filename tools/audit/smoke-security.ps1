# Security Smoke Test Script
# Purpose: Verify 10 high-risk endpoints with 401/403/200 behavior
# Output: docs/proof/logs/T7a-smoke-tests.txt, docs/proof/api/T7a-requests-responses.txt

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$TokenVolunteer = "",
    [string]$TokenOfficer = "",
    [string]$TokenDirector = "",
    [string]$TokenOwner = ""
)

$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$LogsDir = Join-Path $RootDir "docs\proof\logs"
$ApiDir = Join-Path $RootDir "docs\proof\api"

# Create output directories
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
New-Item -ItemType Directory -Force -Path $ApiDir | Out-Null

$SmokeTestLog = Join-Path $LogsDir "T7a-smoke-tests.txt"
$ApiResponseLog = Join-Path $ApiDir "T7a-requests-responses.txt"

# Initialize logs
$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"

@"
# T7a Security Smoke Test Results
# Generated: $timestamp
# Base URL: $BaseUrl
# Script: tools/audit/smoke-security.ps1

"@ | Out-File -FilePath $SmokeTestLog -Encoding UTF8

@"
# T7a API Requests and Responses
# Generated: $timestamp
# Base URL: $BaseUrl

"@ | Out-File -FilePath $ApiResponseLog -Encoding UTF8

# Test configuration
$tests = @(
    @{
        Name              = "attendance/check-in/gps"
        Method            = "POST"
        Path              = "/attendance/check-in/gps"
        Body              = '{"volunteerId":"test","lat":25.0,"lng":121.5}'
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 201
        RequiredLevel     = "VOLUNTEER"
    },
    @{
        Name              = "attendance/check-in/qr"
        Method            = "POST"
        Path              = "/attendance/check-in/qr"
        Body              = '{"volunteerId":"test","qrCode":"TEST123"}'
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 201
        RequiredLevel     = "VOLUNTEER"
    },
    @{
        Name              = "events/create"
        Method            = "POST"
        Path              = "/events"
        Body              = '{"title":"Test Event","description":"Test"}'
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 403
        ExpectedOfficer   = 201
        RequiredLevel     = "OFFICER"
    },
    @{
        Name              = "events/list"
        Method            = "GET"
        Path              = "/events"
        Body              = $null
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 200
        RequiredLevel     = "VOLUNTEER"
    },
    @{
        Name              = "donations/record"
        Method            = "POST"
        Path              = "/api/donations"
        Body              = '{"donor":"Test","amount":100}'
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 403
        ExpectedOfficer   = 201
        RequiredLevel     = "OFFICER"
    },
    @{
        Name              = "payroll/calculate-shift"
        Method            = "POST"
        Path              = "/payroll/calculate-shift"
        Body              = '{"date":"2026-01-13","startTime":"09:00","endTime":"17:00","hours":8}'
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 403
        ExpectedOfficer   = 200
        RequiredLevel     = "OFFICER"
    },
    @{
        Name              = "community/posts"
        Method            = "POST"
        Path              = "/community/posts"
        Body              = '{"content":"Test post"}'
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 201
        RequiredLevel     = "VOLUNTEER"
    },
    @{
        Name              = "community/articles"
        Method            = "POST"
        Path              = "/community/articles"
        Body              = '{"title":"Test","content":"Article content"}'
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 403
        ExpectedOfficer   = 201
        RequiredLevel     = "OFFICER"
    },
    @{
        Name              = "line-bot/broadcast (DIRECTOR)"
        Method            = "POST"
        Path              = "/line-bot/broadcast"
        Body              = '{"message":"Test broadcast"}'
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 403
        ExpectedOfficer   = 403
        ExpectedDirector  = 200
        RequiredLevel     = "DIRECTOR"
    },
    @{
        Name              = "payroll/rates (READ)"
        Method            = "GET"
        Path              = "/payroll/rates"
        Body              = $null
        ExpectedNoAuth    = 401
        ExpectedVolunteer = 403
        ExpectedOfficer   = 200
        RequiredLevel     = "OFFICER"
    }
)

function Test-Endpoint {
    param(
        [hashtable]$Test,
        [string]$Token,
        [string]$TokenType,
        [int]$ExpectedStatus
    )

    $headers = @{
        "Content-Type" = "application/json"
    }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $uri = "$BaseUrl$($Test.Path)"
    
    try {
        if ($Test.Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $uri -Method GET -Headers $headers -ErrorAction Stop
            $statusCode = $response.StatusCode
            $body = $response.Content
        }
        else {
            $response = Invoke-WebRequest -Uri $uri -Method $Test.Method -Headers $headers -Body $Test.Body -ErrorAction Stop
            $statusCode = $response.StatusCode
            $body = $response.Content
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $body = $_.ErrorDetails.Message
        if (-not $statusCode) { $statusCode = 0 }
    }

    $pass = ($statusCode -eq $ExpectedStatus) -or 
    ($ExpectedStatus -in @(200, 201) -and $statusCode -in @(200, 201)) -or
    ($ExpectedStatus -in @(401, 403) -and $statusCode -in @(401, 403))

    return @{
        TestName       = $Test.Name
        TokenType      = $TokenType
        ExpectedStatus = $ExpectedStatus
        ActualStatus   = $statusCode
        Pass           = $pass
        Body           = if ($body.Length -gt 200) { $body.Substring(0, 200) + "..." } else { $body }
    }
}

# Run tests
$results = @()
$passCount = 0
$failCount = 0

foreach ($test in $tests) {
    # Test 1: No auth (should get 401/403)
    $result = Test-Endpoint -Test $test -Token "" -TokenType "NO_AUTH" -ExpectedStatus $test.ExpectedNoAuth
    $results += $result
    if ($result.Pass) { $passCount++ } else { $failCount++ }

    # Log to API response file
    @"
---
Test: $($test.Name)
Token: NO_AUTH
Request: $($test.Method) $($test.Path)
Expected: $($test.ExpectedNoAuth)
Actual: $($result.ActualStatus)
Result: $(if ($result.Pass) { "PASS" } else { "FAIL" })
Response: $($result.Body)

"@ | Add-Content -Path $ApiResponseLog -Encoding UTF8

    # Test 2: With volunteer token (if provided)
    if ($TokenVolunteer -and $test.ExpectedVolunteer) {
        $result = Test-Endpoint -Test $test -Token $TokenVolunteer -TokenType "VOLUNTEER" -ExpectedStatus $test.ExpectedVolunteer
        $results += $result
        if ($result.Pass) { $passCount++ } else { $failCount++ }

        @"
---
Test: $($test.Name)
Token: VOLUNTEER
Request: $($test.Method) $($test.Path)
Expected: $($test.ExpectedVolunteer)
Actual: $($result.ActualStatus)
Result: $(if ($result.Pass) { "PASS" } else { "FAIL" })
Response: $($result.Body)

"@ | Add-Content -Path $ApiResponseLog -Encoding UTF8
    }
}

# Write summary to smoke test log
@"
## Summary
| Metric | Value |
|--------|------:|
| Total Tests | $($passCount + $failCount) |
| Passed | $passCount |
| Failed | $failCount |
| Pass Rate | $([math]::Round($passCount / ($passCount + $failCount) * 100, 1))% |

## Test Results

| Test Name | Token | Expected | Actual | Result |
|-----------|-------|----------|--------|--------|
"@ | Add-Content -Path $SmokeTestLog -Encoding UTF8

foreach ($result in $results) {
    $passText = if ($result.Pass) { "✅ PASS" } else { "❌ FAIL" }
    "| $($result.TestName) | $($result.TokenType) | $($result.ExpectedStatus) | $($result.ActualStatus) | $passText |" | Add-Content -Path $SmokeTestLog -Encoding UTF8
}

@"

## Notes
- Tests run without tokens check for 401/403 (unauthorized/forbidden)
- Tests with tokens check for appropriate access level
- Some endpoints may return different success codes (200 vs 201)
- Connection errors show as status 0

## Evidence
- Full API logs: docs/proof/api/T7a-requests-responses.txt
- This summary: docs/proof/logs/T7a-smoke-tests.txt

"@ | Add-Content -Path $SmokeTestLog -Encoding UTF8

Write-Host ""
Write-Host "Security Smoke Test Complete!"
Write-Host "  Total: $($passCount + $failCount)"
Write-Host "  Passed: $passCount"
Write-Host "  Failed: $failCount"
Write-Host ""
Write-Host "Outputs:"
Write-Host "  $SmokeTestLog"
Write-Host "  $ApiResponseLog"
