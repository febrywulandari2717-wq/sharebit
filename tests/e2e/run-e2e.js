// Pengujian end-to-end ShareBite. Jalankan SETELAH ketiga service hidup:
//   node tests/e2e/run-e2e.js
// Butuh Node.js 18+. Membuat data uji baru (email unik) setiap dijalankan.
const FOOD = process.env.FOOD_URL || 'http://127.0.0.1:5001';
const REQ = process.env.REQUEST_URL || 'http://127.0.0.1:5002';
const DON = process.env.DONATION_URL || 'http://127.0.0.1:5003';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sharebite.local';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin12345';

let passed = 0;
const failures = [];

async function call(method, url, { token, body, key, form } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (key) headers['Idempotency-Key'] = key;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(url, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch (_) { /* tanpa body */ }
  return { status: res.status, body: data, data: data && data.data };
}

function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failures.push(name); console.log(`  ✗ ${name}${detail ? '  -> ' + JSON.stringify(detail) : ''}`); }
}
const section = (t) => console.log(`\n${t}`);
const uuid = () => crypto.randomUUID();
const hoursFromNow = (h) => new Date(Date.now() + h * 3600e3).toISOString().replace(/\.\d+Z$/, 'Z');

async function register(role, label) {
  const email = `${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@e2e.test`;
  const password = 'Rahasia123';
  const reg = await call('POST', `${DON}/api/v1/auth/register`, {
    body: { name: `E2E ${label}`, email, password, password_confirmation: password, role, phone: '081234567890' },
  });
  const login = await call('POST', `${DON}/api/v1/auth/login`, { body: { email, password } });
  return { email, password, reg, login, token: login.data && login.data.access_token, id: login.data && login.data.user.id,
    refresh: login.data && login.data.refresh_token };
}

const foodBody = (over = {}) => ({
  title: 'Nasi Kotak Ayam E2E', description: 'Sisa acara', category_id: 1, quantity_total: 10, max_per_request: 3,
  pickup_location: 'Jl. Veteran No. 5, Gresik', pickup_start: hoursFromNow(2), pickup_end: hoursFromNow(4),
  expires_at: hoursFromNow(6), ...over,
});
const stockOf = async (token, id) => (await call('GET', `${FOOD}/api/v1/foods/${id}`, { token })).data.quantity_available;

(async () => {
  section('1. Health check');
  for (const [n, u] of [['food', `${FOOD}/health`], ['request', `${REQ}/health`], ['donation', `${DON}/api/health`]]) {
    const r = await call('GET', u);
    check(`${n} service sehat`, r.status === 200 && r.data.database === 'up', r.body);
  }

  section('2. Registrasi & login');
  const donor = await register('donor', 'donor');
  const rec = await register('recipient', 'penerima');
  const rec2 = await register('recipient', 'penerima2');
  check('registrasi donor 201', donor.reg.status === 201, donor.reg.body);
  check('login mengembalikan access_token', !!donor.token && !!rec.token && !!rec2.token);
  const dup = await call('POST', `${DON}/api/v1/auth/register`, {
    body: { name: 'Dup', email: donor.email, password: 'Rahasia123', password_confirmation: 'Rahasia123', role: 'donor' },
  });
  check('email ganda ditolak 422', dup.status === 422, dup.body);
  const bad = await call('POST', `${DON}/api/v1/auth/login`, { body: { email: donor.email, password: 'SalahBanget1' } });
  check('password salah ditolak 401', bad.status === 401, bad.body);
  const me = await call('GET', `${DON}/api/v1/auth/me`, { token: rec.token });
  check('/auth/me mengembalikan pengguna', me.status === 200 && me.data.role === 'recipient');
  const ref = await call('POST', `${DON}/api/v1/auth/refresh`, { body: { refresh_token: rec.refresh } });
  check('refresh token menerbitkan token baru', ref.status === 200 && !!ref.data.access_token, ref.body);
  const ref2 = await call('POST', `${DON}/api/v1/auth/refresh`, { body: { refresh_token: rec.refresh } });
  check('refresh token lama tidak bisa dipakai lagi', ref2.status === 401, ref2.body);
  const admin = await call('POST', `${DON}/api/v1/auth/login`, { body: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
  const adminToken = admin.data && admin.data.access_token;
  check('login admin berhasil', admin.status === 200 && admin.data.user.role === 'admin', admin.body);

  section('3. Keamanan & otorisasi dasar');
  check('tanpa token -> 401 (food)', (await call('GET', `${FOOD}/api/v1/foods`)).status === 401);
  check('tanpa token -> 401 (request)', (await call('GET', `${REQ}/api/v1/requests`)).status === 401);
  check('recipient tidak boleh membuat makanan -> 403',
    (await call('POST', `${FOOD}/api/v1/foods`, { token: rec.token, body: foodBody() })).status === 403);
  check('endpoint internal tanpa service key -> 401',
    (await call('POST', `${FOOD}/internal/v1/foods/1/reservations`, { body: { request_id: uuid(), quantity: 1 } })).status === 401);
  check('non-admin tidak boleh melihat daftar user',
    (await call('GET', `${DON}/api/v1/users`, { token: donor.token })).status === 403);

  section('4. Katalog makanan');
  const cats = await call('GET', `${FOOD}/api/v1/categories`, { token: rec.token });
  check('6 kategori tersedia', cats.status === 200 && cats.data.length >= 6, cats.body);
  const created = await call('POST', `${FOOD}/api/v1/foods`, { token: donor.token, body: foodBody() });
  check('donor membuat makanan 201', created.status === 201, created.body);
  const food = created.data;
  const bad2 = await call('POST', `${FOOD}/api/v1/foods`, { token: donor.token, body: foodBody({ title: 'a', quantity_total: 0 }) });
  check('validasi makanan -> 422', bad2.status === 422, bad2.body);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('image', new Blob([png], { type: 'image/png' }), 'foto.png');
  const up = await call('POST', `${FOOD}/api/v1/foods/${food.id}/image`, { token: donor.token, form });
  check('unggah foto berhasil', up.status === 200 && String(up.data.image_url).startsWith('/uploads/foods/'), up.body);
  const img = await fetch(`${FOOD}${up.data.image_url}`);
  check('foto dapat diakses', img.status === 200);
  const found = await call('GET', `${FOOD}/api/v1/foods?q=E2E&per_page=5`, { token: rec.token });
  check('pencarian menemukan makanan', found.status === 200 && found.data.some((f) => f.id === food.id), found.body);
  const donorProfile = await call('GET', `${DON}/api/v1/users/${donor.id}/public`, { token: rec.token });
  check('profil publik donor tersedia', donorProfile.status === 200 && !!donorProfile.data.name, donorProfile.body);

  section('5. Alur utama: permintaan -> persetujuan -> penjadwalan -> serah terima');
  const key = uuid();
  const r1 = await call('POST', `${REQ}/api/v1/requests`, { token: rec.token, key, body: { food_id: food.id, quantity: 2, note: 'Untuk dua anak' } });
  check('penerima mengajukan permintaan 201 (pending)', r1.status === 201 && r1.data.status === 'pending', r1.body);
  check('stok berkurang menjadi 8', (await stockOf(rec.token, food.id)) === 8);
  const replay = await call('POST', `${REQ}/api/v1/requests`, { token: rec.token, key, body: { food_id: food.id, quantity: 2, note: 'Untuk dua anak' } });
  check('Idempotency-Key sama -> hasil sama tanpa mengurangi stok',
    replay.status === 200 && replay.data.id === r1.data.id && (await stockOf(rec.token, food.id)) === 8, replay.body);
  const dupReq = await call('POST', `${REQ}/api/v1/requests`, { token: rec.token, key: uuid(), body: { food_id: food.id, quantity: 1 } });
  check('permintaan aktif ganda -> 409', dupReq.status === 409 && dupReq.body.error.code === 'DUPLICATE_ACTIVE_REQUEST', dupReq.body);
  const over = await call('POST', `${REQ}/api/v1/requests`, { token: rec2.token, key: uuid(), body: { food_id: food.id, quantity: 99 } });
  check('melebihi batas per permintaan -> 4xx dan stok tetap', over.status >= 400 && over.status < 500 && (await stockOf(rec.token, food.id)) === 8, over.body);
  check('donor melihat permintaan masuk',
    (await call('GET', `${REQ}/api/v1/requests?status=pending`, { token: donor.token })).data.some((r) => r.id === r1.data.id));
  check('penerima lain tidak bisa melihat detail (404)',
    (await call('GET', `${REQ}/api/v1/requests/${r1.data.id}`, { token: rec2.token })).status === 404);
  check('penerima tidak bisa menyetujui sendiri -> 403',
    (await call('POST', `${REQ}/api/v1/requests/${r1.data.id}/approve`, { token: rec.token })).status === 403);
  const ap = await call('POST', `${REQ}/api/v1/requests/${r1.data.id}/approve`, { token: donor.token });
  check('donor menyetujui -> approved', ap.status === 200 && ap.data.status === 'approved', ap.body);
  const pickup = hoursFromNow(24);
  const sched = await call('POST', `${DON}/api/v1/donations`, {
    token: donor.token, body: { request_id: r1.data.id, pickup_time: pickup, pickup_location: 'Jl. Veteran No. 5, Gresik', instructions: 'Hubungi saya' },
  });
  check('donor menjadwalkan donasi 201', sched.status === 201 && sched.data.status === 'scheduled', sched.body);
  const afterSched = await call('GET', `${REQ}/api/v1/requests/${r1.data.id}`, { token: rec.token });
  check('status permintaan otomatis menjadi scheduled', afterSched.data.status === 'scheduled', afterSched.body);
  check('donasi ganda untuk permintaan sama -> 409',
    (await call('POST', `${DON}/api/v1/donations`, { token: donor.token, body: { request_id: r1.data.id, pickup_time: pickup, pickup_location: 'Jl. Veteran No. 5' } })).status === 409);
  const c1 = await call('POST', `${DON}/api/v1/donations/${sched.data.id}/confirm`, { token: donor.token });
  check('konfirmasi donor: masih scheduled', c1.status === 200 && c1.data.status === 'scheduled', c1.body);
  const c2 = await call('POST', `${DON}/api/v1/donations/${sched.data.id}/confirm`, { token: rec.token });
  check('konfirmasi penerima: completed', c2.status === 200 && c2.data.status === 'completed', c2.body);
  const done = await call('GET', `${REQ}/api/v1/requests/${r1.data.id}`, { token: donor.token });
  check('status permintaan menjadi completed', done.data.status === 'completed', done.body);
  check('riwayat status lengkap', JSON.stringify(done.data.history.map((h) => h.to_status)) === JSON.stringify(['pending', 'approved', 'scheduled', 'completed']), done.data.history);
  check('stok tetap 8 setelah selesai', (await stockOf(rec.token, food.id)) === 8);

  section('6. Penolakan & pembatalan mengembalikan stok');
  const r2 = await call('POST', `${REQ}/api/v1/requests`, { token: rec2.token, key: uuid(), body: { food_id: food.id, quantity: 3 } });
  check('penerima 2 mengajukan 3 porsi', r2.status === 201 && (await stockOf(rec.token, food.id)) === 5, r2.body);
  const noReason = await call('POST', `${REQ}/api/v1/requests/${r2.data.id}/reject`, { token: donor.token, body: {} });
  check('penolakan tanpa alasan -> 422', noReason.status === 422);
  const rj = await call('POST', `${REQ}/api/v1/requests/${r2.data.id}/reject`, { token: donor.token, body: { reason: 'Maaf sudah ada yang mengambil' } });
  check('donor menolak -> rejected + stok kembali 8', rj.status === 200 && rj.data.status === 'rejected' && (await stockOf(rec.token, food.id)) === 8, rj.body);

  const r3 = await call('POST', `${REQ}/api/v1/requests`, { token: rec2.token, key: uuid(), body: { food_id: food.id, quantity: 2 } });
  const cancel = await call('POST', `${REQ}/api/v1/requests/${r3.data.id}/cancel`, { token: rec2.token, body: { reason: 'Berubah pikiran' } });
  check('penerima membatalkan -> cancelled + stok kembali', cancel.status === 200 && cancel.data.status === 'cancelled' && (await stockOf(rec.token, food.id)) === 8, cancel.body);
  const again = await call('POST', `${REQ}/api/v1/requests/${r3.data.id}/cancel`, { token: rec2.token, body: {} });
  check('batal dua kali -> 409', again.status === 409, again.body);

  section('7. Pembatalan donasi yang sudah dijadwalkan');
  const r4 = await call('POST', `${REQ}/api/v1/requests`, { token: rec2.token, key: uuid(), body: { food_id: food.id, quantity: 2 } });
  await call('POST', `${REQ}/api/v1/requests/${r4.data.id}/approve`, { token: donor.token });
  const d4 = await call('POST', `${DON}/api/v1/donations`, { token: donor.token, body: { request_id: r4.data.id, pickup_time: pickup, pickup_location: 'Jl. Veteran No. 5, Gresik' } });
  check('donasi kedua dijadwalkan', d4.status === 201, d4.body);
  const noReasonCancel = await call('POST', `${DON}/api/v1/donations/${d4.data.id}/cancel`, { token: rec2.token, body: {} });
  check('batal donasi tanpa alasan -> 422', noReasonCancel.status === 422);
  const dc = await call('POST', `${DON}/api/v1/donations/${d4.data.id}/cancel`, { token: rec2.token, body: { reason: 'Tidak jadi mengambil' } });
  check('donasi dibatalkan', dc.status === 200 && dc.data.status === 'cancelled', dc.body);
  const r4After = await call('GET', `${REQ}/api/v1/requests/${r4.data.id}`, { token: donor.token });
  check('permintaan ikut cancelled + stok kembali 8', r4After.data.status === 'cancelled' && (await stockOf(rec.token, food.id)) === 8, r4After.body);

  section('8. Pencegahan stok negatif');
  const small = (await call('POST', `${FOOD}/api/v1/foods`, { token: donor.token, body: foodBody({ title: 'Stok Satu E2E', quantity_total: 1, max_per_request: null }) })).data;
  const a = await call('POST', `${REQ}/api/v1/requests`, { token: rec.token, key: uuid(), body: { food_id: small.id, quantity: 1 } });
  const b = await call('POST', `${REQ}/api/v1/requests`, { token: rec2.token, key: uuid(), body: { food_id: small.id, quantity: 1 } });
  check('permintaan pertama berhasil', a.status === 201, a.body);
  check('permintaan kedua ditolak (stok habis)', b.status === 409, b.body);
  check('stok 0, tidak negatif', (await stockOf(rec.token, small.id)) === 0);
  const own = await call('POST', `${REQ}/api/v1/requests`, { token: rec.token, key: uuid(), body: { food_id: 99999999, quantity: 1 } });
  check('makanan tidak ada -> 404', own.status === 404, own.body);
  const parallel = await Promise.all([1, 2, 3, 4].map((i) => {
    const t = [rec, rec2][i % 2];
    return call('POST', `${REQ}/api/v1/requests`, { token: t.token, key: uuid(), body: { food_id: food.id, quantity: 3 } });
  }));
  const okCount = parallel.filter((p) => p.status === 201).length;
  check('permintaan paralel: stok tidak pernah negatif', (await stockOf(rec.token, food.id)) === 8 - okCount * 3 && 8 - okCount * 3 >= 0);

  section('9. Dashboard admin');
  const fs = await call('GET', `${FOOD}/api/v1/foods/stats`, { token: adminToken });
  const rs = await call('GET', `${REQ}/api/v1/requests/stats`, { token: adminToken });
  const ds = await call('GET', `${DON}/api/v1/donations/stats`, { token: adminToken });
  const us = await call('GET', `${DON}/api/v1/users?per_page=5`, { token: adminToken });
  check('statistik makanan', fs.status === 200 && fs.data.total >= 2, fs.body);
  check('statistik permintaan', rs.status === 200 && rs.data.total >= 3, rs.body);
  check('statistik donasi', ds.status === 200 && ds.data.total_portions_delivered >= 2, ds.body);
  check('daftar pengguna', us.status === 200 && us.body.meta.total >= 4, us.body);
  const off = await call('PATCH', `${DON}/api/v1/users/${rec2.id}`, { token: adminToken, body: { is_active: false } });
  check('admin menonaktifkan pengguna', off.status === 200 && off.data.is_active === false, off.body);
  check('pengguna nonaktif tidak bisa login',
    (await call('POST', `${DON}/api/v1/auth/login`, { body: { email: rec2.email, password: rec2.password } })).status === 403);
  check('token pengguna nonaktif ditolak',
    (await call('GET', `${DON}/api/v1/auth/me`, { token: rec2.token })).status === 401);

  console.log(`\n==== Hasil: ${passed} lulus, ${failures.length} gagal ====`);
  if (failures.length) { console.log('Gagal:\n - ' + failures.join('\n - ')); process.exit(1); }
})().catch((e) => { console.error('E2E berhenti karena error:', e.message); process.exit(1); });
