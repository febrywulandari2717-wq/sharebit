# Laporan pengembangan ShareBite (website + backend pendukung)

## 1. Audit awal
Proyek `sharebite-final` berisi 3 service berjalan (Flask 5001, Express 5002, Laravel 8003), website Bootstrap 8 halaman, dan Android Expo. Baseline sebelum perubahan: Food 31, Request 41, Laravel 33 tes lulus; E2E 61 lulus dengan Laravel asli. Kontrak API lama **dipertahankan** (semua endpoint lama tetap bekerja; hanya ditambah).

## 2. Fitur yang benar-benar selesai (UI + API + validasi backend + database + tes)
| Area | Isi |
|---|---|
| Design system | token warna (hijau hutan/daun, krem, abu, aksen oranye), tipografi Fraunces + Plus Jakarta Sans, 30+ komponen: navbar publik, sidebar per peran, tombol, form, kartu makanan, badge status, tabel, modal konfirmasi (dengan alasan), toast, pagination, tabs, breadcrumb, skeleton, empty/error state, grafik SVG berlabel; fokus keyboard, label input, alt text, lazy loading, `prefers-reduced-motion` |
| Halaman publik | Beranda (statistik & makanan terbaru dari API), Jelajahi (cari, kategori, batas konsumsi, urut, radius/jarak, grid/daftar/**peta**), Detail makanan, Cara kerja, Tentang, Kampanye, Dampak, Peringkat, FAQ, Pusat bantuan, Privasi & ketentuan, Login, Registrasi |
| Pengguna | Dashboard per peran, Profil & pengaturan (notifikasi, privasi peringkat, ganti password), Favorit, Notifikasi (lonceng + polling 30 dtk), Riwayat aktivitas (filter tanggal/status) |
| Donatur | Dashboard + grafik, Makanan saya, Tambah/Ubah donasi (foto + pratinjau, alergen, titik peta), Manajemen stok (jumlah, tutup/buka), Permintaan masuk (setujui/tolak + alasan, jadwalkan), Jadwal & riwayat donasi, konfirmasi serah terima, poin/badge |
| Penerima | Dashboard, Jelajahi, Favorit, Permintaan saya (batal, riwayat status), jadwal pengambilan, konfirmasi serah terima |
| Admin | Dashboard (angka & grafik 30 hari, tingkat penyelesaian terdefinisi, kategori populer dari data nyata, aktivitas sistem), Pengguna, Publikasi makanan (moderasi), Permintaan, Laporan (moderasi), Kategori (CRUD), Kampanye (CRUD), Log audit |
| Komunitas | Poin (transparan, sekali per donasi selesai), badge dihitung backend, papan peringkat bulanan/semua (opt-out privasi), kampanye + partisipasi + kemajuan dari data nyata |
| Marketplace | Overselling dicegah (UPDATE atomik), reservasi, Idempotency-Key, unik permintaan aktif per penerima-makanan, kedaluwarsa otomatis 24 jam + stok kembali |

## 3. Endpoint baru / diperbaiki
Lihat [api-contracts.md](api-contracts.md) bagian *Tambahan v1.1*. Ringkas: Food (publik, filter lokasi/waktu, kategori admin, audit), Request (`/activity`, `/requests/stats/timeline`, `completion_rate`, notifikasi keluar), Donation (favorit, notifikasi, laporan, audit, kampanye, gamifikasi, statistik publik, timeline, internal notify/audit, preferensi).

## 4. Perubahan database
Semua aditif dan aman untuk database lama — rincian di [database-design.md](database-design.md). Tidak ada tabel/kolom yang dihapus.

## 5. Hasil pengujian & bug
Lihat [testing.md](testing.md) (jumlah tes, cakupan, 4 bug yang ditemukan dan diperbaiki).

## 6. Belum selesai / tidak dikerjakan (jujur)
| Fitur di prompt | Status | Alasan |
|---|---|---|
| Foto makanan/komunitas berkualitas di landing | Tidak | Tidak ada aset foto berlisensi; hero memakai ilustrasi SVG dan foto makanan berasal dari unggahan donatur nyata |
| Testimoni/cerita terverifikasi | Tidak | Belum ada data; sengaja tidak dibuat (aturan "jangan rekaan") |
| Area mitra/organisasi (profil organisasi, anggota, donasi kolektif, laporan kegiatan) | Tidak | Memerlukan model data baru (organisasi & keanggotaan) di luar cakupan tahap ini; kampanye komunitas tersedia sebagai pengganti terbatas |
| Pesan/chat antar pengguna | Tidak | Berisiko privasi/moderasi; instruksi donatur tersedia di jadwal pengambilan |
| Foto profil | Tidak | Hanya foto makanan yang didukung upload |
| Riwayat perubahan publikasi (versi tiap edit) | Sebagian | Perubahan status permintaan & aksi admin tercatat; edit isi makanan oleh donatur belum diversi |
| "Tandai siap diambil" sebagai langkah terpisah | Digantikan | Alur: setujui → jadwalkan → konfirmasi dua pihak (status `scheduled` = siap diambil) |
| Pemulihan password via email | Tidak | Tidak ada layanan email; tercantum di FAQ |
| Real-time notifikasi | Polling 30 dtk | Sesuai fallback di prompt |
| Aplikasi Android | Tidak diperbarui | Prompt tahap ini fokus pada website |
| Uji klik di browser sungguhan & visual responsif | Belum | Lingkungan pembuat tidak punya browser; diuji di jsdom + API nyata |

## 7. Cara menjalankan
Lihat README root dan [setup-local.md](setup-local.md).
