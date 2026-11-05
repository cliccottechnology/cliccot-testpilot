# BugFlow - PowerShell Launcher
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "               BUG MANAGEMENT SYSTEM LAUNCHER" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

# Launch Backend
Write-Host "[1/2] Starting Backend (Django on http://127.0.0.1:8000)..." -ForegroundColor Cyan
Start-Process cmd -ArgumentList "/k cd /d `"$scriptDir\backend`" && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && python manage.py runserver"

# Launch Frontend
Write-Host "[2/2] Starting Frontend (Vite on http://localhost:5173)..." -ForegroundColor Cyan
Start-Process cmd -ArgumentList "/k cd /d `"$scriptDir\frontend`" && npm run dev"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host "                     RUNNING URLS" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host "  Frontend Web App : http://localhost:5173"
Write-Host "  Backend API      : http://127.0.0.1:8000/api/"
Write-Host "  Django Admin     : http://127.0.0.1:8000/admin/"
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host "                     DEFAULT LOGIN PASSWORDS" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host "  Role              Username           Password"
Write-Host "  ---------------   ----------------   -------------"
Write-Host "  Super Admin       myadmin            Admin123!"
Write-Host "  Tester            Kiruba             Tester123!"
Write-Host "  Developer         Karthi             Dev12345!"
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Both servers have been launched in separate windows!" -ForegroundColor Green
