# Checklist persyaratan tugas

| # | Persyaratan | Status | Bukti / catatan |
|---|---|---|---|
| 1 | Website dapat dipakai lewat browser | Dibuat; **belum diuji di browser** | `frontend/web` (10 halaman) |
| 2 | Android React Native + Expo | Dibuat; bundle terkompilasi; **belum dijalankan di perangkat** | `frontend/mobile` |
| 3 | Minimal 3 bahasa | ✅ | Python, JavaScript, PHP |
| 4 | Tiga backend microservice terpisah | ✅ | Flask :5001, Express :5002, Laravel :5003 |
| 5 | XAMPP sebagai MySQL | ✅ | koneksi `127.0.0.1:3306`, `setup-database.sql` |
| 6 | Tiga database terpisah | ✅ | `sharebite_food`, `sharebite_request`, `sharebite_donation` |
| 7 | REST API JSON | ✅ | `docs/api-contracts.md` |
| 8 | Autentikasi & otorisasi | ✅ (Laravel belum dijalankan) | JWT RS256, peran donor/recipient/admin, hashing bcrypt |
| 9 | Pengujian tiap service & integrasi | Food ✅ 31, Request ✅ 41, E2E ✅ 61 (dengan stub identity); **Laravel: tes ditulis, belum dijalankan** | `docs/testing.md` |
| 10 | Dokumentasi | ✅ | `docs/`, README tiap service |
| 11 | Siap Docker | ✅ (tanpa Dockerfile sesuai batas) | konfigurasi lewat environment variable |
| 12 | Tidak ada FK lintas database | ✅ | |
| 13 | Request Service tidak mengakses tabel Food Service | ✅ | hanya lewat REST |
| 14 | Pencegahan stok negatif / permintaan ganda | ✅ | UPDATE atomik, unique key, Idempotency-Key |
| 15 | Validasi perubahan status | ✅ | mesin status + riwayat |
| 16 | Penanganan timeout/error API | ✅ | timeout 5 detik, kode 503/504, kompensasi, rekonsiliasi |
| 17 | Secret lewat environment, ada `.env.example` | ✅ | |
| 18 | Tidak membuat Docker/compose | ✅ | sesuai instruksi |
