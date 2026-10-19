# Panduan demo presentasi (± 10 menit)

Persiapan: `start-all.bat`; buka http://127.0.0.1:8080 di jendela biasa dan *incognito* (dua akun bersamaan).

1. **Arsitektur:** buka `docs/architecture.md` — 3 bahasa, 3 database, JWT RS256, komunikasi REST + kunci antar-service.
2. **Beranda & data nyata:** statistik, kategori, makanan terbaru, kampanye berasal dari API (jika kosong → empty state jujur).
3. **Donatur** (`donor@sharebite.local`): *Tambah donasi* — isi data, foto, klik *Gunakan lokasi saya*; makanan muncul di *Makanan saya*.
4. **Penerima** (incognito, `penerima@sharebite.local`): *Jelajahi* → filter, tampilan **Peta**, simpan **Favorit**, ajukan permintaan.
5. **Notifikasi:** donatur melihat lonceng bertambah → *Permintaan masuk* → **Setujui** → **Jadwalkan**; penerima menerima notifikasi.
6. **Serah terima:** kedua akun *Konfirmasi serah terima* → donasi selesai; poin donatur +10 +porsi (sekali saja).
7. **Keamanan data:** ajukan lagi (ditolak: permintaan aktif ganda), jumlah melebihi batas, stok tidak negatif.
8. **Komunitas:** *Peringkat & badge*, *Kampanye* (ikut, lihat kemajuan dari donasi selesai).
9. **Laporan & moderasi:** penerima *Laporkan makanan* → admin (`admin@sharebite.local`) *Laporan* → selesaikan dengan catatan → pelapor mendapat notifikasi → *Log audit* mencatatnya.
10. **Admin:** dashboard & grafik, nonaktifkan pengguna, kategori, kampanye.
11. **Pengujian:** tampilkan hasil `pytest`, `npm test`, `php artisan test`, `node tests/e2e/run-e2e.js`.
