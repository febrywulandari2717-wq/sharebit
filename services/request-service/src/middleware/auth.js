const fs = require('fs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError, unauthenticated, forbidden } = require('../utils/errors');

let publicKey = null;
function loadPublicKey() {
  if (!publicKey) {
    try {
      publicKey = fs.readFileSync(config.jwt.publicKeyPath, 'utf8');
    } catch (_) {
      throw new AppError(
        'INTERNAL_ERROR',
        'Kunci publik JWT tidak ditemukan. Jalankan: node scripts/generate-keys.js',
        500
      );
    }
  }
  return publicKey;
}

function requireAuth(...roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return next(unauthenticated('Header Authorization tidak ada.'));
    let payload;
    try {
      payload = jwt.verify(header.slice(7).trim(), loadPublicKey(), {
        algorithms: ['RS256'],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });
    } catch (err) {
      if (err instanceof AppError) return next(err);
      return next(unauthenticated(err.name === 'TokenExpiredError' ? 'Token kedaluwarsa.' : 'Token tidak valid.'));
    }
    const id = parseInt(payload.sub, 10);
    if (!Number.isInteger(id)) return next(unauthenticated('Token tidak valid.'));
    req.user = { id, role: payload.role };
    if (roles.length && !roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}

module.exports = { requireAuth };
