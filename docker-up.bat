@echo off
setlocal
cd /d "%~dp0"
where docker >nul 2>nul || (echo Docker CLI tidak ditemukan. Instal Docker Desktop terlebih dahulu.& exit /b 1)
docker info >nul 2>nul || (echo Docker Engine belum aktif. Buka Docker Desktop dan tunggu sampai Running.& exit /b 1)
if not exist .env copy .env.docker.example .env >nul
docker compose up -d --build
if errorlevel 1 exit /b 1
echo.
echo ShareBite telah diminta berjalan melalui Docker Compose.
echo Website: http://localhost:8080
echo Food API: http://localhost:5001/health
echo Request API: http://localhost:5002
 echo Donation API: http://localhost:8003
 echo Periksa status dengan: docker compose ps
