# ShareBite

Platform food-sharing untuk berbagi makanan berlebih yang masih layak dikonsumsi. Fitur mencakup marketplace makanan, manajemen donasi, reservasi dan pengambilan, komunitas (kampanye, poin, badge, peringkat), notifikasi, analitik dampak, serta moderasi admin. Proyek mata kuliah Cloud Computing.

| Bagian | Teknologi | Lokasi | Port |
|---|---|---|---|
| Website | HTML5, CSS3, JavaScript (tanpa framework; design system sendiri) | `frontend/web` | 8080 |
| Food Service | Python, Flask, SQLAlchemy | `services/food-service` | 5001 |
| Request Service | Node.js, Express | `services/request-service` | 5002 |
| Donation + Identity Service | PHP, Laravel 12 | `services/donation-service` | 8003 |
| Android | React Native + Expo SDK 57 (belum diperbarui pada tahap ini) | `frontend/mobile` | – |
| Database | MySQL XAMPP — 3 database terpisah | – | 3306 |

## Menjalankan (Windows)

- **Sudah punya versi sebelumnya?** Ekstrak ZIP dengan menimpa folder lama. Pastikan file `.env`, folder `vendor/`, `node_modules/`, `.venv/`, kunci di `keys/`, dan data database tidak ikut ditimpa atau dihapus. Jalankan `update.bat` untuk sinkronisasi `.env`, `composer install`, `npm install`, dan `php artisan migrate`. Setelah selesai, jalankan `start-all.bat`.
- **Instalasi baru:** Jalankan MySQL XAMPP, lalu `setup.bat` dan `start-all.bat`. Website dapat diakses melalui http://127.0.0.1:8080.

Akun demo:

- Admin: `admin@sharebite.local` / `Admin12345`
- Donor: `donor@sharebite.local` / `Rahasia123`
- Penerima: `penerima@sharebite.local` / `Rahasia123`

Pengingat pengambilan dapat dijalankan melalui `php artisan schedule:work` (opsional) atau `php artisan donations:remind`.

## Dokumentasi

- [Laporan pengembangan](docs/laporan-pengembangan.md)
- [Arsitektur](docs/architecture.md)
- [Kontrak API](docs/api-contracts.md)
- [Database](docs/database-design.md)
- [Setup lokal](docs/setup-local.md)
- [Pengujian](docs/testing.md)
- [Panduan demo](docs/demo-guide.md)
- [Checklist](docs/checklist.md)