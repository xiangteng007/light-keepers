<#
.SYNOPSIS
    Detect duplicate SSOT files in repository
.DESCRIPTION
    Scans the repository for multiple copies of critical SSOT files.
    Exits with code 1 if duplicates are found, preventing downstream confusion.
.OUTPUTS
    Exit 0: No duplicates found
    Exit 1: Duplicates detected (CI FAIL)
.EXAMPLE
    pwsh tools/audit/detect-ssot-duplicates.ps1
#>

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SSOT Duplicate Detection" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$duplicatesFound = $false
$results = @()

# Files that must be unique in the repo
$ssotFiles = @(
    @{
        Name = "public-surface.policy.json"
        ExpectedPath = "docs/policy/public-surface.policy.json"
        Description = "Public Surface Policy SSOT"
    },
    @{
        Name = "T0-count-summary.json"
        ExpectedPath = "docs/proof/logs/T0-count-summary.json"
        Description = "Baseline Counts SSOT"
    },
    @{
        Name = "gate-summary.json"
        ExpectedPath = "docs/proof/gates/gate-summary.json"
        Description = "Gate Summary SSOT"
    }
)

foreach ($ssot in $ssotFiles) {
    Write-Host "Checking: $($ssot.Name)" -ForegroundColor Yellow
    
    # Find all instances of this file
    $found = Get-ChildItem -Path $RootDir -Recurse -Filter $ssot.Name -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "\\(node_modules|dist|\\.git)\\" }
    
    $expectedFullPath = Join-Path $RootDir $ssot.ExpectedPath
    
    if ($found.Count -eq 0) {
        Write-Host "  ⚠️  NOT FOUND: $($ssot.ExpectedPath)" -ForegroundColor DarkYellow
        $results += [PSCustomObject]@{
            File = $ssot.Name
            Status = "MISSING"
            Count = 0
            Paths = @()
        }
    }
    elseif ($found.Count -eq 1) {
        $relativePath = $found[0].FullName.Substring($RootDir.Length + 1).Replace("\", "/")
        if ($relativePath -eq $ssot.ExpectedPath) {
            Write-Host "  ✅ OK: Single instance at expected path" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  WRONG PATH: Found at $relativePath (expected: $($ssot.ExpectedPath))" -ForegroundColor DarkYellow
        }
        $results += [PSCustomObject]@{
            File = $ssot.Name
            Status = "OK"
            Count = 1
            Paths = @($relativePath)
        }
    }
    else {
        Write-Host "  ❌ DUPLICATE: Found $($found.Count) copies!" -ForegroundColor Red
        $duplicatesFound = $true
        $paths = @()
        foreach ($f in $found) {
            $relativePath = $f.FullName.Substring($RootDir.Length + 1).Replace("\", "/")
            Write-Host "      - $relativePath" -ForegroundColor Red
            $paths += $relativePath
        }
        $results += [PSCustomObject]@{
            File = $ssot.Name
            Status = "DUPLICATE"
            Count = $found.Count
            Paths = $paths
        }
    }
}

# Check for duplicate evidence documents (should be exactly one)
$evidenceDocs = @(
    @{ Name = "index.md"; ExpectedPath = "docs/proof/index.md" },
    @{ Name = "traceability.md"; ExpectedPath = "docs/proof/traceability.md" }
)

Write-Host ""
Write-Host "Checking evidence documents..." -ForegroundColor Yellow

foreach ($doc in $evidenceDocs) {
    $found = Get-ChildItem -Path (Join-Path $RootDir "docs") -Recurse -Filter $doc.Name -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "\\(node_modules|dist)\\" }
    
    if ($found.Count -gt 1) {
        Write-Host "  ❌ DUPLICATE: $($doc.Name) found $($found.Count) times!" -ForegroundColor Red
        $duplicatesFound = $true
        foreach ($f in $found) {
            $relativePath = $f.FullName.Substring($RootDir.Length + 1).Replace("\", "/")
            Write-Host "      - $relativePath" -ForegroundColor Red
        }
    }
    else {
        Write-Host "  ✅ OK: $($doc.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($duplicatesFound) {
    Write-Host " SSOT DUPLICATE CHECK: FAIL ❌" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Resolution: Remove duplicate files and ensure single SSOT." -ForegroundColor Yellow
    exit 1
}
else {
    Write-Host " SSOT DUPLICATE CHECK: PASS ✅" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    exit 0
}
