# Website statis + gateway reverse-proxy. Build context = root proyek (lihat docker-compose.yml).
FROM nginx:1.27-alpine
RUN rm -f /etc/nginx/conf.d/default.conf && mkdir -p /etc/nginx/snippets
COPY docker/web/nginx.conf /etc/nginx/conf.d/sharebite.conf
COPY docker/web/proxy.conf /etc/nginx/snippets/proxy.conf
COPY frontend/web/ /usr/share/nginx/html/
COPY docker/web/config.js /usr/share/nginx/html/js/config.js
RUN rm -f /usr/share/nginx/html/README.md
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/health || exit 1
