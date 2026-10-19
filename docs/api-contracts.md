# Kontrak API ShareBite v1

Semua respons JSON.
- Sukses: `{ "data": ... }`, daftar ditambah `"meta": { page, per_page, total, total_pages }`.
- Error: `{ "error": { "code": "...", "message": "...", "details": { "field": ["pesan"] } } }` (`details` opsional).
- Autentikasi: header `Authorization: Bearer <access_token>`. Waktu ISO 8601 UTC (`2026-10-12T10:00:00Z`).
- Pagination: `?page=1&per_page=12` (maks 50).

Kode error umum: `VALIDATION_ERROR` 422, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429, `UPSTREAM_UNAVAILABLE` 503, `UPSTREAM_TIMEOUT` 504, `INTERNAL_ERROR` 500.

Peran: **D** donor, **R** recipient (penerima), **A** admin.

## Donation + Identity Service — `http://localhost:8003/api`
| Metode & path | Akses | Keterangan |
|---|---|---|
| GET `/health` | publik | status service & database |
| POST `/v1/auth/register` | publik | `name, email, password, password_confirmation, role(donor\|recipient), phone?, address?` → 201 user |
| POST `/v1/auth/login` | publik | `email, password` → `access_token, refresh_token, expires_in, user`. Dibatasi 10x/15 menit per IP+email (429) |
| POST `/v1/auth/refresh` | publik | `refresh_token` → pasangan token baru (token lama dicabut) |
| POST `/v1/auth/logout` | publik | `refresh_token` → 204 |
| GET `/v1/auth/me` | semua | profil sendiri |
| PATCH `/v1/auth/me` | semua | `name, phone, address, current_password + new_password` |
| GET `/v1/users/{id}/public` | semua | `{id, name}` |
| GET `/v1/users` | A | `?q=&role=&is_active=&page=` |
| GET/PATCH `/v1/users/{id}` | A | PATCH `is_active`, `role` (admin tak bisa menonaktifkan dirinya) |
| POST `/v1/donations` | D, A | `request_id, pickup_time, pickup_location, instructions?`; request harus `approved` & milik donor; 409 jika sudah ada |
| GET `/v1/donations` | semua | otomatis hanya milik sendiri (admin: semua); `?status=` |
| GET `/v1/donations/{id}` | pihak terkait, A | pihak lain mendapat 404 |
| PATCH `/v1/donations/{id}` | D, A | ubah jadwal (hanya `scheduled`) |
| POST `/v1/donations/{id}/confirm` | donor/penerima terkait | selesai (`completed`) bila kedua pihak sudah konfirmasi |
| POST `/v1/donations/{id}/cancel` | pihak terkait, A | `reason` wajib (3–255) |
| GET `/v1/donations/stats` | semua | `total, by_status, total_portions_delivered` |

## Food Service — `http://localhost:5001`
| Metode & path | Akses | Keterangan |
|---|---|---|
| GET `/health` | publik | |
| GET `/uploads/foods/{file}` | publik | gambar makanan |
| GET `/api/v1/categories` | semua | |
| GET `/api/v1/foods` | semua | `?q=&category_id=&status=&sort=newest\|expires_soon&mine=true(D)&all=true(A)&page=&per_page=`. Tanpa `mine`/`all` hanya makanan tersedia & belum kedaluwarsa |
| GET `/api/v1/foods/{id}` | semua | |
| POST `/api/v1/foods` | D, A | `title, category_id, quantity_total, pickup_location, pickup_start, pickup_end, expires_at` (+ `description, unit, max_per_request, allergens, storage_info`) → 201 |
| PATCH `/api/v1/foods/{id}` | pemilik, A | parsial; `status` hanya `available`/`closed` |
| DELETE `/api/v1/foods/{id}` | pemilik, A | soft delete; 409 jika ada permintaan menunggu keputusan |
| POST `/api/v1/foods/{id}/image` | pemilik, A | `multipart/form-data` field `image` (JPG/PNG/WebP ≤ 2 MB); `image_url` berupa path relatif |
| GET `/api/v1/foods/stats` | A | |

Internal (header `X-Service-Key`, hanya untuk Request Service): `POST /internal/v1/foods/{id}/reservations` `{request_id, quantity, recipient_id}`, `POST /internal/v1/reservations/{request_id}/confirm`, `POST /internal/v1/reservations/{request_id}/release`.

## Request Service — `http://localhost:5002`
| Metode & path | Akses | Keterangan |
|---|---|---|
| GET `/health` | publik | |
| POST `/api/v1/requests` | R | header **`Idempotency-Key: <UUID>`** wajib; `{food_id, quantity, note?}` → 201 (`pending`); ulangan dengan key sama → 200 hasil yang sama |
| GET `/api/v1/requests` | semua | R: milik sendiri; D: permintaan ke makanannya; A: semua. `?status=pending,approved&food_id=&page=` |
| GET `/api/v1/requests/{id}` | pihak terkait, A | disertai `history`; pihak lain 404 |
| POST `/api/v1/requests/{id}/approve` | D pemilik, A | `pending → approved` |
| POST `/api/v1/requests/{id}/reject` | D pemilik, A | `{reason}`; `pending → rejected`; stok kembali |
| POST `/api/v1/requests/{id}/cancel` | R pemilik (pending/approved), D pemilik (approved), A | `{reason?}`; stok kembali. Yang sudah `scheduled` dibatalkan lewat donasi |
| GET `/api/v1/requests/stats` | A | |

Kode khusus: `DUPLICATE_ACTIVE_REQUEST` 409, `INSUFFICIENT_STOCK` 409, `FOOD_NOT_AVAILABLE` 409, `IDEMPOTENCY_CONFLICT` 409, `REQUEST_IN_PROGRESS` 409, `INVALID_STATE_TRANSITION` 409.

Internal (header `X-Service-Key` milik Donation Service): `GET /internal/v1/requests/{id}`, `POST /internal/v1/requests/{id}/status` `{status: scheduled|completed|cancelled, reason?}` (idempoten).

---
# Tambahan v1.1 (pengembangan website)

## Food Service (5001) — baru
| Metode & path | Akses | Keterangan |
|---|---|---|
| GET `/api/v1/public/foods` | publik | katalog tanpa login (hanya yang tersedia); filter sama dengan `/foods` |
| GET `/api/v1/public/foods/{id}` | publik | detail makanan |
| GET `/api/v1/public/categories` | publik | |
| GET `/api/v1/public/stats` | publik | `available_foods, available_portions, total_foods, reserved_portions, popular_categories[]` |
| GET `/api/v1/foods` + filter baru | login | `lat, lng, radius_km, sort=distance` (menambah `distance_km`), `expires_before`, `pickup_before` (ISO UTC), `has_coords=true` |
| POST/PATCH `/api/v1/foods` | D, A | field baru opsional `latitude`, `longitude` (diisi bersamaan, -90..90 / -180..180) |
| POST `/api/v1/categories` · PATCH/DELETE `/api/v1/categories/{id}` | A | 409 jika nama kembar / kategori dipakai makanan aktif |
Tindakan admin pada makanan orang lain dan kategori otomatis dikirim ke log audit (best effort).

## Request Service (5002) — baru
| Metode & path | Akses | Keterangan |
|---|---|---|
| GET `/api/v1/activity` | login | riwayat perubahan status; dibatasi milik sendiri (admin: semua). `?from=YYYY-MM-DD&to=&status=&page=` |
| GET `/api/v1/requests/stats/timeline?days=14` | login | permintaan baru per hari (UTC), dibatasi peran |
| GET `/api/v1/requests/stats` | A | kini memuat `completion_rate` = selesai ÷ (selesai+ditolak+dibatalkan+kedaluwarsa), dalam persen |
Request Service mengirim notifikasi (permintaan baru, disetujui, ditolak, dibatalkan, kedaluwarsa) dan audit aksi admin ke Donation Service.

## Donation Service (8003) — baru
| Metode & path | Akses | Keterangan |
|---|---|---|
| GET `/v1/public/stats` | publik | donasi selesai, porsi tersalurkan, donatur aktif, penerima terlayani, anggota |
| GET `/v1/public/campaigns` | publik | kampanye aktif/berakhir + kemajuan |
| GET `/v1/public/leaderboard?period=month\|all` | publik | hanya pengguna yang mengizinkan |
| GET/POST `/v1/favorites` · GET `/v1/favorites/ids` · DELETE `/v1/favorites/{food_id}` | login | unik per (user, makanan) |
| GET `/v1/notifications?unread=1` · GET `/v1/notifications/unread-count` · POST `/v1/notifications/{id}/read` · POST `/v1/notifications/read-all` | login | milik sendiri |
| POST `/v1/reports` · GET `/v1/reports/mine` | login | `target_type food\|user`, `target_id`, `reason spoiled\|misleading\|fraud\|inappropriate\|other`, `details?` |
| GET `/v1/reports` · PATCH `/v1/reports/{id}` | A | PATCH `status reviewing\|resolved\|dismissed` + `admin_note` (wajib saat menutup) |
| GET `/v1/audit-logs?action=&actor_id=` | A | |
| GET `/v1/campaigns` · GET `/v1/campaigns/{id}` · POST/DELETE `/v1/campaigns/{id}/join` | login | |
| POST `/v1/campaigns` · PATCH `/v1/campaigns/{id}` | A | |
| GET `/v1/me/gamification` | login | poin, peringkat, badge beserta progres, aturan |
| GET `/v1/stats/timeline?days=14` | login | donasi per hari, dibatasi peran (admin juga memuat `registrations`) |
| PATCH `/v1/auth/me` | login | field baru `notify_enabled`, `leaderboard_visible` |
| POST `/v1/internal/notifications` · POST `/v1/internal/audit` | `X-Service-Key` | dipanggil Request/Food Service |

**Aturan poin:** donatur mendapat 10 poin per donasi *selesai* + 1 poin per porsi; sekali per donasi (unique key `(user, donation, type)`). Penerima tidak mendapat poin.
**Badge** (dihitung backend): Donatur Pertama (1 donasi selesai), Berbagi 10 Porsi, Donasi Selesai 10 Kali, Kontributor Aktif (3 selesai/30 hari), Mitra Komunitas (ikut kampanye + ≥1 selesai).
**Kemajuan kampanye:** porsi dari donasi selesai milik peserta, `completed_at` di dalam periode kampanye.
