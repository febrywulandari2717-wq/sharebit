# ShareBite

Platform food-sharing: marketplace makanan berlebih, manajemen donasi, reservasi & pengambilan, komunitas (kampanye, poin, badge, peringkat), notifikasi, analitik dampak, serta moderasi admin. Proyek mata kuliah Cloud Computing.

| Bagian | Teknologi | Lokasi | Port |
|---|---|---|---|
| Website | HTML5, CSS3, JavaScript (tanpa framework; design system sendiri) | `frontend/web` | 8080 |
| Food Service | Python, Flask, SQLAlchemy | `services/food-service` | 5001 |
| Request Service | Node.js, Express | `services/request-service` | 5002 |
| Donation + Identity Service | PHP, Laravel 12 | `services/donation-service` | 8003 |
| Android | React Native + Expo SDK 57 (belum diperbarui pada tahap ini) | `frontend/mobile` | – |
| Database | MySQL XAMPP — 3 database terpisah | – | 3306 |

## Menjalankan (Windows)
- **Sudah punya versi sebelumnya?** Ekstrak zip *menimpa* folder lama (file `.env`, `vendor/`, `node_modules/`, `.venv/`, kunci di `keys/`, dan data database tidak ikut ditimpa/dihapus), lalu jalankan **`update.bat`** (sinkron `.env`, `composer install`, `npm install`, `php artisan migrate`). Setelah itu `start-all.bat`.
- **Instalasi baru:** Start MySQL XAMPP → `setup.bat` → `start-all.bat` (membuka http://127.0.0.1:8080).

Akun: admin `admin@sharebite.local` / `Admin12345`; demo `donor@sharebite.local`, `penerima@sharebite.local` / `Rahasia123`. Pengingat pengambilan: `php artisan schedule:work` (opsional) atau `php artisan donations:remind`.

## Docker Compose (alternatif tanpa XAMPP)
```bash
docker compose up -d --build        # lalu buka http://localhost:8080
```
Detail, alamat, dan status verifikasi: [docs/docker.md](docs/docker.md). Hentikan stack XAMPP/native (`stop-all.bat`) sebelum memakai Docker karena port sama.

## Dokumentasi
[Docker](docs/docker.md) · [Laporan pengembangan](docs/laporan-pengembangan.md) · [Arsitektur](docs/architecture.md) · [Kontrak API](docs/api-contracts.md) · [Database](docs/database-design.md) · [Setup lokal](docs/setup-local.md) · [Panduan demo](docs/demo-guide.md) ·

