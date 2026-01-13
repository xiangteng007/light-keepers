# tools/audit/validate-public-surface.ps1
# Verifiable Engineering Pipeline — Public Surface Validator (Policy-as-Code)
# Outputs:
#   - docs/proof/security/public-surface-check-report.json
#   - docs/proof/security/public-surface-check-report.md (optional but recommended)
#
# Requirements:
#   - docs/policy/public-surface.policy.json  (SSOT allowlist)
#   - docs/proof/security/T1-routes-guards-mapping.json (scan output)
#
# Usage:
#   pwsh tools/audit/validate-public-surface.ps1 -Strict
#   pwsh tools/audit/validate-public-surface.ps1 -Strict -PolicyPath docs/policy/public-surface.policy.json -MappingPath docs/proof/security/T1-routes-guards-mapping.json

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$PolicyPath = "docs/policy/public-surface.policy.json",
    [string]$MappingPath = "docs/proof/security/T1-routes-guards-mapping.json",
    [string]$PublicSurfaceMarkdownPath = "docs/proof/security/public-surface.md",
    [string]$OutJsonPath = "docs/proof/security/public-surface-check-report.json",
    [string]$OutMdPath = "docs/proof/security/public-surface-check-report.md",
    [switch]$Strict = $false
)

$ErrorActionPreference = "Stop"

function NowIso() { (Get-Date).ToString("o") }

function Ensure-Dir([string]$path) {
    $dir = Split-Path -Parent $path
    if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
}

function Read-Json([string]$path) {
    if (!(Test-Path $path)) { throw "Missing file: $path" }
    return (Get-Content $path -Raw | ConvertFrom-Json)
}

function Write-Json([object]$obj, [string]$path) {
    Ensure-Dir $path
    ($obj | ConvertTo-Json -Depth 12) | Out-File -FilePath $path -Encoding UTF8
}

function Write-Text([string]$text, [string]$path) {
    Ensure-Dir $path
    $text | Out-File -FilePath $path -Encoding UTF8
}

function Add-Issue([ref]$arr, [string]$code, [string]$message, $endpoint = $null, $details = $null) {
    $arr.Value += [ordered]@{
        code     = $code
        message  = $message
        endpoint = $endpoint
        details  = $details
    }
}

# Normalize route templates so that {id} and :id compare consistently.
function Normalize-Path([string]$p) {
    if (-not $p) { return $p }
    $x = $p.Trim()
    # strip trailing slash (except root)
    if ($x.Length -gt 1 -and $x.EndsWith("/")) { $x = $x.TrimEnd("/") }

    # normalize {param} -> :param
    $x = [regex]::Replace($x, "\{[^}]+\}", ":param")
    # normalize :id -> :param
    $x = [regex]::Replace($x, ":[^/]+", ":param")

    return $x
}

function Normalize-Method([string]$m) {
    if (-not $m) { return $m }
    return $m.Trim().ToUpper()
}

function Route-Key([string]$method, [string]$path) {
    return ("{0} {1}" -f (Normalize-Method $method), (Normalize-Path $path))
}

# Extract method/path from route object with tolerances (schema drift)
function Get-RouteMethod($r) {
    foreach ($k in @("method", "httpMethod", "verb")) { if ($null -ne $r.$k) { return [string]$r.$k } }
    return $null
}
function Get-RoutePath($r) {
    foreach ($k in @("path", "route", "url", "fullPath")) { if ($null -ne $r.$k) { return [string]$r.$k } }
    return $null
}

# Determine "public" and "level" from mapping route object with tolerances
function Get-RoutePublicFlag($r) {
    # direct flags
    foreach ($k in @("public", "isPublic", "allowAnonymous", "anonymous")) {
        if ($null -ne $r.$k) { return [bool]$r.$k }
    }
    # nested metadata
    if ($null -ne $r.metadata) {
        foreach ($k in @("public", "isPublic", "allowAnonymous", "anonymous")) {
            if ($null -ne $r.metadata.$k) { return [bool]$r.metadata.$k }
        }
    }
    # decorator list heuristic
    if ($null -ne $r.decorators) {
        $d = @($r.decorators) | ForEach-Object { [string]$_ }
        if ($d -contains "Public" -or $d -contains "@Public" -or $d -contains "PublicDecorator") { return $true }
    }
    return $false
}

function Get-RouteRequiredLevel($r) {
    foreach ($k in @("requiredLevel", "minLevel", "level", "roleLevel")) {
        if ($null -ne $r.$k) {
            try { return [int]$r.$k } catch { return $null }
        }
    }
    if ($null -ne $r.metadata) {
        foreach ($k in @("requiredLevel", "minLevel", "level", "roleLevel")) {
            if ($null -ne $r.metadata.$k) {
                try { return [int]$r.metadata.$k } catch { return $null }
            }
        }
    }
    return $null
}

function Get-RouteThrottle($r) {
    foreach ($k in @("throttle", "rateLimit", "throttling")) {
        if ($null -ne $r.$k) { return $r.$k }
    }
    if ($null -ne $r.metadata) {
        foreach ($k in @("throttle", "rateLimit", "throttling")) {
            if ($null -ne $r.metadata.$k) { return $r.metadata.$k }
        }
    }
    # decorator heuristic
    if ($null -ne $r.decorators) {
        $d = @($r.decorators) | ForEach-Object { [string]$_ }
        if ($d -match "Throttle" -or $d -match "RateLimit") { return "decorator-present" }
    }
    return $null
}

function Get-RouteProtected($r) {
    if ($null -ne $r.protected) { return [bool]$r.protected }
    if ($null -ne $r.isProtected) { return [bool]$r.isProtected }
    # heuristic: if has guard/requiredLevel and not public => protected
    $lvl = Get-RouteRequiredLevel $r
    $pub = Get-RoutePublicFlag $r
    if ($pub) { return $false }
    if ($null -ne $lvl -and $lvl -gt 0) { return $true }
    if ($null -ne $r.guards -and @($r.guards).Count -gt 0) { return $true }
    return $false
}

function Validate-PolicyEndpointShape($ep, [ref]$errors, [ref]$warnings, [switch]$StrictMode) {
    if (-not $ep.method) { Add-Issue $errors "POLICY_MISSING_METHOD" "Policy endpoint missing method" $ep; return $false }
    if (-not $ep.path) { Add-Issue $errors "POLICY_MISSING_PATH"   "Policy endpoint missing path"   $ep; return $false }

    $m = Normalize-Method $ep.method
    if ($m -notin @("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD")) {
        Add-Issue $errors "POLICY_BAD_METHOD" "Unsupported method '$m' in policy" $ep
        return $false
    }

    # No wildcard paths (enforce)
    if ($ep.path -match "\*") {
        Add-Issue $errors "POLICY_WILDCARD_PATH" "Wildcard '*' is not allowed in policy path. Enumerate real endpoints." $ep
        return $false
    }

    # Required fields in strict mode
    if ($StrictMode) {
        if (-not $ep.dataExposure) { Add-Issue $errors "POLICY_MISSING_EXPOSURE" "Policy endpoint missing dataExposure" $ep; return $false }
        if (-not $ep.throttle) { Add-Issue $errors "POLICY_MISSING_THROTTLE" "Policy endpoint missing throttle" $ep; return $false }
    }
    else {
        if (-not $ep.dataExposure) { Add-Issue $warnings "POLICY_MISSING_EXPOSURE" "Policy endpoint missing dataExposure (non-strict)" $ep }
        if (-not $ep.throttle) { Add-Issue $warnings "POLICY_MISSING_THROTTLE" "Policy endpoint missing throttle (non-strict)" $ep }
    }

    if ($ep.dataExposure) {
        $ok = @("none", "low", "medium", "high")
        if ($ep.dataExposure -notin $ok) {
            Add-Issue $errors "POLICY_BAD_EXPOSURE" "Invalid dataExposure '$($ep.dataExposure)' (allowed: none/low/medium/high)" $ep
            return $false
        }
    }

    return $true
}

# Optional: parse markdown table (human doc) to ensure it matches policy JSON
function Extract-MarkdownEndpoints([string]$mdPath) {
    if (!(Test-Path $mdPath)) { return @() }
    $lines = Get-Content $mdPath -ErrorAction Stop
    $eps = @()
    foreach ($ln in $lines) {
        # crude extraction: look for patterns like `GET /path`
        if ($ln -match "^\s*\|\s*`?(GET|POST|PUT|PATCH|DELETE)\s+([^`|]+)`?\s*\|") {
            $m = $Matches[1]
            $p = $Matches[2].Trim()
            $eps += [ordered]@{ method = $m; path = $p }
        }
    }
    return $eps
}

# -------------------------
# Main
# -------------------------
$errors = @()
$warnings = @()
$checkedAt = NowIso

$policyAbs = Join-Path $RootDir $PolicyPath
$mappingAbs = Join-Path $RootDir $MappingPath
$mdAbs = Join-Path $RootDir $PublicSurfaceMarkdownPath
$outJsonAbs = Join-Path $RootDir $OutJsonPath
$outMdAbs = Join-Path $RootDir $OutMdPath

$policy = $null
$mapping = $null

try { $policy = Read-Json $policyAbs } catch { Add-Issue ([ref]$errors) "POLICY_MISSING" $_.Exception.Message $null; $policy = $null }
try { $mapping = Read-Json $mappingAbs } catch { Add-Issue ([ref]$errors) "MAPPING_MISSING" $_.Exception.Message $null; $mapping = $null }

# Drift guard: public-surface.md must match policy sha
function Extract-PolicyShaFromMd([string]$mdPath) {
    if (!(Test-Path $mdPath)) { return $null }
    $txt = Get-Content $mdPath -Raw
    $m = [regex]::Match($txt, "policySha256:\s*([a-f0-9]{64})", "IgnoreCase")
    if ($m.Success) { return $m.Groups[1].Value.ToLower() }
    return $null
}

if (Test-Path $policyAbs) {
    $policySha = (Get-FileHash -Algorithm SHA256 -Path $policyAbs).Hash.ToLower()
    $mdSha = Extract-PolicyShaFromMd $mdAbs
  
    if (-not $mdSha) {
        if ($Strict) { 
            Add-Issue ([ref]$errors) "PUBLIC_MD_MISSING_SHA" "public-surface.md missing policySha256 marker (must be auto-generated)" $null 
        }
        else { 
            Add-Issue ([ref]$warnings) "PUBLIC_MD_MISSING_SHA" "public-surface.md missing policySha256 marker (non-strict)" $null 
        }
    }
    elseif ($mdSha -ne $policySha) {
        if ($Strict) { 
            Add-Issue ([ref]$errors) "PUBLIC_MD_DRIFT" "public-surface.md policySha256 does not match policy.json (run generator)" $null @{ mdSha = $mdSha; policySha = $policySha } 
        }
        else { 
            Add-Issue ([ref]$warnings) "PUBLIC_MD_DRIFT" "public-surface.md drift detected (non-strict)" $null @{ mdSha = $mdSha; policySha = $policySha } 
        }
    }
    else {
        # SHA matches - good
    }
}

$policyName = $null
$endpoints = @()
if ($policy) {
    $policyName = [string]$policy.policy
    if (-not $policyName) { $policyName = "Policy-A" }

    if ($null -eq $policy.endpoints) {
        Add-Issue ([ref]$errors) "POLICY_NO_ENDPOINTS" "Policy JSON must contain endpoints array" $null
    }
    else {
        $endpoints = @($policy.endpoints)
    }
}

$routes = @()
if ($mapping) {
    # tolerate nested schema
    if ($null -ne $mapping.routes) { $routes = @($mapping.routes) }
    elseif ($null -ne $mapping.data -and $null -ne $mapping.data.routes) { $routes = @($mapping.data.routes) }
    else { Add-Issue ([ref]$errors) "MAPPING_NO_ROUTES" "Mapping JSON missing routes array" $null }
}

# Build route index by normalized key
$routeIndex = @{}
$rawKeyCountMissing = 0
foreach ($r in $routes) {
    $m = Get-RouteMethod $r
    $p = Get-RoutePath $r
    if (-not $m -or -not $p) { $rawKeyCountMissing++; continue }
    $k = Route-Key $m $p
    if (-not $routeIndex.ContainsKey($k)) { $routeIndex[$k] = @() }
    $routeIndex[$k] += $r
}

if ($rawKeyCountMissing -gt 0) {
    Add-Issue ([ref]$warnings) "MAPPING_MISSING_METHOD_PATH" "Mapping contains $rawKeyCountMissing routes without method/path. Allowlist matching may be incomplete. Update scan output schema." $null
}

# Validate policy endpoints
$validated = 0
$policyKeys = @{}
foreach ($ep in $endpoints) {
    $ok = Validate-PolicyEndpointShape $ep ([ref]$errors) ([ref]$warnings) -StrictMode:$Strict
    if (-not $ok) { continue }

    $k = Route-Key $ep.method $ep.path
    if ($policyKeys.ContainsKey($k)) {
        Add-Issue ([ref]$errors) "POLICY_DUPLICATE" "Duplicate policy endpoint: $k" $ep
        continue
    }
    $policyKeys[$k] = $ep
}

# For each policy endpoint, ensure it exists in mapping and meets policy
foreach ($k in $policyKeys.Keys) {
    $ep = $policyKeys[$k]
    $validated++

    # existence: exact normalized match
    $candidates = @()
    if ($routeIndex.ContainsKey($k)) { $candidates = @($routeIndex[$k]) }

    if ($candidates.Count -eq 0) {
        Add-Issue ([ref]$errors) "POLICY_ENDPOINT_NOT_FOUND_IN_MAPPING" "Policy endpoint not found in route mapping: $k" $ep
        continue
    }

    # If multiple candidates exist, pick first but warn
    if ($candidates.Count -gt 1) {
        Add-Issue ([ref]$warnings) "MAPPING_DUPLICATE_KEY" "Multiple routes share the same normalized key: $k (using first candidate for checks)" $ep @{ count = $candidates.Count }
    }

    $r = $candidates[0]
    $isPublic = Get-RoutePublicFlag $r
    $lvl = Get-RouteRequiredLevel $r
    $th = Get-RouteThrottle $r

    # policy check: publicness
    if ($policyName -eq "Policy-A") {
        if (-not $isPublic) {
            Add-Issue ([ref]$errors) "PUBLIC_POLICY_VIOLATION" "Policy-A requires @Public() (public flag true) for allowlisted endpoint: $k" $ep @{
                routePublic = $isPublic; requiredLevel = $lvl
            }
        }
    }
    else {
        # Policy-B: allow public OR level==0
        $okPublic = $isPublic -or ($null -ne $lvl -and $lvl -le 0)
        if (-not $okPublic) {
            Add-Issue ([ref]$errors) "PUBLIC_POLICY_VIOLATION" "Policy-B requires @Public() OR RequiredLevel(0) for allowlisted endpoint: $k" $ep @{
                routePublic = $isPublic; requiredLevel = $lvl
            }
        }
    }

    # throttle presence: strict => error, else warning
    if ($null -eq $th -or ($th -is [string] -and [string]::IsNullOrWhiteSpace($th))) {
        if ($Strict) {
            Add-Issue ([ref]$errors) "THROTTLE_MISSING_ON_ROUTE" "Allowlisted endpoint missing throttling metadata/decorator: $k" $ep
        }
        else {
            Add-Issue ([ref]$warnings) "THROTTLE_MISSING_ON_ROUTE" "Allowlisted endpoint missing throttling metadata/decorator (non-strict): $k" $ep
        }
    }

    # protected vs allowlist consistency (allowlisted endpoints are expected to be NOT protected)
    $prot = Get-RouteProtected $r
    if ($prot -eq $true) {
        Add-Issue ([ref]$warnings) "ALLOWLIST_PROTECTED" "Allowlisted endpoint appears protected in mapping; ensure this is intentional: $k" $ep @{
            routeProtected = $prot; routePublic = $isPublic; requiredLevel = $lvl
        }
    }
}

# Additionally: any unprotected route must be allowlisted (for defense-in-depth)
$unprotRoutes = @($routes | Where-Object { (Get-RouteProtected $_) -ne $true })
$unprotKeys = @()
foreach ($r in $unprotRoutes) {
    $m = Get-RouteMethod $r
    $p = Get-RoutePath $r
    if (-not $m -or -not $p) { continue }
    $unprotKeys += (Route-Key $m $p)
}
$unprotUnique = @($unprotKeys | Select-Object -Unique)

$unprotNotAllow = @()
foreach ($rk in $unprotUnique) {
    if (-not $policyKeys.ContainsKey($rk)) { $unprotNotAllow += $rk }
}

if ($unprotNotAllow.Count -gt 0) {
    $sample = ($unprotNotAllow | Select-Object -First 30) -join "`n  - "
    if ($Strict) {
        Add-Issue ([ref]$errors) "UNPROTECTED_NOT_ALLOWLISTED" "Found unprotected routes not allowlisted (sample up to 30):`n  - $sample" $null @{
            total = $unprotNotAllow.Count
        }
    }
    else {
        Add-Issue ([ref]$warnings) "UNPROTECTED_NOT_ALLOWLISTED" "Found unprotected routes not allowlisted (non-strict). CI gate will likely fail later. Sample up to 30:`n  - $sample" $null @{
            total = $unprotNotAllow.Count
        }
    }
}

# Optional: Markdown drift check (human doc)
$mdEndpoints = Extract-MarkdownEndpoints $mdAbs
if ($mdEndpoints.Count -gt 0 -and $policyKeys.Count -gt 0) {
    $mdKeys = @{}
    foreach ($mdep in $mdEndpoints) {
        $mk = Route-Key $mdep.method $mdep.path
        $mdKeys[$mk] = $true
    }

    $missingInMd = @($policyKeys.Keys | Where-Object { -not $mdKeys.ContainsKey($_) })
    $extraInMd = @($mdKeys.Keys    | Where-Object { -not $policyKeys.ContainsKey($_) })

    if ($missingInMd.Count -gt 0) {
        Add-Issue ([ref]$warnings) "MARKDOWN_MISSING_POLICY_ENDPOINTS" "Markdown public-surface.md is missing some policy endpoints (sample up to 20)" $null @{
            sample = ($missingInMd | Select-Object -First 20)
            count  = $missingInMd.Count
        }
    }
    if ($extraInMd.Count -gt 0) {
        Add-Issue ([ref]$warnings) "MARKDOWN_EXTRA_ENDPOINTS" "Markdown public-surface.md contains endpoints not present in policy JSON (sample up to 20)" $null @{
            sample = ($extraInMd | Select-Object -First 20)
            count  = $extraInMd.Count
        }
    }
}
elseif (!(Test-Path $mdAbs)) {
    Add-Issue ([ref]$warnings) "MARKDOWN_MISSING" "public-surface.md not found (optional). Policy JSON remains the SSOT." $null
}

# Summaries
$summary = [ordered]@{
    policy                           = $policyName
    policyEndpointsTotal             = $policyKeys.Count
    mappingRoutesTotal               = $routes.Count
    mappingUnprotectedTotal          = $unprotUnique.Count
    mappingUnprotectedNotAllowlisted = $unprotNotAllow.Count
    errors                           = $errors.Count
    warnings                         = $warnings.Count
    checkedAt                        = $checkedAt
}

$ok = ($errors.Count -eq 0)

$result = [ordered]@{
    ok        = $ok
    summary   = $summary
    errors    = $errors
    warnings  = $warnings
    inputs    = [ordered]@{
        policyPath   = $PolicyPath
        mappingPath  = $MappingPath
        markdownPath = $PublicSurfaceMarkdownPath
        strict       = [bool]$Strict
    }
    checkedAt = $checkedAt
    script    = [ordered]@{
        name    = "validate-public-surface.ps1"
        version = "1.0.0"
    }
}

Write-Json $result $outJsonAbs

# Write a short human-readable markdown report
$md = @()
$md += "# Public Surface Check Report"
$md += ""
$md += "- CheckedAt: **$checkedAt**"
$md += "- Policy: **$policyName**"
$md += "- OK: **$ok**"
$md += ""
$md += "## Summary"
$md += ""
$md += "| Metric | Value |"
$md += "|---|---:|"
$md += "| Policy endpoints | $($summary.policyEndpointsTotal) |"
$md += "| Mapping routes | $($summary.mappingRoutesTotal) |"
$md += "| Unprotected routes (unique) | $($summary.mappingUnprotectedTotal) |"
$md += "| Unprotected not allowlisted | $($summary.mappingUnprotectedNotAllowlisted) |"
$md += "| Errors | $($summary.errors) |"
$md += "| Warnings | $($summary.warnings) |"
$md += ""

if ($errors.Count -gt 0) {
    $md += "## Errors"
    foreach ($e in $errors) {
        $md += "- **$($e.code)**: $($e.message)"
    }
    $md += ""
}

if ($warnings.Count -gt 0) {
    $md += "## Warnings"
    foreach ($w in $warnings) {
        $md += "- **$($w.code)**: $($w.message)"
    }
    $md += ""
}

$md += "## Artifacts"
$md += ""
$md += "- JSON: ``$OutJsonPath``"
$md += "- Mapping: ``$MappingPath``"
$md += "- Policy: ``$PolicyPath``"
$md += ""

Write-Text ($md -join "`n") $outMdAbs

if (-not $ok) {
    Write-Error "Public surface validation FAILED. See: $OutJsonPath"
    exit 1
}

Write-Host "Public surface validation PASS. Report: $OutJsonPath"
exit 0
