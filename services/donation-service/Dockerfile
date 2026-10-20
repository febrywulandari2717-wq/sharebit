# ---- tahap 1: dependensi PHP (tanpa dev) ----
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --optimize --no-dev --no-scripts --ignore-platform-reqs

# ---- tahap 2: runtime ----
FROM php:8.3-cli
RUN docker-php-ext-install pdo_mysql
WORKDIR /var/www/html
COPY --from=vendor /app /var/www/html
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache
ENV PHP_CLI_SERVER_WORKERS=4 APP_ENV=production LOG_CHANNEL=stderr
USER www-data
EXPOSE 8003
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD php -r "exit(@file_get_contents('http://127.0.0.1:8003/api/health') ? 0 : 1);"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--no-reload", "--host=0.0.0.0", "--port=8003"]
