from ..extensions import db
from .category import Category
from .food import Food
from .reservation import Reservation

DEFAULT_CATEGORIES = [
    "Makanan Berat",
    "Makanan Ringan",
    "Roti & Kue",
    "Buah & Sayur",
    "Minuman",
    "Lainnya",
]


def ensure_columns():
    """Migrasi aditif aman untuk database lama: tambah kolom yang belum ada (tanpa menghapus data)."""
    from sqlalchemy import inspect, text

    insp = inspect(db.engine)
    have = {c["name"] for c in insp.get_columns("foods")}
    for col in ("latitude", "longitude"):
        if col not in have:
            db.session.execute(text(f"ALTER TABLE foods ADD COLUMN {col} DOUBLE NULL"))
    db.session.commit()


def seed_categories():
    """Mengisi kategori awal jika tabel masih kosong (aman dipanggil berulang)."""
    existing = {c.name for c in db.session.query(Category).all()}
    for name in DEFAULT_CATEGORIES:
        if name not in existing:
            db.session.add(Category(name=name))
    db.session.commit()


__all__ = ["Category", "Food", "Reservation", "seed_categories", "ensure_columns"]
