# Rancangan Database

Tiga database pada satu server MySQL XAMPP. Tiap service hanya mengakses database miliknya. Tidak ada foreign key lintas database. Collation `utf8mb4_unicode_ci`, waktu UTC.

## sharebite_food (Food Service, dibuat otomatis oleh SQLAlchemy)
**categories**: `id` PK, `name` unik, `created_at`. Seed 6 kategori otomatis: Makanan Berat, Makanan Ringan, Roti & Kue, Buah & Sayur, Minuman, Lainnya.

**foods**: `id` PK, `donor_id` (referensi user), `category_id` FK lokal, `title`, `description`, `quantity_total`, `quantity_available`, `unit`, `max_per_request`, `image_url` (path relatif `/uploads/foods/...`), `pickup_location`, `pickup_start`, `pickup_end`, `expires_at`, `allergens`, `storage_info`, `status` (available/out_of_stock/expired/closed), `is_deleted` (soft delete), `created_at`, `updated_at`.

**reservations**: `id` PK, `request_id` UNIK (UUID dari Request Service), `food_id` FK lokal, `quantity`, `status` (held/confirmed/released), snapshot `donor_id` & `food_title`, `expires_at`, timestamp.

## sharebite_request (Request Service, dibuat `npm run migrate` / otomatis saat start)
**requests**: `id` CHAR(36) PK, `food_id`, `food_title`, `donor_id` (snapshot; NULL selama `reserving`), `recipient_id`, `quantity`, `note`, `status` (reserving, pending, approved, rejected, scheduled, completed, cancelled, expired, failed), `rejection_reason`, `idempotency_key` UNIK, `active_slot` (1/NULL), `stock_released`, `expires_at`, timestamp.
Indeks unik: `uq_idempotency(idempotency_key)`, `uq_active_request(recipient_id, food_id, active_slot)`.

**request_history**: `id`, `request_id`, `from_status`, `to_status`, `actor_id`, `actor_role` (recipient/donor/admin/system), `reason`, `at`.

## sharebite_donation (Donation Service, dibuat Laravel migration)
**users**: `id`, `name`, `email` UNIK, `password_hash` (bcrypt), `role` (donor/recipient/admin), `phone`, `address`, `is_active`, timestamp.
**refresh_tokens**: `id`, `user_id`, `token_hash` UNIK (SHA-256), `expires_at`, `revoked_at`, `replaced_by`, `created_at`.
**donations**: `id` CHAR(36) PK, `request_id` UNIK, `food_id`, `donor_id`, `recipient_id`, `quantity`, `pickup_time`, `pickup_location`, `instructions`, `status` (scheduled/completed/cancelled), `donor_confirmed_at`, `recipient_confirmed_at`, `cancel_reason`, `sync_pending`, timestamp.

## Database uji
`sharebite_food_test`, `sharebite_request_test`, `sharebite_donation_test` (dibuat oleh `setup-database.sql`). Pengujian otomatis menghapus/menulis ulang isinya; jangan dipakai untuk data asli.
