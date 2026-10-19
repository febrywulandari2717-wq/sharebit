// Menambahkan variabel BARU dari .env.example ke .env tanpa menimpa nilai yang sudah ada.
// Jalankan dari folder root:  node scripts/sync-env.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'services');
const parse = (t) => Object.fromEntries(t.split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

const reqEnv = parse(read(path.join(root, 'request-service', '.env')) || '');
let added = 0;
for (const svc of ['food-service', 'request-service', 'donation-service']) {
  const example = read(path.join(root, svc, '.env.example'));
  const envPath = path.join(root, svc, '.env');
  let env = read(envPath);
  if (example === null) continue;
  if (env === null) { fs.writeFileSync(envPath, example); console.log(`${svc}: .env dibuat dari .env.example`); continue; }
  const have = parse(env); const want = parse(example); const lines = [];
  for (const [k, v] of Object.entries(want)) {
    if (k in have) continue;
    // kunci antar-service harus konsisten: salin dari request-service bila ada
    const val = k === 'DONATION_SERVICE_KEY' && reqEnv.DONATION_SERVICE_KEY ? reqEnv.DONATION_SERVICE_KEY : v;
    lines.push(`${k}=${val}`); added += 1;
  }
  if (lines.length) { fs.appendFileSync(envPath, `${env.endsWith('\n') ? '' : '\n'}# ditambahkan otomatis oleh scripts/sync-env.js\n${lines.join('\n')}\n`); console.log(`${svc}: menambahkan ${lines.map((l) => l.split('=')[0]).join(', ')}`); }
}
console.log(added ? `Selesai (${added} variabel baru).` : 'Semua .env sudah lengkap.');
