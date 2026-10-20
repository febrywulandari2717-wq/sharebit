# Checklist persyaratan

| # | Persyaratan | Status | Bukti |
|---|---|---|---|
| 1 | Website, Python+JS+PHP, 3 microservice, XAMPP, 3 database | ✅ | `docs/architecture.md` |
| 2 | REST JSON, autentikasi, otorisasi peran & objek | ✅ | 49 tes Laravel, 47 Request, 39 Food |
| 3 | Pencegahan overselling & permintaan ganda | ✅ | tes paralel + E2E |
| 4 | Landing page, katalog (filter/urut/pagination/grid-list/peta), detail, reservasi | ✅ | smoke 44 + E2E |
| 5 | Donasi: publikasi, edit, stok, permintaan, jadwal, serah terima | ✅ | E2E bagian 5–7 |
| 6 | Dashboard analitik per peran dengan grafik berlabel | ✅ | smoke + tes timeline |
| 7 | Favorit, notifikasi, riwayat | ✅ | E2E bagian 11–12 |
| 8 | Poin, badge, peringkat, kampanye | ✅ | tes Laravel + E2E 13, 15 |
| 9 | Peta & lokasi | ✅ (butuh internet untuk tile OSM; fallback daftar) | tes Food + smoke |
| 10 | Profil, pusat bantuan, pelaporan | ✅ | E2E 14 |
| 11 | Admin: pengguna, makanan, permintaan, laporan, kategori, kampanye, audit | ✅ | smoke admin + E2E 14 |
| 12 | Area mitra/organisasi, chat, foto profil, testimoni | ❌ | lihat laporan §6 |
| 13 | Docker Compose (3 bahasa backend + gateway + DB) | ✅ dibuat, ⏳ build image belum teruji (registry tidak terjangkau); topologi diuji lewat emulasi: E2E 102/102 | `docs/docker.md` |
| 13b | Deployment cloud | — tidak dikerjakan | |
| 14 | Uji di browser sungguhan | ⏳ belum | mohon dicoba manual |
