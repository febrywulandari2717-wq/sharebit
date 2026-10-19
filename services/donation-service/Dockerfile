FROM php:8.3-cli
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libzip-dev libonig-dev && docker-php-ext-install pdo_mysql mbstring bcmath zip && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY . .
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader \
 && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache
COPY docker-entrypoint.sh /usr/local/bin/sharebite-entrypoint
RUN chmod +x /usr/local/bin/sharebite-entrypoint
EXPOSE 8003
ENTRYPOINT ["sharebite-entrypoint"]
