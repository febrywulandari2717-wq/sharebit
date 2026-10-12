from ..extensions import db
from ..utils.time import iso, utcnow


class Food(db.Model):
    __tablename__ = "foods"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    donor_id = db.Column(db.BigInteger, nullable=False, index=True)
    category_id = db.Column(db.BigInteger, db.ForeignKey("categories.id"), nullable=False, index=True)

    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    quantity_total = db.Column(db.Integer, nullable=False)
    quantity_available = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(30), nullable=False, default="porsi")
    max_per_request = db.Column(db.Integer, nullable=True)

    image_url = db.Column(db.String(500), nullable=True)
    pickup_location = db.Column(db.String(255), nullable=False)
    pickup_start = db.Column(db.DateTime, nullable=False)
    pickup_end = db.Column(db.DateTime, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

    allergens = db.Column(db.String(255), nullable=True)
    storage_info = db.Column(db.String(255), nullable=True)
    status = db.Column(
        db.Enum("available", "out_of_stock", "expired", "closed", name="food_status"),
        nullable=False,
        default="available",
    )
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    category = db.relationship("Category", lazy="joined")

    def refresh_status(self):
        """Sinkronkan status dengan stok dan waktu kedaluwarsa. 'closed' tidak diubah."""
        if self.is_deleted or self.status == "closed":
            return
        if self.expires_at <= utcnow():
            self.status = "expired"
        elif self.quantity_available <= 0:
            self.status = "out_of_stock"
        else:
            self.status = "available"

    def to_dict(self):
        return {
            "id": self.id,
            "donor_id": self.donor_id,
            "category": self.category.to_dict() if self.category else None,
            "title": self.title,
            "description": self.description,
            "quantity_total": self.quantity_total,
            "quantity_available": self.quantity_available,
            "unit": self.unit,
            "max_per_request": self.max_per_request,
            "image_url": self.image_url,
            "pickup_location": self.pickup_location,
            "pickup_start": iso(self.pickup_start),
            "pickup_end": iso(self.pickup_end),
            "expires_at": iso(self.expires_at),
            "allergens": self.allergens,
            "storage_info": self.storage_info,
            "status": self.status,
            "created_at": iso(self.created_at),
        }
