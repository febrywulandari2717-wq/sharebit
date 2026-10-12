class AppError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toJSON() {
    const body = { error: { code: this.code, message: this.message } };
    if (this.details) body.error.details = this.details;
    return body;
  }
}

const unauthenticated = (msg = 'Autentikasi gagal.') => new AppError('UNAUTHENTICATED', msg, 401);
const forbidden = (msg = 'Anda tidak punya akses.') => new AppError('FORBIDDEN', msg, 403);
const notFound = (msg = 'Data tidak ditemukan.') => new AppError('NOT_FOUND', msg, 404);
const validation = (details, msg = 'Data tidak valid.') => new AppError('VALIDATION_ERROR', msg, 422, details);

module.exports = { AppError, unauthenticated, forbidden, notFound, validation };
