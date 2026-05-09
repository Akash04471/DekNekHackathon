@echo off
echo ===================================================
echo   NEXUS JUNCTION — AI Traffic Optimization System
echo ===================================================
echo.

echo [1/2] Starting Backend (FastAPI)...
start "NEXUS Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (Vite)...
start "NEXUS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   NEXUS JUNCTION is starting up!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ===================================================
echo.
timeout /t 4 /nobreak >nul
start http://localhost:5173
