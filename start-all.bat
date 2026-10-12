@echo off
echo Menyalakan Food (5001), Request (5002), Donation (5003), Website (5500)...
start "ShareBite Food 5001" cmd /k "cd /d %~dp0services\food-service && .venv\Scripts\python.exe run.py"
start "ShareBite Request 5002" cmd /k "cd /d %~dp0services\request-service && npm start"
start "ShareBite Donation 5003" cmd /k "cd /d %~dp0services\donation-service && php artisan serve --host=0.0.0.0 --port=5003"
start "ShareBite Website 5500" cmd /k "cd /d %~dp0frontend\web && python -m http.server 5500"
timeout /t 6 >nul
start http://localhost:5500
echo Selesai. Untuk menghentikan: tutup keempat jendela, atau jalankan stop-all.bat
