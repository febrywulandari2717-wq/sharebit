# Donation + Identity Service (PHP + Laravel 12) — port 5003
Registrasi, login, JWT RS256 (kunci privat hanya di service ini), pengguna, donasi, dan jadwal pengambilan.

Folder ini adalah skeleton Laravel 12 + kode ShareBite. Folder `vendor/` belum ada; buat dengan Composer.

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed                              # admin: admin@sharebite.local / Admin12345
php artisan db:seed --class=DemoUsersSeeder      # opsional akun demo
php artisan serve --host=0.0.0.0 --port=5003
php artisan test                                 # butuh database sharebite_donation_test
php artisan donations:sync                       # kirim ulang status ke Request Service yang gagal
```
Health: `http://localhost:5003/api/health` (buka lewat `localhost`, bukan `0.0.0.0`).
Butuh PHP 8.2+ dengan ekstensi `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `curl`.
Tes memakai kunci JWT sementara sehingga tidak memerlukan folder `keys/`.
