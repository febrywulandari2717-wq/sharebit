const crypto = require('crypto');
const config = require('../config');
const { unauthenticated } = require('../utils/errors');

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function requireServiceKey(name = 'donation') {
  return (req, res, next) => {
    const given = req.headers['x-service-key'];
    if (!given || !safeEqual(given, config.serviceKeys[name])) {
      return next(unauthenticated('X-Service-Key tidak valid.'));
    }
    return next();
  };
}

module.exports = { requireServiceKey };
