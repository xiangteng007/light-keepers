# tools/audit/validate-public-surface.ps1
# Verifiable Engineering Pipeline — Public Surface Validator (Schema + Semantic)
# VERSION: 2.0.0
#
# Layer-1: Schema Validation (structure)
# Layer-2: Semantic Validation (duplicates, expiry, throttle, cross-check)
#
# Outputs:
#   - docs/proof/security/public-surface-check-report.json
#   - docs/proof/security/public-surface-check-report.md

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$PolicyPath = "docs/policy/public-surface.policy.json",
    [string]$SchemaPath = "docs/policy/public-surface.schema.json",
    [string]$MappingPath = "docs/proof/security/T1-routes-guards-mapping.json",
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
    if (!(Test-Path $path)) { return $null }
    return (Get-Content $path -Raw | ConvertFrom-Json)
}

function Write-Json([object]$obj, [string]$path) {
    Ensure-Dir $path
    ($obj | ConvertTo-Json -Depth 20) | Out-File -FilePath $path -Encoding UTF8
}

function Write-Text([string]$text, [string]$path) {
    Ensure-Dir $path
    $text | Out-File -FilePath $path -Encoding UTF8
}

function Normalize-Path([string]$p) {
    if (-not $p) { return $p }
    $x = $p.Trim()
    if ($x.Length -gt 1 -and $x.EndsWith("/")) { $x = $x.TrimEnd("/") }
    $x = [regex]::Replace($x, "\{[^}]+\}", ":param")
    $x = [regex]::Replace($x, ":[^/]+", ":param")
    return $x
}

function Route-Key([string]$method, [string]$path) {
    return ("{0} {1}" -f $method.Trim().ToUpper(), (Normalize-Path $path))
}

# -------------------------
# Main
# -------------------------
$generatedAt = NowIso
$policyAbs = Join-Path $RootDir $PolicyPath
$schemaAbs = Join-Path $RootDir $SchemaPath
$mappingAbs = Join-Path $RootDir $MappingPath
$outJsonAbs = Join-Path $RootDir $OutJsonPath
$outMdAbs = Join-Path $RootDir $OutMdPath

$errors = @()
$warnings = @()
$details = [ordered]@{
    duplicates                         = @()
    expiredEndpoints                   = @()
    wildcardPaths                      = @()
    placeholderReasons                 = @()
    placeholderOwners                  = @()
    throttleNoneInProd                 = @()
    mappingMissingRouteKeys            = @()
    unprotectedNotAllowlistedRouteKeys = @()
}

$policy = Read-Json $policyAbs
$schema = Read-Json $schemaAbs
$mapping = Read-Json $mappingAbs

$counts = [ordered]@{
    endpoints                 = 0
    duplicates                = 0
    expired                   = 0
    wildcards                 = 0
    schemaErrors              = 0
    semanticErrors            = 0
    semanticWarnings          = 0
    mappingMissing            = 0
    unprotectedNotAllowlisted = 0
}

# =====================
# Layer-1: Schema Validation (simplified PowerShell)
# =====================
if (-not $policy) {
    $errors += "POLICY_MISSING: Policy file not found: $PolicyPath"
    $counts.schemaErrors++
}

if (-not $schema) {
    $warnings += "SCHEMA_MISSING: Schema file not found (skipping schema validation): $SchemaPath"
}

if ($policy) {
    # Required top-level fields
    $requiredTop = @("schemaVersion", "policy", "scope", "endpoints")
    foreach ($k in $requiredTop) {
        if ($null -eq $policy.$k) {
            $errors += "SCHEMA_MISSING_FIELD: Missing required top-level field: $k"
            $counts.schemaErrors++
        }
    }

    # scope validation
    if ($policy.scope) {
        if (-not $policy.scope.service) {
            $errors += "SCHEMA_MISSING_FIELD: Missing scope.service"
            $counts.schemaErrors++
        }
        if (-not $policy.scope.environment) {
            $errors += "SCHEMA_MISSING_FIELD: Missing scope.environment"
            $counts.schemaErrors++
        }
        elseif ($policy.scope.environment -notin @("dev", "staging", "prod")) {
            $errors += "SCHEMA_INVALID_VALUE: scope.environment must be dev/staging/prod, got: $($policy.scope.environment)"
            $counts.schemaErrors++
        }
    }

    # Endpoint validation
    if ($policy.endpoints -and $policy.endpoints.Count -gt 0) {
        $counts.endpoints = $policy.endpoints.Count
        $validMethods = @("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")

        foreach ($ep in $policy.endpoints) {
            # Required endpoint fields
            if (-not $ep.method) {
                $errors += "SCHEMA_ENDPOINT_MISSING_METHOD: Endpoint missing method"
                $counts.schemaErrors++
            }
            elseif ($ep.method -notin $validMethods) {
                $errors += "SCHEMA_INVALID_METHOD: Invalid method '$($ep.method)' (allowed: GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS)"
                $counts.schemaErrors++
            }

            if (-not $ep.path) {
                $errors += "SCHEMA_ENDPOINT_MISSING_PATH: Endpoint missing path"
                $counts.schemaErrors++
            }

            if (-not $ep.reason) {
                $errors += "SCHEMA_ENDPOINT_MISSING_REASON: Endpoint $($ep.method) $($ep.path) missing reason"
                $counts.schemaErrors++
            }

            if (-not $ep.owner) {
                $errors += "SCHEMA_ENDPOINT_MISSING_OWNER: Endpoint $($ep.method) $($ep.path) missing owner"
                $counts.schemaErrors++
            }

            if (-not $ep.throttle) {
                $errors += "SCHEMA_ENDPOINT_MISSING_THROTTLE: Endpoint $($ep.method) $($ep.path) missing throttle"
                $counts.schemaErrors++
            }
            elseif (-not $ep.throttle.profile) {
                $errors += "SCHEMA_ENDPOINT_MISSING_THROTTLE_PROFILE: Endpoint $($ep.method) $($ep.path) missing throttle.profile"
                $counts.schemaErrors++
            }
        }
    }
    else {
        $errors += "SCHEMA_NO_ENDPOINTS: Policy must have at least one endpoint"
        $counts.schemaErrors++
    }
}

# =====================
# Layer-2: Semantic Validation
# =====================
if ($policy -and $policy.endpoints -and $policy.endpoints.Count -gt 0) {
    $routeKeys = @{}
    $isProd = ($policy.scope -and $policy.scope.environment -eq "prod")
    $now = Get-Date

    foreach ($ep in $policy.endpoints) {
        if (-not $ep.method -or -not $ep.path) { continue }
        $rk = Route-Key $ep.method $ep.path

        # S1: Wildcard check
        if ($ep.path -match "\*") {
            $errors += "SEMANTIC_WILDCARD: Wildcard path not allowed: $($ep.path)"
            $details.wildcardPaths += $rk
            $counts.wildcards++
            $counts.semanticErrors++
        }

        # S2: Duplicate check
        if ($routeKeys.ContainsKey($rk)) {
            $errors += "SEMANTIC_DUPLICATE: Duplicate routeKey: $rk"
            $details.duplicates += $rk
            $counts.duplicates++
            $counts.semanticErrors++
        }
        else {
            $routeKeys[$rk] = $ep
        }

        # S3: Placeholder reason/owner
        if ($ep.reason -match "(TODO|TBD|FIXME)") {
            if ($Strict) {
                $errors += "SEMANTIC_PLACEHOLDER_REASON: reason contains placeholder (TODO/TBD/FIXME): $rk"
                $counts.semanticErrors++
            }
            else {
                $warnings += "SEMANTIC_PLACEHOLDER_REASON: reason contains placeholder: $rk"
                $counts.semanticWarnings++
            }
            $details.placeholderReasons += $rk
        }

        if ($ep.owner -imatch "^(unknown|someone|temp|tbd)$") {
            if ($Strict) {
                $errors += "SEMANTIC_PLACEHOLDER_OWNER: owner is placeholder (unknown/someone/temp): $rk"
                $counts.semanticErrors++
            }
            else {
                $warnings += "SEMANTIC_PLACEHOLDER_OWNER: owner is placeholder: $rk"
                $counts.semanticWarnings++
            }
            $details.placeholderOwners += $rk
        }

        # S4: Expiry check
        if ($ep.expiryDate -and $ep.expiryDate -ne $null) {
            try {
                $expiry = [DateTime]::Parse($ep.expiryDate)
                if ($expiry -lt $now) {
                    if ($Strict) {
                        $errors += "SEMANTIC_EXPIRED: Endpoint expired on $($ep.expiryDate): $rk"
                        $counts.semanticErrors++
                    }
                    else {
                        $warnings += "SEMANTIC_EXPIRED: Endpoint expired on $($ep.expiryDate): $rk"
                        $counts.semanticWarnings++
                    }
                    $details.expiredEndpoints += $rk
                    $counts.expired++
                }
            }
            catch {
                $warnings += "SEMANTIC_INVALID_EXPIRY_FORMAT: Invalid expiryDate format: $($ep.expiryDate)"
                $counts.semanticWarnings++
            }
        }

        # S5: Throttle none in prod (except health paths)
        if ($isProd -and $ep.throttle -and $ep.throttle.profile -eq "none") {
            $isHealthPath = ($ep.path -match "^/health")
            if (-not $isHealthPath) {
                if ($Strict) {
                    $errors += "SEMANTIC_THROTTLE_NONE_PROD: throttle.profile=none not allowed in prod (non-health): $rk"
                    $counts.semanticErrors++
                }
                else {
                    $warnings += "SEMANTIC_THROTTLE_NONE_PROD: throttle.profile=none in prod (non-health): $rk"
                    $counts.semanticWarnings++
                }
                $details.throttleNoneInProd += $rk
            }
        }
    }

    # S6: Cross-check with mapping
    if ($mapping) {
        $routes = @()
        if ($mapping.routes) { $routes = @($mapping.routes) }
        elseif ($mapping.data -and $mapping.data.routes) { $routes = @($mapping.data.routes) }

        $mappingIndex = @{}
        foreach ($r in $routes) {
            $m = $null
            $p = $null
            foreach ($k in @("method", "httpMethod", "verb")) { if ($r.$k) { $m = [string]$r.$k; break } }
            foreach ($k in @("path", "route", "url", "fullPath")) { if ($r.$k) { $p = [string]$r.$k; break } }
            if ($m -and $p) {
                $rk = Route-Key $m $p
                $mappingIndex[$rk] = $r
            }
        }

        # Check allowlist endpoints exist in mapping
        foreach ($rk in $routeKeys.Keys) {
            if (-not $mappingIndex.ContainsKey($rk)) {
                if ($Strict) {
                    $errors += "SEMANTIC_ALLOWLIST_NOT_IN_MAPPING: Allowlisted endpoint not found in route mapping: $rk"
                    $counts.semanticErrors++
                }
                else {
                    $warnings += "SEMANTIC_ALLOWLIST_NOT_IN_MAPPING: Allowlisted endpoint not found in mapping (may be stale): $rk"
                    $counts.semanticWarnings++
                }
                $details.mappingMissingRouteKeys += $rk
                $counts.mappingMissing++
            }
        }

        # Check unprotected routes are allowlisted
        foreach ($rk in $mappingIndex.Keys) {
            $r = $mappingIndex[$rk]
            $isProtected = $false
            if ($null -ne $r.protected) { $isProtected = [bool]$r.protected }
            elseif ($null -ne $r.isProtected) { $isProtected = [bool]$r.isProtected }

            if (-not $isProtected -and -not $routeKeys.ContainsKey($rk)) {
                if ($Strict) {
                    $errors += "SEMANTIC_UNPROTECTED_NOT_ALLOWLISTED: Unprotected route not in allowlist: $rk"
                    $counts.semanticErrors++
                }
                else {
                    $warnings += "SEMANTIC_UNPROTECTED_NOT_ALLOWLISTED: Unprotected route not in allowlist: $rk"
                    $counts.semanticWarnings++
                }
                $details.unprotectedNotAllowlistedRouteKeys += $rk
                $counts.unprotectedNotAllowlisted++
            }
        }
    }
    else {
        $warnings += "MAPPING_NOT_FOUND: Route mapping not found (skipping cross-check): $MappingPath"
    }
}

# =====================
# Result
# =====================
$ok = ($errors.Count -eq 0)
$status = if ($ok) { "PASS" } else { "FAIL" }

$result = [ordered]@{
    version     = "2.0.0"
    generatedAt = $generatedAt
    policyPath  = $PolicyPath
    schemaPath  = $SchemaPath
    mappingPath = $MappingPath
    strict      = [bool]$Strict
    ok          = $ok
    status      = $status
    counts      = $counts
    errors      = $errors
    warnings    = $warnings
    details     = $details
}

Write-Json $result $outJsonAbs

# Markdown report
$md = @()
$md += "# Public Surface Check Report"
$md += ""
$md += "- **GeneratedAt**: $generatedAt"
$md += "- **Status**: **$status**"
$md += "- **Strict Mode**: $([bool]$Strict)"
$md += ""
$md += "## Counts"
$md += ""
$md += "| Metric | Value |"
$md += "|--------|------:|"
$md += "| Endpoints | $($counts.endpoints) |"
$md += "| Duplicates | $($counts.duplicates) |"
$md += "| Expired | $($counts.expired) |"
$md += "| Wildcards | $($counts.wildcards) |"
$md += "| Schema Errors | $($counts.schemaErrors) |"
$md += "| Semantic Errors | $($counts.semanticErrors) |"
$md += "| Semantic Warnings | $($counts.semanticWarnings) |"
$md += "| Mapping Missing | $($counts.mappingMissing) |"
$md += "| Unprotected Not Allowlisted | $($counts.unprotectedNotAllowlisted) |"
$md += ""

if ($errors.Count -gt 0) {
    $md += "## Errors ($($errors.Count))"
    $md += ""
    foreach ($e in $errors) { $md += "- $e" }
    $md += ""
}

if ($warnings.Count -gt 0) {
    $md += "## Warnings ($($warnings.Count))"
    $md += ""
    foreach ($w in $warnings) { $md += "- $w" }
    $md += ""
}

$md += "## Artifacts"
$md += ""
$md += "- JSON Report: ``$OutJsonPath``"
$md += "- Policy: ``$PolicyPath``"
$md += "- Schema: ``$SchemaPath``"
$md += "- Mapping: ``$MappingPath``"
$md += ""

Write-Text ($md -join "`n") $outMdAbs

Write-Host "Public Surface Validator v2.0.0"
Write-Host "  Status: $status"
Write-Host "  Strict: $([bool]$Strict)"
Write-Host "  Report: $OutJsonPath"

if (-not $ok) {
    throw "Public surface validation FAILED. Errors: $($errors.Count)"
}

exit 0
