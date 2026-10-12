# Panduan demo presentasi (± 8 menit)

Persiapan: `start-all.bat`, buka <http://localhost:5500> di dua jendela browser (satu biasa, satu *incognito*) agar bisa login dua akun bersamaan. Login Android sebagai penerima (opsional).

1. **Arsitektur (1 menit).** Tampilkan `docs/architecture.md`: tiga bahasa (Python, JavaScript, PHP), tiga database, JWT RS256, komunikasi REST antar service.
2. **Health check.** Buka `localhost:5001/health`, `5002/health`, `5003/api/health` → ketiganya `ok`. Tunjukkan phpMyAdmin: tiga database terpisah.
3. **Donor.** Login `donor@sharebite.local` → *Dashboard Donor* → **Bagikan makanan** (isi data, unggah foto) → makanan muncul di tabel.
4. **Penerima.** Jendela incognito: login `penerima@sharebite.local` → Katalog → buka makanan → ajukan 2 porsi. Tunjukkan stok berkurang (reservasi di Food Service) dan status *Menunggu*.
5. **Keamanan data.** Coba ajukan lagi (ditolak: permintaan aktif ganda); coba jumlah melebihi batas (ditolak). Sebutkan `Idempotency-Key` dan stok tidak bisa negatif.
6. **Persetujuan & jadwal.** Donor → tab *Permintaan masuk* → **Setujui** → **Jadwalkan** (Donation Service membuat donasi lalu memberi callback ke Request Service, status menjadi *Dijadwalkan*).
7. **Serah terima.** Buka halaman *Donasi* di kedua akun, klik **Konfirmasi serah terima** di keduanya → status *Selesai*. Penerima membuka **Detail** untuk melihat riwayat status.
8. **Penolakan/pembatalan.** Buat permintaan baru lalu **Tolak** dengan alasan → stok kembali.
9. **Admin.** Login `admin@sharebite.local` → statistik tiga service, daftar pengguna, nonaktifkan akun (akun itu tidak bisa login lagi).
10. **Pengujian.** Tampilkan hasil `pytest`, `npm test`, `php artisan test`, dan `node tests/e2e/run-e2e.js`.
11. **Android (opsional).** Tunjukkan aplikasi Expo memakai backend yang sama.

Skenario ketahanan (jika ditanya): matikan Food Service lalu ajukan permintaan → pesan *service tidak dapat dihubungi*, tidak ada stok yang tertahan; nyalakan lagi → berfungsi normal.
