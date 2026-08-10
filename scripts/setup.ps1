# ====================================================
# Crime Assist - Automated Setup & Verification Script
# ====================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Crime Assist Project Setup & Migration " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please install Node.js v18+." -ForegroundColor Red
    exit 1
}
Write-Host "[✓] Node.js Version: $(node -v)" -ForegroundColor Green

# 2. Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm is not installed." -ForegroundColor Red
    exit 1
}
Write-Host "[✓] npm Version: $(npm -v)" -ForegroundColor Green

# 3. Check and Install Dependencies
Write-Host "`nInstalling project dependencies..." -ForegroundColor Yellow
npm install

# 4. Check Environment Configuration
if (-not (Test-Path ".env.local")) {
    Write-Host "`n[!] .env.local not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "[!] Please update .env.local with your new Firebase credentials before launching." -ForegroundColor Magenta
} else {
    Write-Host "`n[✓] .env.local configuration file detected." -ForegroundColor Green
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " Setup completed successfully!" -ForegroundColor Green
Write-Host " Run 'npm run dev' to start the local server." -ForegroundColor White
Write-Host " Then visit http://localhost:3000/setup to seed test accounts." -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
