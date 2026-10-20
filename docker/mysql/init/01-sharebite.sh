#!/bin/sh
# Dijalankan otomatis oleh image MariaDB saat volume data masih kosong.
# Membuat 3 database terpisah + 1 user per service yang HANYA berhak atas database miliknya.
set -e
: "${FOOD_DB_PASSWORD:?}" "${REQUEST_DB_PASSWORD:?}" "${DONATION_DB_PASSWORD:?}"

# escape ' dan \ agar password aman di dalam literal SQL
q() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/''/g"; }
F=$(q "$FOOD_DB_PASSWORD"); R=$(q "$REQUEST_DB_PASSWORD"); D=$(q "$DONATION_DB_PASSWORD")

run_sql() { if [ -n "${MARIADB_ROOT_PASSWORD:-}" ]; then mariadb -uroot "-p${MARIADB_ROOT_PASSWORD}"; else mariadb -uroot; fi; }

run_sql <<SQL
CREATE DATABASE IF NOT EXISTS sharebite_food     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS sharebite_request  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS sharebite_donation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sharebite_food'@'%'     IDENTIFIED BY '${F}';
CREATE USER IF NOT EXISTS 'sharebite_request'@'%'  IDENTIFIED BY '${R}';
CREATE USER IF NOT EXISTS 'sharebite_donation'@'%' IDENTIFIED BY '${D}';
GRANT ALL PRIVILEGES ON sharebite_food.*     TO 'sharebite_food'@'%';
GRANT ALL PRIVILEGES ON sharebite_request.*  TO 'sharebite_request'@'%';
GRANT ALL PRIVILEGES ON sharebite_donation.* TO 'sharebite_donation'@'%';
FLUSH PRIVILEGES;
SQL
echo "[sharebite] database & user dibuat."
