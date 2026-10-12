import os
import uuid

from .errors import AppError

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}


def save_food_image(file_storage, food_id, upload_dir):
    """Menyimpan gambar dan mengembalikan path publik relatif (/uploads/foods/...)."""
    if not file_storage or not file_storage.filename:
        raise AppError("VALIDATION_ERROR", "File gambar wajib diunggah.", 422)
    name = file_storage.filename
    ext = name.rsplit(".", 1)[1].lower() if "." in name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise AppError("VALIDATION_ERROR", "Format file harus JPG, PNG, atau WebP.", 422)
    if file_storage.mimetype not in ALLOWED_MIME:
        raise AppError("VALIDATION_ERROR", "Tipe file tidak didukung.", 422)

    filename = f"{food_id}-{uuid.uuid4().hex}.{ext}"
    foods_dir = os.path.join(upload_dir, "foods")
    os.makedirs(foods_dir, exist_ok=True)
    file_storage.save(os.path.join(foods_dir, filename))
    return f"/uploads/foods/{filename}"
