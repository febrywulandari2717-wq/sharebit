# Menjalankan ShareBite dengan Docker Compose

## Perintah
```bash
docker compose up -d --build     # build image + jalankan semua (pertama kali beberapa menit)
docker compose ps                # semua service harus "healthy"
docker compose logs -f           # log semua service (atau: logs -f donation-service)
docker compose down              # hentikan (data tetap ada di volume)
docker compose down -v           # hentikan DAN hapus data (database, foto, kunci JWT)
```
Opsional: salin `.env.docker.example` menjadi `.env` untuk mengganti port/password. Tanpa `.env`, nilai bawaan pengembangan dipakai.

## Alamat
| Apa | Alamat |
|---|---|
| **Website (gateway)** | http://localhost:8080 |
| Food Service (Python/Flask) | http://localhost:5001/health · lewat gateway: http://localhost:8080/food/ |
| Request Service (Node/Express) | http://localhost:5002/health · lewat gateway: http://localhost:8080/request/ |
| Donation/Identity (PHP/Laravel) | http://localhost:8003/api/health · lewat gateway: http://localhost:8080/identity/ |
| MariaDB (opsional, dari host) | `127.0.0.1:3307` (user root / password `MYSQL_ROOT_PASSWORD`) |

Akun awal: admin `admin@sharebite.local` / `Admin12345`; demo `donor@sharebite.local` & `penerima@sharebite.local` / `Rahasia123` (matikan dengan `SEED_DEMO=false`).

## Isi stack
| Service | Image | Peran |
|---|---|---|
| `mysql` | mariadb:10.11 | satu server, 3 database (`sharebite_food/request/donation`), **satu user per service** yang hanya berhak atas database miliknya (`docker/mysql/init/01-sharebite.sh`) |
| `keygen` | node:20-alpine | membuat pasangan kunci JWT RS256 sekali di volume `jwt_keys` (selesai lalu berhenti) |
| `food-service` | python:3.12-slim + gunicorn | Flask; tabel & 6 kategori dibuat otomatis; foto di volume `food_uploads` |
| `request-service` | node:20-alpine | Express; tabel dibuat otomatis; rekonsiliasi berkala di dalam proses |
| `donation-service` | php:8.3-cli | Laravel; entrypoint menunggu DB → `migrate` → seed admin (+demo) → `artisan serve` (4 worker) |
| `donation-scheduler` | image sama | `schedule:work` — pengingat pengambilan tiap jam |
| `web` | nginx:1.27-alpine | website statis + reverse proxy `/food/`, `/request/`, `/identity/` (satu origin → tidak ada masalah CORS) |

Urutan start diatur `depends_on` + healthcheck: mysql & keygen → food → request → donation → web.

## Keamanan & produksi
- Ganti semua password/kunci di `.env` sebelum dipakai di luar komputer sendiri (`APP_KEY` bawaan hanya untuk pengembangan).
- Kunci privat JWT hanya dibutuhkan Donation Service, tetapi satu volume dipakai bersama (read-only) demi kesederhanaan; untuk produksi pisahkan volume publik/privat.
- Gateway belum memakai HTTPS; letakkan di belakang reverse proxy/ingress ber-TLS untuk produksi.
- Password database hanya dipakai saat volume dibuat pertama kali; mengubahnya sesudahnya memerlukan `down -v` (menghapus data) atau `ALTER USER` manual.

## Data & pemeliharaan
```bash
docker compose exec mysql sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --databases sharebite_food sharebite_request sharebite_donation' > backup.sql
docker compose exec donation-service php artisan donations:remind        # pengingat manual
docker compose exec donation-service php artisan migrate --force         # setelah update kode
docker compose up -d --build food-service                                # rebuild satu service
```
Jangan menjalankan stack XAMPP/native pada port yang sama (5001, 5002, 8003, 8080) saat Docker aktif — jalankan `stop-all.bat` dulu. MariaDB Docker memakai port host 3307 sehingga tidak bentrok dengan XAMPP (3306).

## Troubleshooting
| Gejala | Solusi |
|---|---|
| `port is already allocated` | ubah `*_PORT` di `.env` atau hentikan proses lain (`stop-all.bat`) |
| `donation-service` unhealthy / lama | `docker compose logs donation-service` — biasanya menunggu DB atau migrasi; tunggu ±1 menit saat pertama |
| `Access denied` ke database | password di `.env` berbeda dari yang dipakai saat volume dibuat → `docker compose down -v` lalu `up` lagi |
| Website tampil tapi login gagal "tidak dapat terhubung" | buka http://localhost:8080 (bukan file HTML langsung); cek `docker compose ps` |
| Build lambat/gagal di `composer install` | butuh internet ke packagist.org; ulangi `docker compose build donation-service` |

## Status verifikasi Docker (jujur)
Lingkungan tempat paket ini disusun **tidak dapat mengunduh image dasar** (Docker Hub tidak terjangkau), sehingga `docker compose build/up` **belum pernah dijalankan end-to-end**. Yang sudah diverifikasi:
- `docker compose config` — file Compose valid (Docker Compose v2.40).
- Daemon Docker menerima konteks build dan mem-parse Dockerfile sampai langkah `FROM` (gagal hanya karena registry tidak terjangkau).
- **Emulasi native dengan topologi identik** — konteks build sesuai `.dockerignore`, langkah `RUN` yang sama (`pip install -r requirements.txt`, `npm ci --omit=dev`), nama host yang sama (`mysql`, `food-service`, `request-service`, `donation-service`), variabel lingkungan yang sama tanpa file `.env`, **skrip init MariaDB asli** (database + user terpisah; isolasi antar-user diperiksa), **entrypoint Laravel asli** (tunggu DB → migrate → seed → serve), `gunicorn --preload -w 2`, `php artisan serve --no-reload` dengan `PHP_CLI_SERVER_WORKERS=4`, dan **nginx dengan `nginx.conf` asli**. Hasil: ketiga service + gateway sehat; E2E lewat gateway **102/102 lulus**; 44 uji halaman lewat gateway lulus.
- Bug yang ditemukan lewat emulasi dan sudah diperbaiki: init DB gagal saat password root kosong; lokasi regex `.png` pada nginx mengalahkan proxy `/food/` (foto tidak terkirim) → memakai `location ^~`.

Belum teruji: kompilasi image sebenarnya (`apt`/`composer install`/`docker-php-ext-install pdo_mysql` di dalam build), izin file pada volume sebagai user non-root, dan perilaku healthcheck di dalam container. Jika `docker compose up` gagal di komputer Anda, kirimkan keluaran `docker compose logs` agar saya perbaiki.
