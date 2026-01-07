# Light Keepers - Guards Audit Script
# Scans controllers for guard usage and identifies inconsistencies

param(
    [switch]$Verbose,
    [switch]$JsonOutput
)

$ErrorActionPreference = "Stop"
$BackendPath = Join-Path $PSScriptRoot "..\backend\src"

Write-Host ("=" * 60)
Write-Host "[GUARDS] Light Keepers Guards Audit"
Write-Host "[GUARDS] Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ("=" * 60)

# Find all controller files
$controllersPath = Join-Path $BackendPath "modules"
$controllers = Get-ChildItem -Path $controllersPath -Recurse -Filter "*.controller.ts"

$legacyGuards = @()
$unifiedGuards = @()
$noGuards = @()
$idorProtected = @()

foreach ($file in $controllers) {
    $content = Get-Content $file.FullName -Raw
    $relativePath = $file.FullName.Replace($BackendPath, "").TrimStart("\")
    
    # Check for guards
    $hasJwtAuthGuard = $content -match "JwtAuthGuard"
    $hasCoreJwtGuard = $content -match "CoreJwtGuard"
    $hasResourceOwnerGuard = $content -match "ResourceOwnerGuard"
    $hasUseGuards = $content -match "@UseGuards"
    
    if ($hasResourceOwnerGuard) {
        $idorProtected += $relativePath
    }
    
    if ($hasJwtAuthGuard -and -not $hasCoreJwtGuard) {
        $legacyGuards += $relativePath
    }
    elseif ($hasCoreJwtGuard) {
        $unifiedGuards += $relativePath
    }
    elseif (-not $hasUseGuards) {
        # Check if it's a public controller
        $isPublic = $relativePath -match "public" -or $content -match "Level0"
        if (-not $isPublic) {
            $noGuards += $relativePath
        }
    }
}

# Output
Write-Host ""
Write-Host "[LEGACY] Controllers using JwtAuthGuard (need migration):"
Write-Host ("-" * 60)
foreach ($c in $legacyGuards) {
    Write-Host "  ⚠ $c" -ForegroundColor Yellow
}
Write-Host "  Total: $($legacyGuards.Count)"

Write-Host ""
Write-Host "[UNIFIED] Controllers using CoreJwtGuard:"
Write-Host ("-" * 60)
if ($Verbose) {
    foreach ($c in $unifiedGuards) {
        Write-Host "  ✓ $c" -ForegroundColor Green
    }
}
Write-Host "  Total: $($unifiedGuards.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "[IDOR] Controllers with ResourceOwnerGuard:"
Write-Host ("-" * 60)
foreach ($c in $idorProtected) {
    Write-Host "  🔒 $c" -ForegroundColor Cyan
}
Write-Host "  Total: $($idorProtected.Count)" -ForegroundColor $(if ($idorProtected.Count -lt 5) { "Yellow" } else { "Green" })

Write-Host ""
Write-Host "[NONE] Controllers without guards (check if Level0):"
Write-Host ("-" * 60)
foreach ($c in $noGuards) {
    Write-Host "  ? $c" -ForegroundColor DarkGray
}
Write-Host "  Total: $($noGuards.Count)"

# Summary
Write-Host ""
Write-Host ("=" * 60)
Write-Host "[SUMMARY]"
Write-Host "  Legacy (JwtAuthGuard): $($legacyGuards.Count) - MIGRATE TO CoreJwtGuard"
Write-Host "  Unified (CoreJwtGuard): $($unifiedGuards.Count) - OK"
Write-Host "  IDOR Protected: $($idorProtected.Count) - $(if ($idorProtected.Count -lt 5) { 'LOW COVERAGE' } else { 'OK' })"
Write-Host "  No Guards: $($noGuards.Count)"
Write-Host ("=" * 60)

if ($JsonOutput) {
    @{
        timestamp     = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
        legacy        = $legacyGuards
        unified       = $unifiedGuards
        idorProtected = $idorProtected
        noGuards      = $noGuards
    } | ConvertTo-Json -Depth 3
}

exit 0
