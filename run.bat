@echo off
TITLE BugFlow - Simple Bug Management System Launcher
COLOR 0A

echo =====================================================================
echo               BUG MANAGEMENT SYSTEM LAUNCHER
echo =====================================================================
echo.
echo [1/2] Starting Backend (Django on http://127.0.0.1:8000)...
start "BugFlow Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && python manage.py runserver"

echo [2/2] Starting Frontend (Vite on http://localhost:5173)...
start "BugFlow Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo =====================================================================
echo                     RUNNING URLS
echo =====================================================================
echo   Frontend Web App : http://localhost:5173
echo   Backend API      : http://127.0.0.1:8000/api/
echo   Django Admin     : http://127.0.0.1:8000/admin/
echo =====================================================================
echo                     DEFAULT LOGIN PASSWORDS
echo =====================================================================
echo   Role              Username           Password
echo   ---------------   ----------------   -------------
echo   Super Admin       myadmin            Admin123!
echo   Tester            Kiruba             Tester123!
echo   Developer         Karthi             Dev12345!
echo =====================================================================
echo.
echo Both servers have been launched in separate windows!
echo Keep this window open for reference or press any key to close.
pause
