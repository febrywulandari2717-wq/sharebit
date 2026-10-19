@echo off
echo Menyalakan Food (5001), Request (5002), Donation (8003), Website (8080)...
start "ShareBite Food 5001" cmd /k "cd /d %~dp0services\food-service && .venv\Scripts\python.exe run.py"
start "ShareBite Request 5002" cmd /k "cd /d %~dp0services\request-service && npm start"
start "ShareBite Donation 8003" cmd /k "cd /d %~dp0services\donation-service && php artisan serve --host=0.0.0.0 --port=8003"
start "ShareBite Website 8080" cmd /k "cd /d %~dp0frontend\web && python -m http.server 8080 --bind 127.0.0.1"
rem Opsional: pengingat pengambilan otomatis tiap jam (hapus 'rem' di baris berikut)
rem start "ShareBite Scheduler" cmd /k "cd /d %~dp0services\donation-service && php artisan schedule:work"
timeout /t 6 >nul
start http://127.0.0.1:8080
echo Selesai. Hentikan dengan stop-all.bat
