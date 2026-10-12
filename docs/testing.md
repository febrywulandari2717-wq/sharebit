# Pengujian

Siapkan database uji sekali: `mysql -u root < setup-database.sql` (membuat `*_test`).

| Lapisan | Perintah | Cakupan |
|---|---|---|
| Food Service | `cd services/food-service && .venv\Scripts\activate && pytest -v` | token (kedaluwarsa/issuer salah), CRUD, validasi, kepemilikan, pencarian/pagination, foto, reservasi idempoten, stok tidak negatif, release ganda |
| Request Service | `cd services/request-service && npm test` | auth, saga pembuatan, idempotensi, klik ganda paralel, status, otorisasi, callback, kedaluwarsa, rekonsiliasi (Food Service dipalsukan di memori) |
| Donation Service | `cd services/donation-service && php artisan test` | registrasi, login, refresh rotasi, logout, rate limit, admin, donasi, konfirmasi dua pihak, pembatalan, sinkronisasi (Request Service di-mock) |
| End-to-end | `node tests/e2e/run-e2e.js` | 61 pemeriksaan lintas service lewat HTTP (ketiga service harus hidup) |

## Hasil pengujian yang benar-benar dijalankan saat paket ini dibuat
Lingkungan: Linux, MariaDB 10.11 (setara XAMPP), Python 3.12, Node 22.

| Pengujian | Hasil |
|---|---|
| Food Service pytest | **31 lulus, 0 gagal** |
| Request Service jest | **41 lulus, 0 gagal** |
| E2E `run-e2e.js` terhadap Food Service + Request Service asli | **61 lulus, 0 gagal** |
| Bundle Android (`expo export`, Expo SDK 57) | berhasil dikompilasi tanpa error import/sintaks |
| Laravel: `php -l` seluruh file PHP | tanpa error sintaks |

## Yang BELUM terverifikasi di lingkungan pembuat (harap dijalankan di komputer Anda)
- **Donation Service (Laravel) belum dijalankan**: lingkungan pembuat tidak dapat mengunduh paket Composer, sehingga `composer install`, `php artisan test`, dan eksekusi sebenarnya belum pernah dilakukan. Pada uji E2E, peran Donation Service dimainkan oleh stub kecil yang meniru kontraknya; kontrak ini sama dengan yang diimplementasikan Laravel, tetapi **kode Laravel sendiri harus Anda uji**: jalankan `php artisan test`, lalu `node tests/e2e/run-e2e.js` dengan Laravel sungguhan. Jika ada tes gagal, kirim pesan errornya.
- Website belum dibuka di browser sungguhan (hanya sintaks JS diperiksa).
- Aplikasi Android belum dijalankan di emulator/HP (hanya kompilasi bundle yang berhasil).
- Pengujian beban/paralel berat tidak dilakukan; pencegahan stok negatif diuji dengan 3–4 permintaan paralel.
