# Website ShareBite
HTML/CSS/JavaScript murni dengan design system sendiri (`css/style.css`); tanpa Bootstrap. Font Google dan peta (Leaflet/OpenStreetMap) dimuat dari internet; bila gagal, halaman tetap berfungsi (font cadangan, daftar alamat).

```bash
python -m http.server 8080 --bind 127.0.0.1    # lalu buka http://127.0.0.1:8080
```
Alamat backend: `js/config.js`. Struktur: `js/api.js` (klien API + refresh token), `js/ui.js` (komponen), `js/shell.js` (navbar/sidebar/guard peran), `js/pages/*.js` (satu berkas per halaman).
Halaman lama `catalog`, `dashboard-donor`, `dashboard-recipient`, `dashboard-admin` tetap ada sebagai pengalihan ke halaman baru.
