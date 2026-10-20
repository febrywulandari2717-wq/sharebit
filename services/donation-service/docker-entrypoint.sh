#!/bin/sh
# Menunggu database siap, (opsional) migrasi + seed, lalu menjalankan perintah utama.
set -e
cd /var/www/html

if [ -z "$APP_KEY" ]; then
  echo "[donation] APP_KEY kosong: membuat kunci sementara (isi APP_KEY di .env agar tetap)."
  APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
  export APP_KEY
fi

i=0
until php -r '$d = new PDO("mysql:host=".getenv("DB_HOST").";port=".getenv("DB_PORT").";dbname=".getenv("DB_DATABASE"), getenv("DB_USERNAME"), getenv("DB_PASSWORD"));' >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then echo "[donation] database tidak siap setelah 120 detik"; exit 1; fi
  echo "[donation] menunggu database... ($i)"
  sleep 2
done

if [ "$RUN_MIGRATIONS" = "true" ]; then
  php artisan migrate --force
  php artisan db:seed --force
  if [ "$SEED_DEMO" = "true" ]; then php artisan db:seed --class=DemoUsersSeeder --force; fi
fi

exec "$@"
