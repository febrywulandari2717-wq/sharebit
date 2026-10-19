// Pengujian end-to-end ShareBite. Jalankan SETELAH ketiga service hidup:
//   node tests/e2e/run-e2e.js
// Butuh Node.js 18+. Membuat data uji baru (email unik) setiap dijalankan.
const FOOD = process.env.FOOD_URL || 'http://127.0.0.1:5001';
const REQ = process.env.REQUEST_URL || 'http://127.0.0.1:5002';
const DON = process.env.DONATION_URL || 'http://127.0.0.1:8003';
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


  section('10. Endpoint publik, lokasi, dan kategori admin');
  const pubFoods = await call('GET', `${FOOD}/api/v1/public/foods?q=E2E`);
  check('katalog publik tanpa login', pubFoods.status === 200 && pubFoods.body.meta.total >= 1, pubFoods.body);
  const geoFood = (await call('POST', `${FOOD}/api/v1/foods`, { token: donor.token, body: foodBody({ title: 'Lokasi Gresik E2E', latitude: -7.155, longitude: 112.656 }) })).data;
  const near = await call('GET', `${FOOD}/api/v1/public/foods?lat=-7.16&lng=112.65&radius_km=10&sort=distance`);
  check('filter radius mengembalikan makanan berkoordinat + jarak', near.status === 200 && near.data.some((f) => f.id === geoFood.id && f.distance_km < 10), near.body);
  const ps = await call('GET', `${FOOD}/api/v1/public/stats`);
  check('statistik makanan publik', ps.status === 200 && ps.data.available_foods >= 1, ps.body);
  const pd = await call('GET', `${DON}/api/v1/public/stats`);
  check('statistik dampak publik hanya dari donasi selesai', pd.status === 200 && pd.data.completed_donations >= 1 && pd.data.portions_delivered >= 2, pd.body);
  const catName = `Kategori E2E ${Date.now()}`;
  check('donor tidak boleh membuat kategori', (await call('POST', `${FOOD}/api/v1/categories`, { token: donor.token, body: { name: catName } })).status === 403);
  const cat = await call('POST', `${FOOD}/api/v1/categories`, { token: adminToken, body: { name: catName } });
  check('admin membuat kategori', cat.status === 201, cat.body);
  check('admin menghapus kategori', (await call('DELETE', `${FOOD}/api/v1/categories/${cat.data.id}`, { token: adminToken })).status === 204);

  section('11. Favorit');
  const fav1 = await call('POST', `${DON}/api/v1/favorites`, { token: rec.token, body: { food_id: food.id, food_title: food.title } });
  const fav2 = await call('POST', `${DON}/api/v1/favorites`, { token: rec.token, body: { food_id: food.id } });
  check('tambah favorit (idempoten, tanpa duplikat)', fav1.status === 201 && fav2.status === 200);
  const favs = await call('GET', `${DON}/api/v1/favorites`, { token: rec.token });
  check('daftar favorit sinkron database', favs.status === 200 && favs.body.meta.total === 1);
  check('favorit bersifat pribadi', (await call('GET', `${DON}/api/v1/favorites`, { token: donor.token })).body.meta.total === 0);
  check('hapus favorit', (await call('DELETE', `${DON}/api/v1/favorites/${food.id}`, { token: rec.token })).status === 204);

  section('12. Notifikasi, riwayat aktivitas, dan statistik');
  const rN = await call('GET', `${DON}/api/v1/notifications?per_page=50`, { token: rec.token });
  const types = rN.data.map((n) => n.type);
  check('penerima menerima notifikasi persetujuan & jadwal & selesai', ['request_approved', 'donation_scheduled', 'donation_completed'].every((t) => types.includes(t)), types);
  const dN = await call('GET', `${DON}/api/v1/notifications?per_page=50`, { token: donor.token });
  const dt = dN.data.map((n) => n.type);
  check('donatur menerima notifikasi permintaan baru & donasi selesai', ['request_new', 'donation_completed'].every((t) => dt.includes(t)), dt);
  const unread = await call('GET', `${DON}/api/v1/notifications/unread-count`, { token: rec.token });
  check('jumlah belum dibaca > 0', unread.data.unread > 0);
  const readAll = await call('POST', `${DON}/api/v1/notifications/read-all`, { token: rec.token });
  check('tandai semua dibaca', readAll.status === 200 && (await call('GET', `${DON}/api/v1/notifications/unread-count`, { token: rec.token })).data.unread === 0);
  const act = await call('GET', `${REQ}/api/v1/activity?per_page=50`, { token: rec.token });
  check('riwayat aktivitas penerima (dibatasi miliknya)', act.status === 200 && act.body.meta.total >= 4 && act.data.every((a) => a.actor_id === undefined), act.body);
  check('filter riwayat berdasarkan status', (await call('GET', `${REQ}/api/v1/activity?status=completed`, { token: rec.token })).body.meta.total >= 1);
  check('riwayat butuh login', (await call('GET', `${REQ}/api/v1/activity`)).status === 401);
  const tl = await call('GET', `${DON}/api/v1/stats/timeline?days=7`, { token: donor.token });
  check('deret waktu donasi 7 hari', tl.status === 200 && tl.data.series.length === 7 && tl.data.series.reduce((a, x) => a + x.portions, 0) >= 2, tl.body);
  const rst = await call('GET', `${REQ}/api/v1/requests/stats`, { token: adminToken });
  check('tingkat penyelesaian terdefinisi', rst.status === 200 && rst.data.completion_rate !== undefined, rst.body);

  section('13. Gamifikasi: poin, badge, peringkat');
  const gm = await call('GET', `${DON}/api/v1/me/gamification`, { token: donor.token });
  check('poin donatur dari donasi selesai (10 + 2 porsi = 12, tidak ganda)', gm.status === 200 && gm.data.points === 12 && gm.data.completed_donations === 1, gm.body);
  check('badge Donatur Pertama diperoleh', gm.data.badges.find((b) => b.code === 'first_donor').earned === true);
  const recGm = await call('GET', `${DON}/api/v1/me/gamification`, { token: rec.token });
  check('penerima tidak mendapat poin', recGm.data.points === 0);
  const lb = await call('GET', `${DON}/api/v1/public/leaderboard?period=all`);
  check('papan peringkat publik memuat donatur', lb.status === 200 && lb.data.entries.some((e) => e.user_id === donor.id && e.points === 12), lb.body);
  const hide = await call('PATCH', `${DON}/api/v1/auth/me`, { token: donor.token, body: { leaderboard_visible: false } });
  const lb2 = await call('GET', `${DON}/api/v1/public/leaderboard?period=all`);
  check('donatur dapat menyembunyikan diri dari peringkat', hide.status === 200 && !lb2.data.entries.some((e) => e.user_id === donor.id));
  await call('PATCH', `${DON}/api/v1/auth/me`, { token: donor.token, body: { leaderboard_visible: true } });

  section('14. Laporan, moderasi, dan log audit');
  const rep = await call('POST', `${DON}/api/v1/reports`, { token: rec.token, body: { target_type: 'food', target_id: food.id, reason: 'misleading', details: 'Uji E2E' } });
  check('penerima melaporkan makanan', rep.status === 201, rep.body);
  check('laporan ganda yang masih diproses ditolak', (await call('POST', `${DON}/api/v1/reports`, { token: rec.token, body: { target_type: 'food', target_id: food.id, reason: 'misleading' } })).status === 409);
  check('non-admin tidak boleh melihat laporan', (await call('GET', `${DON}/api/v1/reports`, { token: rec.token })).status === 403);
  check('menutup laporan tanpa catatan ditolak', (await call('PATCH', `${DON}/api/v1/reports/${rep.data.id}`, { token: adminToken, body: { status: 'resolved' } })).status === 422);
  const fixed = await call('PATCH', `${DON}/api/v1/reports/${rep.data.id}`, { token: adminToken, body: { status: 'resolved', admin_note: 'Sudah diperiksa, informasi diperbaiki' } });
  check('admin menyelesaikan laporan', fixed.status === 200 && fixed.data.status === 'resolved', fixed.body);
  const mineRep = await call('GET', `${DON}/api/v1/reports/mine`, { token: rec.token });
  check('pelapor melihat catatan admin', mineRep.data[0].admin_note.includes('diperiksa'));
  check('pelapor mendapat notifikasi hasil laporan', (await call('GET', `${DON}/api/v1/notifications?per_page=50`, { token: rec.token })).data.some((n) => n.type === 'report'));
  const closeFood = await call('PATCH', `${FOOD}/api/v1/foods/${geoFood.id}`, { token: adminToken, body: { status: 'closed' } });
  check('admin menutup makanan (moderasi)', closeFood.status === 200 && closeFood.data.status === 'closed', closeFood.body);
  let logs = [];
  for (let i = 0; i < 10 && !logs.some((l) => l.action === 'food.update'); i += 1) { await new Promise((r) => setTimeout(r, 300)); logs = (await call('GET', `${DON}/api/v1/audit-logs?per_page=100`, { token: adminToken })).data; }
  const acts = logs.map((l) => l.action);
  check('log audit mencatat laporan, pengguna, dan aksi Food Service', ['report.resolved', 'user.deactivate', 'food.update', 'category.create'].every((a) => acts.includes(a)), acts);
  check('log audit tidak memuat rahasia', !JSON.stringify(logs).match(/password|refresh_token|access_token|eyJ/i));
  check('log audit hanya untuk admin', (await call('GET', `${DON}/api/v1/audit-logs`, { token: donor.token })).status === 403);

  section('15. Kampanye komunitas');
  const camp = await call('POST', `${DON}/api/v1/campaigns`, { token: adminToken, body: { title: 'Kampanye E2E', description: 'Uji', target_portions: 10, starts_at: hoursFromNow(-24), ends_at: hoursFromNow(24 * 7) } });
  check('admin membuat kampanye', camp.status === 201, camp.body);
  check('donor tidak boleh membuat kampanye', (await call('POST', `${DON}/api/v1/campaigns`, { token: donor.token, body: {} })).status === 403);
  const pubCamps = await call('GET', `${DON}/api/v1/public/campaigns`);
  check('kampanye tampil publik dengan kemajuan 0', pubCamps.data.some((c) => c.id === camp.data.id && c.progress.portions === 0));
  const joined = await call('POST', `${DON}/api/v1/campaigns/${camp.data.id}/join`, { token: donor.token });
  check('donatur bergabung kampanye', joined.status === 200 && joined.data.joined === true, joined.body);
  const prog = await call('GET', `${DON}/api/v1/campaigns/${camp.data.id}`, { token: donor.token });
  check('kemajuan kampanye dihitung dari donasi selesai peserta (2 porsi)', prog.data.progress.portions === 2 && prog.data.progress.participants === 1, prog.body);

  console.log(`\n==== Hasil: ${passed} lulus, ${failures.length} gagal ====`);
  if (failures.length) { console.log('Gagal:\n - ' + failures.join('\n - ')); process.exit(1); }
})().catch((e) => { console.error('E2E berhenti karena error:', e.message); process.exit(1); });
