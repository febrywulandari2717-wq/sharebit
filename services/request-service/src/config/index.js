const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const resolvePath = (p) => (path.isAbsolute(p) ? p : path.resolve(ROOT, p));

module.exports = {
  root: ROOT,
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '5002', 10),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sharebite_request',
  },
  jwt: {
    publicKeyPath: resolvePath(process.env.JWT_PUBLIC_KEY_PATH || '../../keys/jwt_public.pem'),
    issuer: process.env.JWT_ISSUER || 'sharebite-identity',
    audience: process.env.JWT_AUDIENCE || 'sharebite-api',
  },
  serviceKeys: {
    request: process.env.REQUEST_SERVICE_KEY || 'request-secret-key-2026',
    donation: process.env.DONATION_SERVICE_KEY || 'donation-secret-key-2026',
  },
  donationServiceUrl: (process.env.DONATION_SERVICE_URL || 'http://127.0.0.1:8003').replace(/\/$/, ''),
  foodServiceUrl: (process.env.FOOD_SERVICE_URL || 'http://127.0.0.1:5001').replace(/\/$/, ''),
  httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '5000', 10),
  reconcileIntervalSeconds: parseInt(process.env.RECONCILE_INTERVAL_SECONDS || '60', 10),
  holdHours: 24,
};
