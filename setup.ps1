# Check Game - Setup Script
# Right-click > Run with PowerShell (as Administrator)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Check Game - Setup" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Install Node.js if missing
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[1/4] Installing Node.js..." -ForegroundColor Green
    $installer = "$env:TEMP\node-installer.msi"
    Invoke-WebRequest "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi" -OutFile $installer -UseBasicParsing
    Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /quiet /norestart" -Wait
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    Write-Host "Node.js installed!" -ForegroundColor Green
} else {
    Write-Host "[1/4] Node.js $(node --version) - OK" -ForegroundColor Green
}

# 2. npm install
Write-Host "`n[2/4] Installing packages..." -ForegroundColor Green

$root = "C:\Users\hamda\check-game1"

Write-Host "  shared..." -ForegroundColor Cyan
Set-Location "$root\shared"; npm install --silent --no-audit

Write-Host "  server..." -ForegroundColor Cyan
Set-Location "$root\server"; npm install --silent --no-audit

Write-Host "  client..." -ForegroundColor Cyan
Set-Location "$root\client"; npm install --silent --no-audit

# 3. Create data folder
Write-Host "`n[3/4] Creating data directory..." -ForegroundColor Green
New-Item -ItemType Directory -Path "$root\server\data" -Force | Out-Null

# 4. Create .env files if not exist
Write-Host "`n[4/4] Creating .env files..." -ForegroundColor Green

$clientEnv = "$root\client\.env"
if (-not (Test-Path $clientEnv)) {
    Copy-Item "$root\client\.env.example" $clientEnv
    Write-Host "  Created client/.env" -ForegroundColor Cyan
} else {
    Write-Host "  client/.env already exists" -ForegroundColor Gray
}

$serverEnv = "$root\server\.env"
if (-not (Test-Path $serverEnv)) {
    Copy-Item "$root\server\.env.example" $serverEnv
    Write-Host "  Created server/.env" -ForegroundColor Cyan
} else {
    Write-Host "  server/.env already exists" -ForegroundColor Gray
}

Write-Host "`nDone!" -ForegroundColor Green

Write-Host @"

========================================
 الإعداد اكتمل! لتشغيل اللعبة:

 Terminal 1 (Server):
   cd C:\Users\hamda\check-game1\server
   npm run dev

 Terminal 2 (Client):
   cd C:\Users\hamda\check-game1\client
   npm run dev

 ثم افتح: http://localhost:5173

 (اختياري) تسجيل الدخول بـ Google:
   افتح client/.env وضع Google Client ID
   من: https://console.cloud.google.com/
========================================
"@ -ForegroundColor Yellow
