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


def seed_categories():
    """Mengisi kategori awal jika tabel masih kosong (aman dipanggil berulang)."""
    existing = {c.name for c in db.session.query(Category).all()}
    for name in DEFAULT_CATEGORIES:
        if name not in existing:
            db.session.add(Category(name=name))
    db.session.commit()


__all__ = ["Category", "Food", "Reservation", "seed_categories"]
