# Generate APP_KEY for Docker .env files (PowerShell)
# Usage: .\scripts\gen-app-key.ps1
#        .\scripts\gen-app-key.ps1 -EnvFile .env.staging

param(
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "gitinventory-backend"
$target = Join-Path $root $EnvFile

if (-not (Test-Path $target)) {
    Write-Error "Missing $target — copy .env.production.example or .env.staging.example first."
}

Push-Location $backend
try {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
    }
    $key = (php artisan key:generate --show).Trim()
} finally {
    Pop-Location
}

$content = Get-Content $target -Raw
if ($content -match 'APP_KEY=.*') {
    $content = $content -replace 'APP_KEY=.*', "APP_KEY=$key"
} else {
    $content = "APP_KEY=$key`n" + $content
}
Set-Content -Path $target -Value $content -NoNewline
Write-Host "Wrote APP_KEY to $EnvFile"
Write-Host $key
