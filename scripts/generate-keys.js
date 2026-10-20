// Membuat pasangan kunci RSA untuk JWT RS256 tanpa perlu OpenSSL.
// Jalankan dari folder root sharebite:  node scripts/generate-keys.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dir = process.env.KEYS_DIR || path.join(__dirname, '..', 'keys');
const priv = path.join(dir, 'jwt_private.pem');
const pub = path.join(dir, 'jwt_public.pem');

if (fs.existsSync(priv) && fs.existsSync(pub) && !process.argv.includes('--force')) {
  console.log('Kunci sudah ada. Gunakan --force untuk membuat ulang.');
  process.exit(0);
}
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
fs.mkdirSync(dir, { recursive: true });
// mode 0644 agar dapat dibaca user non-root pada container lain (volume hanya dipakai di jaringan Compose)
fs.writeFileSync(priv, privateKey, { mode: 0o644 });
fs.writeFileSync(pub, publicKey, { mode: 0o644 });
console.log(`Kunci dibuat di ${dir} (jwt_private.pem, jwt_public.pem).`);
