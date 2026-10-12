// Dijalankan sebelum tiap file uji: siapkan kunci JWT sementara dan environment uji.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sharebite-req-test-'));
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
fs.writeFileSync(path.join(dir, 'pub.pem'), publicKey);

process.env.DB_NAME = process.env.TEST_DB_NAME || 'sharebite_request_test';
process.env.JWT_PUBLIC_KEY_PATH = path.join(dir, 'pub.pem');
process.env.REQUEST_SERVICE_KEY = 'test-request-key';
process.env.DONATION_SERVICE_KEY = 'test-donation-key';
process.env.RECONCILE_INTERVAL_SECONDS = '0';
global.__TEST_PRIVATE_KEY__ = privateKey;
