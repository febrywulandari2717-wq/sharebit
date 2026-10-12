@echo off
setlocal
echo ==== ShareBite: setup sekali jalan ====
echo Prasyarat: XAMPP MySQL sudah Start, Python 3.10+, Node.js 18+, PHP 8.2+, Composer.
echo.

echo [1/6] Membuat kunci JWT...
node scripts\generate-keys.js || goto :error

echo [2/6] Membuat database (MySQL XAMPP, user root tanpa password)...
if exist "C:\xampp\mysql\bin\mysql.exe" (
  "C:\xampp\mysql\bin\mysql.exe" -u root < setup-database.sql
) else (
  echo   mysql.exe tidak ditemukan di C:\xampp. Import setup-database.sql lewat phpMyAdmin secara manual.
)

echo [3/6] Food Service (Python)...
pushd services\food-service
if not exist .venv python -m venv .venv || goto :error
call .venv\Scripts\python.exe -m pip install -r requirements.txt || goto :error
if not exist .env copy .env.example .env >nul
popd

echo [4/6] Request Service (Node.js)...
pushd services\request-service
call npm install || goto :error
if not exist .env copy .env.example .env >nul
popd

echo [5/6] Donation Service (Laravel)...
pushd services\donation-service
call composer install || goto :error
if not exist .env copy .env.example .env >nul
call php artisan key:generate || goto :error
call php artisan migrate --force || goto :error
call php artisan db:seed --force || goto :error
call php artisan db:seed --class=DemoUsersSeeder --force
popd

echo [6/6] Android (Expo)...
pushd frontend\mobile
call npm install || goto :error
popd

echo.
echo SELESAI. Jalankan start-all.bat untuk menyalakan semua service.
goto :eof
:error
echo.
echo GAGAL pada langkah di atas. Baca pesan error, lihat docs\setup-local.md bagian Troubleshooting.
exit /b 1
