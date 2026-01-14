# tools/audit/smoke-authz.ps1
# Runtime AuthZ + Throttle Smoke Verification
# Validates: Protected endpoints require auth, Public endpoints bypass, Throttle works

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$PublicPath = "/health/ready",
    [string]$ProtectedPath = "",
    [string]$RouteMappingPath = "docs/proof/security/T1-routes-guards-mapping.json",

    [int]$ThrottleBurst = 40,
    [int]$ThrottleMaxWaitSeconds = 8,

    [string]$OutDir = "docs/proof/logs",
    [switch]$FailOnNo429
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
    if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

function Normalize-BaseUrl([string]$u) {
    if ($u.EndsWith("/")) { return $u.TrimEnd("/") }
    return $u
}

function Normalize-Path([string]$p) {
    if ([string]::IsNullOrWhiteSpace($p)) { return "" }
    if ($p.StartsWith("/")) { return $p }
    return "/$p"
}

function New-HttpClient() {
    $handler = New-Object System.Net.Http.HttpClientHandler
    $client = New-Object System.Net.Http.HttpClient($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(10)
    return $client
}

function Invoke-Http(
    [System.Net.Http.HttpClient]$Client,
    [string]$Method,
    [string]$Url,
    [string]$BearerToken
) {
    $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::new($Method), $Url)

    if (![string]::IsNullOrWhiteSpace($BearerToken)) {
        $req.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $BearerToken)
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $resp = $Client.SendAsync($req).GetAwaiter().GetResult()
        $sw.Stop()

        $status = [int]$resp.StatusCode
        $body = ""
        try {
            $body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            if ($body.Length -gt 600) { $body = $body.Substring(0, 600) + "..." }
        }
        catch {
            $body = ""
        }

        return [pscustomobject]@{
            ok        = $true
            method    = $Method
            url       = $Url
            status    = $status
            reason    = $resp.ReasonPhrase
            elapsedMs = [int]$sw.ElapsedMilliseconds
            body      = $body
            error     = $null
            at        = (Get-Date).ToString("o")
        }
    }
    catch {
        $sw.Stop()
        return [pscustomobject]@{
            ok        = $false
            method    = $Method
            url       = $Url
            status    = -1
            reason    = ""
            elapsedMs = [int]$sw.ElapsedMilliseconds
            body      = ""
            error     = $_.Exception.Message
            at        = (Get-Date).ToString("o")
        }
    }
}

function Try-Resolve-ProtectedPathFromMapping([string]$MappingPath) {
    if (!(Test-Path $MappingPath)) { return "" }

    $raw = Get-Content $MappingPath -Raw -Encoding UTF8
    $json = $raw | ConvertFrom-Json

    $routes = @()
    if ($null -ne $json.routes) { $routes = $json.routes }
    elseif ($null -ne $json.mapping) { $routes = $json.mapping }
    elseif ($null -ne $json.data -and $null -ne $json.data.routes) { $routes = $json.data.routes }
    elseif ($json -is [System.Collections.IEnumerable]) { $routes = $json }
    else { $routes = @() }

    function Get-RouteMethod($r) {
        if ($null -ne $r.method) { return "$($r.method)".ToUpperInvariant() }
        if ($null -ne $r.httpMethod) { return "$($r.httpMethod)".ToUpperInvariant() }
        return ""
    }

    function Get-RoutePath($r) {
        if ($null -ne $r.path) { return "$($r.path)" }
        if ($null -ne $r.route) { return "$($r.route)" }
        if ($null -ne $r.url) { return "$($r.url)" }
        return ""
    }

    function Is-Protected($r) {
        foreach ($k in @("isProtected", "protected", "protectedProd", "isProtectedProd")) {
            if ($null -ne $r.$k) { return [bool]$r.$k }
        }
        if ($null -ne $r.prod -and $null -ne $r.prod.isProtected) { return [bool]$r.prod.isProtected }
        if ($null -ne $r.production -and $null -ne $r.production.isProtected) { return [bool]$r.production.isProtected }
        return $false
    }

    function Is-Public($r) {
        foreach ($k in @("isPublic", "public")) {
            if ($null -ne $r.$k) { return [bool]$r.$k }
        }
        if ($null -ne $r.prod -and $null -ne $r.prod.isPublic) { return [bool]$r.prod.isPublic }
        return $false
    }

    $candidate = $null
    foreach ($r in $routes) {
        $m = Get-RouteMethod $r
        $p = Get-RoutePath $r
        if ($m -ne "GET") { continue }
        if ([string]::IsNullOrWhiteSpace($p)) { continue }
        if (Is-Public $r) { continue }
        if (!(Is-Protected $r)) { continue }

        $candidate = $p
        if ($p -notmatch "[:{]") { break }
    }

    if ($null -eq $candidate) { return "" }
    return $candidate
}

# -----------------------------
# Main
# -----------------------------
$BaseUrl = Normalize-BaseUrl $BaseUrl
$PublicPath = Normalize-Path $PublicPath

if ([string]::IsNullOrWhiteSpace($ProtectedPath)) {
    $ProtectedPath = Try-Resolve-ProtectedPathFromMapping $RouteMappingPath
}
$ProtectedPath = Normalize-Path $ProtectedPath

Ensure-Dir $OutDir

$now = Get-Date
$runId = $now.ToString("yyyyMMdd-HHmmss")
$outJson = Join-Path $OutDir "T7a-authz-smoke.$runId.json"
$outTxt = Join-Path $OutDir "T7a-authz-smoke.$runId.txt"

$client = New-HttpClient

$results = New-Object System.Collections.Generic.List[object]
$failures = New-Object System.Collections.Generic.List[string]

function Add-Check($name, $obj) {
    $obj | Add-Member -NotePropertyName checkName -NotePropertyValue $name -Force
    $results.Add($obj) | Out-Null
}

"=== AuthZ Smoke Start ===" | Out-File $outTxt -Encoding UTF8
"BaseUrl: $BaseUrl" | Out-File $outTxt -Encoding UTF8 -Append
"PublicPath: $PublicPath" | Out-File $outTxt -Encoding UTF8 -Append
"ProtectedPath: $ProtectedPath" | Out-File $outTxt -Encoding UTF8 -Append
"" | Out-File $outTxt -Encoding UTF8 -Append

if ([string]::IsNullOrWhiteSpace($ProtectedPath)) {
    $msg = "WARN: ProtectedPath not resolved. Skipping protected endpoint tests."
    $msg | Out-File $outTxt -Encoding UTF8 -Append
    Write-Host $msg
}
else {
    # 1) Protected endpoint without token => 401
    $u1 = "$BaseUrl$ProtectedPath"
    $r1 = Invoke-Http -Client $client -Method "GET" -Url $u1 -BearerToken ""
    Add-Check "protected_no_token_should_401" $r1

    if ($r1.status -ne 401) {
        $failures.Add("protected_no_token_should_401: expected 401, got $($r1.status) @ $u1") | Out-Null
    }

    # 2) Protected endpoint with invalid token => 401
    $r2 = Invoke-Http -Client $client -Method "GET" -Url $u1 -BearerToken "this.is.not.a.valid.jwt"
    Add-Check "protected_invalid_token_should_401" $r2

    if ($r2.status -ne 401) {
        $failures.Add("protected_invalid_token_should_401: expected 401, got $($r2.status) @ $u1") | Out-Null
    }
}

# 3) Public endpoint without token => NOT 401 (prefer 200-399)
$u3 = "$BaseUrl$PublicPath"
$r3 = Invoke-Http -Client $client -Method "GET" -Url $u3 -BearerToken ""
Add-Check "public_no_token_should_not_401" $r3

if ($r3.status -eq 401 -or $r3.status -lt 200 -or $r3.status -ge 500) {
    $failures.Add("public_no_token_should_not_401: expected 2xx/3xx/4xx(non-401), got $($r3.status) @ $u3") | Out-Null
}

# 4) Throttling burst => expect at least one 429
$found429 = $false
if (![string]::IsNullOrWhiteSpace($ProtectedPath)) {
    $targetUrl = "$BaseUrl$ProtectedPath"
}
else {
    $targetUrl = "$BaseUrl$PublicPath"
}

"--- Throttle Burst ($ThrottleBurst) on $targetUrl ---" | Out-File $outTxt -Encoding UTF8 -Append

$burstStatuses = @()
for ($i = 1; $i -le $ThrottleBurst; $i++) {
    $ri = Invoke-Http -Client $client -Method "GET" -Url $targetUrl -BearerToken ""
    Add-Check "throttle_burst_request_$i" $ri

    $burstStatuses += $ri.status
    if ($ri.status -eq 429) { $found429 = $true }
}

if (-not $found429) {
    $msg = "WARN: No 429 detected in throttle burst. Threshold may be high or throttling disabled."
    $msg | Out-File $outTxt -Encoding UTF8 -Append
    if ($FailOnNo429) {
        $failures.Add("throttle_expected_429_but_not_found") | Out-Null
    }
}
else {
    "PASS: 429 detected in burst." | Out-File $outTxt -Encoding UTF8 -Append
}

# Summary output
"" | Out-File $outTxt -Encoding UTF8 -Append
"=== Summary ===" | Out-File $outTxt -Encoding UTF8 -Append

$summary = [pscustomobject]@{
    version          = "1.0.0"
    generatedAt      = (Get-Date).ToString("o")
    baseUrl          = $BaseUrl
    publicPath       = $PublicPath
    protectedPath    = $ProtectedPath
    routeMappingPath = $RouteMappingPath
    throttleBurst    = $ThrottleBurst
    found429         = $found429
    failures         = $failures
    ok               = ($failures.Count -eq 0)
}

("OK: " + $summary.ok) | Out-File $outTxt -Encoding UTF8 -Append
if ($failures.Count -gt 0) {
    "Failures:" | Out-File $outTxt -Encoding UTF8 -Append
    $failures | ForEach-Object { " - $_" } | Out-File $outTxt -Encoding UTF8 -Append
}

# Write JSON
[pscustomobject]@{
    summary = $summary
    checks  = $results
} | ConvertTo-Json -Depth 12 | Set-Content -Path $outJson -Encoding UTF8

Write-Host "[smoke-authz] Written: $outTxt"
Write-Host "[smoke-authz] Written: $outJson"
Write-Host "[smoke-authz] OK: $($summary.ok)"

if ($summary.ok) {
    exit 0
}
else {
    exit 1
}
