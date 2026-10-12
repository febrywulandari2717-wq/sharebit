# Food Service (Python + Flask) — port 5001
Mengelola makanan, kategori, foto, stok, dan reservasi stok.

```bash
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py            # database & tabel & 6 kategori dibuat otomatis
pytest -v                # butuh database sharebite_food_test (lihat setup-database.sql)
```
Health: `GET /health`. Kontrak: `docs/api-contracts.md`. Kunci publik JWT dibaca dari `JWT_PUBLIC_KEY_PATH` (relatif terhadap folder ini).
