# Request Service (Node.js + Express) — port 5002
Mengelola permintaan makanan, status, riwayat, dan reservasi stok melalui Food Service.

```bash
npm install
copy .env.example .env
npm start                # database & tabel dibuat otomatis; rekonsiliasi otomatis tiap 60 detik
npm test                 # butuh database sharebite_request_test
npm run reconcile        # opsional: jalankan pembersihan manual
npm run migrate          # opsional: buat tabel saja
```
Health: `GET /health`. Food Service harus hidup agar permintaan dapat dibuat.
