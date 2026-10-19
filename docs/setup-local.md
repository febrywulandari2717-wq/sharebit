# Setup lokal (Windows + XAMPP)

## Prasyarat
| Perangkat | Versi | Cek |
|---|---|---|
| XAMPP (MySQL/MariaDB) | 5.7+ / 10.4+ | Start **MySQL** di XAMPP Control Panel |
| Python | 3.10+ | `python --version` |
| Node.js + npm | 18+ | `node --version` |
| PHP | 8.2+ (ekstensi `pdo_mysql`, `mbstring`, `openssl`, `fileinfo` aktif) | `php --version` |
| Composer | 2.x | `composer --version` |

> PHP bawaan XAMPP kadang lebih lama dari 8.2. Jika `php --version` < 8.2, pakai PHP 8.2+ yang lain dan pastikan ada di PATH.

## Cara cepat (disarankan)
1. Ekstrak folder `sharebite`. Start MySQL di XAMPP.
2. Klik dua kali `setup.bat` (membuat kunci JWT, database, memasang semua dependensi, migrasi, seed).
3. Klik dua kali `start-all.bat`. Website terbuka di <http://127.0.0.1:8080>. Jika Anda sudah punya versi sebelumnya, pakai `update.bat` sebagai pengganti `setup.bat` (data dan `.env` dipertahankan).

Akun bawaan: admin `admin@sharebite.local` / `Admin12345`; demo donor `donor@sharebite.local` dan penerima `penerima@sharebite.local` (password `Rahasia123`).

## Cara manual
```bash
node scripts/generate-keys.js                 # kunci JWT -> keys/
mysql -u root < setup-database.sql            # atau import lewat phpMyAdmin

# Food Service
cd services/food-service
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py                                  # http://localhost:5001/health

# Request Service (terminal baru)
cd services/request-service
npm install && copy .env.example .env
npm start                                      # http://localhost:5002/health

# Donation Service (terminal baru)
cd services/donation-service
composer install && copy .env.example .env
php artisan key:generate
php artisan migrate && php artisan db:seed
php artisan db:seed --class=DemoUsersSeeder    # opsional: akun demo
php artisan serve --host=0.0.0.0 --port=8003   # http://localhost:8003/api/health

# Website (terminal baru)
cd frontend/web && python -m http.server 8080  # http://localhost:8080
```
Password MySQL XAMPP biasanya kosong. Jika Anda mengisinya, ubah `DB_PASSWORD` di tiga file `.env`.

## Android (Expo)
```bash
cd frontend/mobile
npm install
npx expo start
```
Scan QR dengan **Expo Go** di HP (HP dan laptop **satu Wi-Fi**). Aplikasi otomatis memakai IP laptop. Jika gagal:
- Isi `API_HOST_OVERRIDE` di `frontend/mobile/src/config.js` dengan IP laptop (`ipconfig` → IPv4), atau `10.0.2.2` untuk emulator Android Studio.
- Izinkan port 5001, 5002, 8003, 8080 di Windows Firewall (Private network).
- Service sudah mendengarkan `0.0.0.0` sehingga dapat diakses dari HP.
Expo Go di Play Store hanya mendukung SDK terbaru; proyek memakai Expo SDK 57. Jika versi Expo Go Anda berbeda, jalankan `npx expo install --fix`.

## Konfigurasi penting
| Hal | Lokasi |
|---|---|
| Kunci antar-service harus sama | `REQUEST_SERVICE_KEY` di food-service & request-service `.env`; `DONATION_SERVICE_KEY` di request-service & donation-service `.env` (nilai bawaan sudah cocok) |
| Alamat backend untuk website | `frontend/web/js/config.js` |
| Alamat backend untuk Android | `frontend/mobile/src/config.js` |
| Port | `PORT` di `.env` Food/Request; `--port` pada `php artisan serve` |

## Troubleshooting
| Gejala | Solusi |
|---|---|
| `Access denied for user 'root'` | isi `DB_PASSWORD` di `.env` |
| Food/Request gagal start: koneksi ditolak | MySQL XAMPP belum Start |
| `Kunci publik JWT tidak ditemukan` | jalankan `node scripts/generate-keys.js` |
| Semua request 401 setelah ganti kunci | login ulang (token lama dibuat dengan kunci lama) |
| `EADDRINUSE` / port terpakai | jalankan `stop-all.bat`, lalu start ulang |
| Laravel `No application encryption key` | `php artisan key:generate` |
| Laravel: `could not find driver` | aktifkan `extension=pdo_mysql` di `php.ini` |
| Browser: `0.0.0.0` tidak bisa dibuka | buka `http://localhost:8003`, bukan `0.0.0.0` |
| Register/login di browser "METHOD_NOT_ALLOWED" | itu endpoint POST; gunakan halaman website atau Thunder Client |
| Request 503 `UPSTREAM_UNAVAILABLE` | service tujuan belum jalan / key tidak cocok |
