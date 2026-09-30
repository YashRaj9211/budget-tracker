# run_local.ps1
# Simple script to run the local server
# You can modify the connection string below to match your local Postgres

# Attempt to load from parent .env if possible (simple parsing)
$envPath = "../.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "DATABASE_URL=(.*)") {
            $env:DATABASE_URL = $matches[1].Trim('"')
            Write-Host "Loaded DATABASE_URL from .env"
        }
    }
}

if (-not $env:DATABASE_URL) {
    # Default fallback
    $env:DATABASE_URL = "postgres://postgres:password@localhost:5432/splitwise?sslmode=disable"
    Write-Host "Using default DATABASE_URL: $env:DATABASE_URL"
}

Write-Host "🚀 Starting Go Server on port 8080..."
go run main.go
