@echo off
rem Untuk Anda yang SUDAH memasang versi sebelumnya: memperbarui dependensi + database tanpa menghapus data.
setlocal
node scripts\sync-env.js || goto :error
pushd services\food-service
call .venv\Scripts\python.exe -m pip install -r requirements.txt || goto :error
popd
pushd services\request-service
call npm install || goto :error
popd
pushd services\donation-service
call composer install || goto :error
call php artisan migrate --force || goto :error
popd
echo Pembaruan selesai (data lama dipertahankan). Food Service menambah kolom koordinat otomatis saat start.
goto :eof
:error
echo GAGAL. Baca pesan error di atas.
exit /b 1
