@echo off
rem Menjalankan ShareBite dengan Docker Compose (Docker Desktop harus berjalan).
docker compose up -d --build || goto :error
echo Menunggu semua service sehat...
timeout /t 25 >nul
docker compose ps
start http://localhost:8080
goto :eof
:error
echo Gagal. Jalankan: docker compose logs
exit /b 1
