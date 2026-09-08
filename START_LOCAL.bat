@echo off
setlocal
cd /d %~dp0

echo =====================================================
echo SafeSphere SIH26191 - Local Windows Launcher
echo =====================================================

if not exist .env (
  copy .env.example .env >nul
  echo [OK] Created .env from .env.example
)

where python >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python was not found in PATH.
  echo Install Python 3.11+ and try again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js / npm was not found in PATH.
  echo Install Node.js 20+ and try again.
  pause
  exit /b 1
)

if not exist backend\.venv\Scripts\python.exe (
  echo [SETUP] Creating Python virtual environment...
  python -m venv backend\.venv
  if errorlevel 1 goto :failed
  echo [SETUP] Installing backend requirements...
  backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
  if errorlevel 1 goto :failed
)

if not exist frontend\node_modules (
  echo [SETUP] Installing frontend packages...
  call npm install --prefix frontend
  if errorlevel 1 goto :failed
)

set PYTHONPATH=%CD%\backend

echo [SETUP] Initializing local database...
backend\.venv\Scripts\python.exe backend\scripts\init_db.py
if errorlevel 1 goto :failed
backend\.venv\Scripts\python.exe backend\scripts\create_admin.py
if errorlevel 1 goto :failed

echo [START] Backend: http://127.0.0.1:8000
echo [START] Frontend: http://localhost:5173
start "SafeSphere Backend" cmd /k "cd /d %CD% && set PYTHONPATH=%CD%\backend && backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"
start "SafeSphere Frontend" cmd /k "cd /d %CD%\frontend && npm run dev"

echo.
echo SafeSphere is starting in two terminal windows.
echo Open http://localhost:5173 after Vite reports that it is ready.
echo.
pause
exit /b 0

:failed
echo.
echo [ERROR] Setup failed. Read the error above and fix it before retrying.
pause
exit /b 1
