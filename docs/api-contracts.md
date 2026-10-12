# Kontrak API ShareBite v1

Semua respons JSON.
- Sukses: `{ "data": ... }`, daftar ditambah `"meta": { page, per_page, total, total_pages }`.
- Error: `{ "error": { "code": "...", "message": "...", "details": { "field": ["pesan"] } } }` (`details` opsional).
- Autentikasi: header `Authorization: Bearer <access_token>`. Waktu ISO 8601 UTC (`2026-10-12T10:00:00Z`).
- Pagination: `?page=1&per_page=12` (maks 50).

Kode error umum: `VALIDATION_ERROR` 422, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429, `UPSTREAM_UNAVAILABLE` 503, `UPSTREAM_TIMEOUT` 504, `INTERNAL_ERROR` 500.

Peran: **D** donor, **R** recipient (penerima), **A** admin.

## Donation + Identity Service — `http://localhost:5003/api`
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
