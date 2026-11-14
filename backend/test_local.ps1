# test_local.ps1
# Use this to verify the server is running

$baseUrl = "http://localhost:8080"

Write-Host "1. Testing /ping endpoint..."
try {
    $ping = Invoke-RestMethod -Uri "$baseUrl/ping"
    Write-Host "   Response: $($ping | ConvertTo-Json -Depth 2)" -ForegroundColor Green
} catch {
    Write-Host "   Failed to connect to $baseUrl/ping. Is the server running?" -ForegroundColor Red
    exit
}

Write-Host "`n2. Testing /expenses endpoint (Get)..."
try {
    # Using a dummy userId
    $expenses = Invoke-RestMethod -Uri "$baseUrl/expenses?userId=cm5789abc0001dummyuser"
    Write-Host "   Response: $($expenses | ConvertTo-Json -Depth 2)" -ForegroundColor Green
} catch {
    Write-Host "   Error calling /expenses: $_" -ForegroundColor Yellow
}

Write-Host "`nPassed! Server is responsive."
