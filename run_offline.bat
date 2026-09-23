@echo off
title PaperLens Application Launcher
echo ========================================
echo  Starting PaperLens Application Locally 
echo ========================================

set REPO_ROOT=%~dp0

echo Cleaning up any existing process on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a 2>nul

echo Starting Frontend on http://localhost:8080 ...
start "PaperLens Frontend" cmd /k "cd /d "%REPO_ROOT%frontend" && npm run dev"

echo Starting Backend on http://localhost:8000 ...
start "PaperLens Backend" cmd /k "cd /d "%REPO_ROOT%backend" && (if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat) && (python -c "import socket; socket.gethostbyname('db.wuacpjaxqjmmhpnyibdo.supabase.co')" 2>nul || set DATABASE_URL=sqlite+aiosqlite:///./paperlens_v2.db) && python -m uvicorn app.main:app --reload --port 8000 --host 127.0.0.1"

echo.
echo PaperLens Application Started!
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo ========================================
