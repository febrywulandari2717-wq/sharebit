// Uji asap halaman website: memuat setiap halaman di DOM virtual (jsdom) terhadap backend yang berjalan,
// lalu memastikan tidak ada error JavaScript dan konten tampil. Jalankan:  node tests/e2e/smoke-web.js
// Butuh:  npm install jsdom@24  (di folder mana pun; atur NODE_PATH bila perlu)
const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const WEB = path.join(__dirname, '..', '..', 'frontend', 'web');
const DON = process.env.DONATION_URL || 'http://127.0.0.1:8003';
const base = { FOOD: process.env.FOOD_URL || 'http://127.0.0.1:5001', REQUEST: process.env.REQUEST_URL || 'http://127.0.0.1:5002', DONATION: DON };

async function login(email, password) {
  const r = await (await fetch(`${DON}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json();
  if (!r.data) throw new Error(`login ${email} gagal: ${JSON.stringify(r)}`);
  return r.data;
}
class Loader extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.hostname === 'smoke.local') return Promise.resolve(fs.readFileSync(path.join(WEB, u.pathname)));
    return Promise.resolve(Buffer.from('')); // font/CDN eksternal diabaikan
  }
}

const PUBLIC = ['index', 'explore', 'how-it-works', 'about', 'faq', 'terms', 'campaigns', 'impact', 'leaderboard', 'help', 'login', 'register'];
const BY_ROLE = {
  recipient: ['dashboard', 'favorites', 'notifications', 'history', 'profile', 'donations', 'my-requests', 'explore', 'help'],
  donor: ['dashboard', 'favorites', 'notifications', 'history', 'profile', 'donations', 'donor-foods', 'donor-form', 'donor-requests', 'leaderboard'],
  admin: ['dashboard', 'notifications', 'profile', 'admin-users', 'admin-foods', 'admin-requests', 'admin-reports', 'admin-categories', 'admin-campaigns', 'admin-audit'],
};

async function open(page, session, query = '') {
  const errors = []; const nav = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (/Not implemented: navigation/.test(e.message)) nav.push(e.message); else errors.push(e.message); });
  vc.on('error', (...a) => errors.push(a.join(' ')));
  const html = fs.readFileSync(path.join(WEB, `${page}.html`), 'utf8');
  const dom = new JSDOM(html, { url: `http://smoke.local/${page}.html${query}`, runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = (u, o) => fetch(u, o); w.FormData = FormData; w.Blob = Blob; w.URL.createObjectURL = () => 'blob:x';
      w.scrollTo = () => {}; w.crypto.randomUUID = () => require('crypto').randomUUID();
      if (session) { w.localStorage.setItem('sb_access', session.access_token); w.localStorage.setItem('sb_refresh', session.refresh_token); w.localStorage.setItem('sb_user', JSON.stringify(session.user)); }
      w.addEventListener('error', (e) => errors.push(`${e.message} @${e.filename}:${e.lineno}`));
      w.addEventListener('unhandledrejection', (e) => errors.push(`unhandledrejection: ${e.reason && e.reason.message}`));
    } });
  dom.window.SHAREBITE_OVERRIDE = base;
  await new Promise((r) => setTimeout(r, 1800));
  return { dom, errors, nav };
}

(async () => {
  const sessions = { recipient: await login('penerima@sharebite.local', 'Rahasia123'), donor: await login('donor@sharebite.local', 'Rahasia123'), admin: await login('admin@sharebite.local', 'Admin12345') };
  let pass = 0; const fails = [];
  const run = async (label, page, session, query) => {
    const { dom, errors, nav } = await open(page, session, query);
    const doc = dom.window.document; const main = doc.querySelector('#view-wrap') || doc.body; const text = main.textContent.replace(/\s+/g, ' ').trim();
    const problems = [...errors];
    if (/Terjadi kesalahan|Tidak dapat terhubung/.test(text)) problems.push('menampilkan error state');
    if (doc.querySelector('[aria-busy=true]')) problems.push('skeleton masih tampil (data tidak termuat)');
    if (text.length < 40 && !nav.length) problems.push('konten kosong');
    if (problems.length) { fails.push(`${label}: ${problems.join(' | ')}`); console.log(`  ✗ ${label}  -> ${problems.join(' | ')}`); } else { pass += 1; console.log(`  ✓ ${label}`); }
    dom.window.close();
  };
  console.log('Halaman publik (tanpa login)');
  for (const p of PUBLIC) await run(`publik/${p}`, p, null);
  for (const [role, pages] of Object.entries(BY_ROLE)) { console.log(`Peran ${role}`); for (const p of pages) await run(`${role}/${p}`, p, sessions[role]); }
  console.log('Guard akses');
  for (const [label, page, sess] of [['tanpa login → dashboard', 'dashboard', null], ['penerima → admin-users', 'admin-users', sessions.recipient], ['donor → my-requests', 'my-requests', sessions.donor]]) {
    const { dom, nav } = await open(page, sess); const redirected = nav.length > 0 || !dom.window.document.querySelector('#view-wrap');
    if (redirected) { pass += 1; console.log(`  ✓ ${label} dialihkan`); } else { fails.push(label); console.log(`  ✗ ${label} TIDAK dialihkan`); } dom.window.close();
  }
  console.log(`\n==== Hasil uji halaman: ${pass} lulus, ${fails.length} gagal ====`);
  if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
