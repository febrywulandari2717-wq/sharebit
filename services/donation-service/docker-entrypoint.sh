```sh
#!/bin/sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ -z "${APP_KEY:-}" ]; then
  php artisan key:generate --force
  unset APP_KEY
fi

php artisan config:clear
php artisan migrate --force

exec php -S 0.0.0.0:8003 -t public vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
```