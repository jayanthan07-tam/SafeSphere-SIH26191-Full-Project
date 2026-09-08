@echo off
cd /d %~dp0
where docker >nul 2>&1
if %ERRORLEVEL% equ 0 (
  docker compose down 2>nul
)
echo Stopping any running backend and frontend processes...
powershell -NoProfile -Command "Get-Process -Name 'node', 'python' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*uvicorn*' -or $_.CommandLine -like '*app.main:app*' -or $_.CommandLine -like '*vite*' } | Stop-Process -Force -ErrorAction SilentlyContinue" 2>nul
echo Done.
