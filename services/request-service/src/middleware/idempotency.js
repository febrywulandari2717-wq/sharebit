const { AppError } = require('../utils/errors');
const { isUuid } = require('../utils/uuid');

function requireIdempotencyKey(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!isUuid(key)) {
    return next(new AppError('BAD_REQUEST', 'Header Idempotency-Key wajib berisi UUID.', 400));
  }
  req.idempotencyKey = key.toLowerCase();
  return next();
}

module.exports = { requireIdempotencyKey };
