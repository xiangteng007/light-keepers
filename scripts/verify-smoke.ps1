# Light Keepers - Smoke Test Script
# Quick build/test verification for backend and web-dashboard

param(
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$RootPath = Join-Path $PSScriptRoot ".."

Write-Host "=" * 60
Write-Host "[SMOKE] Light Keepers Smoke Test"
Write-Host "[SMOKE] Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "=" * 60

$ExitCode = 0

# Backend Build
if (-not $SkipBackend) {
    Write-Host ""
    Write-Host "[BACKEND] Starting build verification..."
    Write-Host "-" * 60
    
    Push-Location (Join-Path $RootPath "backend")
    try {
        Write-Host "[BACKEND] npm ci --legacy-peer-deps"
        npm ci --legacy-peer-deps 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
        Write-Host "[BACKEND] ✓ Dependencies installed"
        
        Write-Host "[BACKEND] npm run build"
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
        Write-Host "[BACKEND] ✓ Build successful"
        
        Write-Host "[BACKEND] npx tsc --noEmit"
        npx tsc --noEmit 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed" }
        Write-Host "[BACKEND] ✓ TypeScript check passed"
        
    } catch {
        Write-Host "[BACKEND] ✗ FAILED: $_" -ForegroundColor Red
        $ExitCode = 1
    } finally {
        Pop-Location
    }
}

# Frontend Build
if (-not $SkipFrontend) {
    Write-Host ""
    Write-Host "[FRONTEND] Starting build verification..."
    Write-Host "-" * 60
    
    Push-Location (Join-Path $RootPath "web-dashboard")
    try {
        Write-Host "[FRONTEND] npm ci"
        npm ci 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
        Write-Host "[FRONTEND] ✓ Dependencies installed"
        
        Write-Host "[FRONTEND] npx tsc --noEmit"
        npx tsc --noEmit 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed" }
        Write-Host "[FRONTEND] ✓ TypeScript check passed"
        
        Write-Host "[FRONTEND] npm run build"
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
        Write-Host "[FRONTEND] ✓ Build successful"
        
    } catch {
        Write-Host "[FRONTEND] ✗ FAILED: $_" -ForegroundColor Red
        $ExitCode = 1
    } finally {
        Pop-Location
    }
}

# Summary
Write-Host ""
Write-Host "=" * 60
if ($ExitCode -eq 0) {
    Write-Host "[SMOKE] ✓ ALL CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "[SMOKE] ✗ SOME CHECKS FAILED" -ForegroundColor Red
}
Write-Host "=" * 60

exit $ExitCode
