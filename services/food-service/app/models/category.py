from ..extensions import db
from ..utils.time import utcnow


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True, autoincrement=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}
