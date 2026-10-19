@echo off
setlocal
echo ==== ShareBite: setup sekali jalan ====
echo Prasyarat: XAMPP MySQL sudah Start, Python 3.10+, Node.js 18+, PHP 8.2+, Composer.
echo.
echo [1/7] Kunci JWT...
node scripts\generate-keys.js || goto :error
echo [2/7] Database (MySQL XAMPP, user root tanpa password)...
set MYSQL=
if exist "C:\xamppnew\mysql\bin\mysql.exe" set MYSQL=C:\xamppnew\mysql\bin\mysql.exe
if exist "C:\xampp\mysql\bin\mysql.exe" set MYSQL=C:\xampp\mysql\bin\mysql.exe
if defined MYSQL ("%MYSQL%" -u root < setup-database.sql) else (echo   mysql.exe tidak ditemukan. Import setup-database.sql lewat phpMyAdmin secara manual.)
echo [3/7] Food Service (Python)...
pushd services\food-service
if not exist .venv python -m venv .venv || goto :error
call .venv\Scripts\python.exe -m pip install -r requirements.txt || goto :error
if not exist .env copy .env.example .env >nul
popd
echo [4/7] Request Service (Node.js)...
pushd services\request-service
call npm install || goto :error
if not exist .env copy .env.example .env >nul
popd
echo [5/7] Donation Service (Laravel)...
pushd services\donation-service
call composer install || goto :error
if not exist .env copy .env.example .env >nul
popd
echo [6/7] Menyelaraskan variabel .env...
node scripts\sync-env.js || goto :error
echo [7/7] Migrasi database Laravel + data awal...
pushd services\donation-service
call php artisan key:generate --force || goto :error
call php artisan migrate --force || goto :error
call php artisan db:seed --force || goto :error
call php artisan db:seed --class=DemoUsersSeeder --force
popd
echo.
echo SELESAI. Jalankan start-all.bat. (Android: cd frontend\mobile ^&^& npm install)
goto :eof
:error
echo.
echo GAGAL pada langkah di atas. Lihat docs\setup-local.md bagian Troubleshooting.
exit /b 1
