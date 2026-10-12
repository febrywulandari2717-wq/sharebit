from ..extensions import db
from ..utils.time import utcnow


class Reservation(db.Model):
    __tablename__ = "reservations"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    request_id = db.Column(db.String(36), unique=True, nullable=False)
    food_id = db.Column(db.BigInteger, db.ForeignKey("foods.id"), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(
        db.Enum("held", "confirmed", "released", name="reservation_status"),
        nullable=False,
        default="held",
    )
    donor_id = db.Column(db.BigInteger, nullable=False)
    food_title = db.Column(db.String(120), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    def to_dict(self):
        return {
            "request_id": self.request_id,
            "food_id": self.food_id,
            "quantity": self.quantity,
            "status": self.status,
            "donor_id": self.donor_id,
            "food_title": self.food_title,
        }
