# EcoSphere — Start Server Script
# Kills any process on port 5000 then starts the server cleanly

Write-Host "Freeing port 5000..." -ForegroundColor Yellow
$proc = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($proc) {
    Stop-Process -Id $proc.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Killed old process on port 5000." -ForegroundColor Green
} else {
    Write-Host "Port 5000 was already free." -ForegroundColor Green
}

Start-Sleep 1
Write-Host "Starting EcoSphere server..." -ForegroundColor Cyan
npm start
