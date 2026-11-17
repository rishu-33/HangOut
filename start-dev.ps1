# Hangout Platform - Development Starter Script
# This script starts both backend and frontend in separate PowerShell windows

Write-Host "🚀 Starting Hangout Platform..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path ".\server\package.json") -or -not (Test-Path ".\client\package.json")) {
    Write-Host "❌ Error: Please run this script from the CODESHARE root directory" -ForegroundColor Red
    exit 1
}

# Check if node_modules exist
$serverModules = Test-Path ".\server\node_modules"
$clientModules = Test-Path ".\client\node_modules"

if (-not $serverModules -or -not $clientModules) {
    Write-Host "⚠️  Dependencies not installed. Installing now..." -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $serverModules) {
        Write-Host "📦 Installing server dependencies..." -ForegroundColor Cyan
        Set-Location server
        npm install
        Set-Location ..
    }
    
    if (-not $clientModules) {
        Write-Host "📦 Installing client dependencies..." -ForegroundColor Cyan
        Set-Location client
        npm install
        Set-Location ..
    }
    
    Write-Host ""
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
    Write-Host ""
}

# Check if .env files exist
if (-not (Test-Path ".\server\.env")) {
    Write-Host "⚠️  Warning: server/.env not found!" -ForegroundColor Yellow
    Write-Host "   Please copy server/.env.example to server/.env and configure it." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host "🔧 Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '🔧 Backend Server' -ForegroundColor Green; cd server; npm run dev"

Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🎨 Starting frontend client..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '🎨 Frontend Client' -ForegroundColor Cyan; cd client; npm run dev"

Write-Host ""
Write-Host "✅ Both servers are starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access the application at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📍 Backend API running at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tip: Check the new PowerShell windows for logs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this script (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
