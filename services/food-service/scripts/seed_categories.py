"""Opsional: kategori sudah otomatis dibuat saat service start.
Jalankan: python -m scripts.seed_categories"""
from app import create_app
from app.models import seed_categories

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_categories()
        print("Seed kategori selesai.")
