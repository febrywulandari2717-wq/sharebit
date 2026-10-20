FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
RUN useradd --system --uid 10001 app && mkdir -p /app/uploads/foods && chown -R app:app /app/uploads
USER app
EXPOSE 5001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5001/health', timeout=3).status == 200 else 1)"
# --preload: aplikasi dibuat sekali (create_all tidak balapan antar worker)
CMD ["gunicorn", "--preload", "-w", "2", "-b", "0.0.0.0:5001", "--access-logfile", "-", "run:app"]
