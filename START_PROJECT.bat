@echo off
setlocal
cd /d %~dp0

if not exist .env (
  copy .env.example .env >nul
  echo Created .env from .env.example
  echo IMPORTANT: Change SECRET_KEY and demo credentials before production use.
)

where docker >nul 2>&1
if %ERRORLEVEL% equ 0 (
  echo Docker detected. Starting PostgreSQL/PostGIS deployment...
  docker compose up --build
) else (
  echo Docker not detected. Starting the local SQLite development setup...
  call START_LOCAL.bat
)

endlocal
