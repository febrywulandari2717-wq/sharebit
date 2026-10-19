# Pengujian

Siapkan database uji sekali: `mysql -u root < setup-database.sql` (membuat `*_test`).

| Lapisan | Perintah | Hasil saat paket dibuat |
|---|---|---|
| Food Service | `cd services/food-service && .venv\Scripts\activate && pytest -v` | **39 lulus** |
| Request Service | `cd services/request-service && npm test` | **47 lulus** |
| Donation Service (Laravel) | `cd services/donation-service && php artisan test` | **49 lulus** (222 assertion) |
| End-to-end, ketiga service nyata | `node tests/e2e/run-e2e.js` | **102 lulus** |
| Halaman website (DOM virtual) | `npm i jsdom@24` lalu `node tests/e2e/smoke-web.js` | **44 lulus** (40 halaman + 3 uji guard + 1) |
| Bundle Android | `cd frontend/mobile && npx expo export --platform android` | berhasil (build sebelumnya; fitur mobile tidak diubah) |

Lingkungan uji: Linux, MariaDB 10.11 (setara XAMPP), Python 3.12, Node 22, PHP 8.3, Laravel 12.

## Yang diuji
- **Keamanan:** token kedaluwarsa/issuer salah/rusak, otorisasi per peran dan per objek (donor lain/penerima lain → 404/403), endpoint internal tanpa `X-Service-Key`, rate limit login, log audit tidak memuat rahasia.
- **Konsistensi data:** stok tidak pernah negatif (termasuk 4 permintaan paralel), klik ganda, Idempotency-Key, pelepasan stok idempoten, poin tidak ganda, satu favorit per makanan.
- **Fitur baru:** filter radius/jarak/waktu, katalog publik, kategori admin, favorit, notifikasi lintas service, riwayat aktivitas + filter tanggal/status, statistik & deret waktu, poin/badge/peringkat (termasuk privasi), laporan → moderasi → notifikasi pelapor, audit log, kampanye (kemajuan dari donasi selesai peserta saja).
- **Halaman:** setiap halaman dimuat terhadap backend nyata tanpa error JavaScript, tanpa state error, tanpa skeleton tertinggal; halaman terlarang dialihkan.

## Bug yang ditemukan lewat pengujian dan sudah diperbaiki
1. Query peringkat melanggar `ONLY_FULL_GROUP_BY` MySQL/MariaDB (500 di `/me/gamification`) — ditemukan tes Laravel.
2. Skrip halaman masih berjalan sesaat setelah pengguna dialihkan ke login (error `null.name`) — kini skrip halaman tidak dimuat bila guard gagal.
3. Migrasi Laravel awal akan gagal ("table already exists") pada database lama — kini idempoten.
4. Permintaan masuk pada database lama gagal bila kolom `food_title`/`donor_id` NOT NULL — dipertahankan perbaikan Anda di repositori dan skema baru memakai kolom nullable.

## Belum diverifikasi
- Interaksi klik di **browser sungguhan** (Chrome/Edge) dan tampilan visual/responsif: yang diuji adalah pemuatan halaman di jsdom dan seluruh API di baliknya. Mohon dicoba manual, terutama tampilan mobile dan peta.
- **Peta** memakai Leaflet + OpenStreetMap lewat CDN (butuh internet); bila gagal dimuat, halaman menampilkan daftar alamat.
- Aplikasi **Android** tidak mendapat fitur baru pada tahap ini (fokus website); hanya port Donation Service diubah ke 8003.
