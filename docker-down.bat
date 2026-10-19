@echo off
cd /d "%~dp0"
echo Menghentikan container tanpa menghapus database atau volume...
docker compose down
