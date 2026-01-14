# ============================================
# FILE: tools/audit/smoke-authz.ps1
# VERSION: 1.1.0
# PURPOSE: Runtime AuthZ + Throttle Smoke Verification (Evidence-first)
# OUTPUT:
# - docs/proof/logs/T7a-authz-smoke.<timestamp>.json/.txt
# - docs/proof/logs/T7a-authz-smoke.latest.json/.txt   (stable reference)
# ============================================

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$PublicPath = "/health/ready",
    [string]$ProtectedPath = "",
    [string]$ProtectedMethod = "GET",
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
        if ($p -notmatch "[:{]") { break } # prefer non-parameterized
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
$ProtectedMethod = "$ProtectedMethod".ToUpperInvariant()

Ensure-Dir $OutDir

$now = Get-Date
$runId = $now.ToString("yyyyMMdd-HHmmss")

$outJson = Join-Path $OutDir "T7a-authz-smoke.$runId.json"
$outTxt = Join-Path $OutDir "T7a-authz-smoke.$runId.txt"

$outJsonLatest = Join-Path $OutDir "T7a-authz-smoke.latest.json"
$outTxtLatest = Join-Path $OutDir "T7a-authz-smoke.latest.txt"

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
"ProtectedMethod: $ProtectedMethod" | Out-File $outTxt -Encoding UTF8 -Append
"" | Out-File $outTxt -Encoding UTF8 -Append

if ([string]::IsNullOrWhiteSpace($ProtectedPath)) {
    $msg = "FAIL: ProtectedPath not resolved. Provide -ProtectedPath explicitly or ensure $RouteMappingPath contains protected GET routes."
    $failures.Add($msg) | Out-Null
    $msg | Out-File $outTxt -Encoding UTF8 -Append
}
else {
    $u1 = "$BaseUrl$ProtectedPath"

    # 1) Protected endpoint without token => 401
    $r1 = Invoke-Http -Client $client -Method $ProtectedMethod -Url $u1 -BearerToken ""
    Add-Check "protected_no_token_should_401" $r1
    if ($r1.status -ne 401) {
        $failures.Add("protected_no_token_should_401: expected 401, got $($r1.status) @ $u1") | Out-Null
    }

    # 2) Protected endpoint with invalid token => 401 (allow 403 in some deployments)
    $r2 = Invoke-Http -Client $client -Method $ProtectedMethod -Url $u1 -BearerToken "this.is.not.a.valid.jwt"
    Add-Check "protected_invalid_token_should_401_or_403" $r2
    if (($r2.status -ne 401) -and ($r2.status -ne 403)) {
        $failures.Add("protected_invalid_token_should_401_or_403: expected 401/403, got $($r2.status) @ $u1") | Out-Null
    }
}

# 3) Public endpoint without token => NOT 401 (prefer 200-399; allow 4xx except 401)
$u3 = "$BaseUrl$PublicPath"
$r3 = Invoke-Http -Client $client -Method "GET" -Url $u3 -BearerToken ""
Add-Check "public_no_token_should_not_401" $r3

if ($r3.status -eq 401 -or $r3.status -lt 200 -or $r3.status -ge 500) {
    $failures.Add("public_no_token_should_not_401: expected 2xx/3xx/4xx(non-401), got $($r3.status) @ $u3") | Out-Null
}

# 4) Throttling burst => expect at least one 429 (best-effort)
$found429 = $false
$targetUrl = if (![string]::IsNullOrWhiteSpace($ProtectedPath)) { "$BaseUrl$ProtectedPath" } else { "$BaseUrl$PublicPath" }

"--- Throttle Burst ($ThrottleBurst) on $targetUrl ---" | Out-File $outTxt -Encoding UTF8 -Append

$burstStart = Get-Date
$attempt = 0

while ($true) {
    $attempt++
    for ($i = 1; $i -le $ThrottleBurst; $i++) {
        $ri = Invoke-Http -Client $client -Method "GET" -Url $targetUrl -BearerToken ""
        Add-Check "throttle_burst_attempt_${attempt}_request_$i" $ri
        if ($ri.status -eq 429) { $found429 = $true; break }
    }

    if ($found429) { break }

    $elapsed = (New-TimeSpan -Start $burstStart -End (Get-Date)).TotalSeconds
    if ($elapsed -ge $ThrottleMaxWaitSeconds) { break }

    Start-Sleep -Seconds 1
}

if (-not $found429) {
    $msg = "WARN: No 429 detected within burst window ($ThrottleMaxWaitSeconds s). Threshold may be high or throttling disabled."
    $msg | Out-File $outTxt -Encoding UTF8 -Append
    if ($FailOnNo429) {
        $failures.Add("throttle_expected_429_but_not_found") | Out-Null
    }
}
else {
    "PASS: 429 detected in burst window." | Out-File $outTxt -Encoding UTF8 -Append
}

# Summary output
"" | Out-File $outTxt -Encoding UTF8 -Append
"=== Summary ===" | Out-File $outTxt -Encoding UTF8 -Append

$summary = [pscustomobject]@{
    version                = "1.1.0"
    generatedAt            = (Get-Date).ToString("o")
    baseUrl                = $BaseUrl
    publicPath             = $PublicPath
    protectedPath          = $ProtectedPath
    protectedMethod        = $ProtectedMethod
    routeMappingPath       = $RouteMappingPath
    throttleBurst          = $ThrottleBurst
    throttleMaxWaitSeconds = $ThrottleMaxWaitSeconds
    found429               = $found429
    failures               = $failures
    ok                     = ($failures.Count -eq 0)
}

("OK: " + $summary.ok) | Out-File $outTxt -Encoding UTF8 -Append
if ($failures.Count -gt 0) {
    "Failures:" | Out-File $outTxt -Encoding UTF8 -Append
    $failures | ForEach-Object { " - $_" } | Out-File $outTxt -Encoding UTF8 -Append
}

# Write JSON + stable latest copies
[pscustomobject]@{
    summary = $summary
    checks  = $results
} | ConvertTo-Json -Depth 12 | Set-Content -Path $outJson -Encoding UTF8

Copy-Item -Force $outJson $outJsonLatest
Copy-Item -Force $outTxt  $outTxtLatest

Write-Host "AuthZ smoke written:"
Write-Host " - $outTxt"
Write-Host " - $outJson"
Write-Host " - $outTxtLatest"
Write-Host " - $outJsonLatest"

if ($summary.ok) { exit 0 } else { exit 1 }
