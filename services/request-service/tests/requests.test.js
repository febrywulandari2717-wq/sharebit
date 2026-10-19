const request = require('supertest');

jest.mock('../src/services/foodServiceClient');
jest.mock('../src/services/notifier');

const { bearer, uuid, makeFakeFood } = require('./helpers');
const { createApp } = require('../src/app');
const { pool } = require('../src/db/pool');
const { ensureDatabase } = require('../src/db/pool');
const { migrate } = require('../src/db/schema');
const foodClient = require('../src/services/foodServiceClient');
const { AppError } = require('../src/utils/errors');
const reconcile = require('../src/services/reconcileService');
const notifier = require('../src/services/notifier');

const app = createApp();
const SK = { 'X-Service-Key': 'test-donation-key' };
const recipient = () => bearer(20, 'recipient');
const recipient2 = () => bearer(21, 'recipient');
const donor = () => bearer(10, 'donor');
const donor2 = () => bearer(11, 'donor');
const admin = () => bearer(1, 'admin');

let fake;
beforeAll(async () => {
  await ensureDatabase();
  await migrate();
});
beforeEach(async () => {
  await pool.query('DELETE FROM request_history');
  await pool.query('DELETE FROM requests');
  notifier.notify.mockClear();
  notifier.audit.mockClear();
  fake = makeFakeFood(10, 10);
  Object.assign(foodClient, fake.impl);
});
afterAll(async () => {
  await pool.end();
});

const create = (headers, body, key = uuid()) =>
  request(app).post('/api/v1/requests').set({ ...headers, 'Idempotency-Key': key }).send(body);

describe('keamanan dasar', () => {
  test('health', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.data.service).toBe('request');
  });
  test('tanpa token -> 401', async () => {
    expect((await request(app).get('/api/v1/requests')).status).toBe(401);
  });
  test('token kedaluwarsa -> 401', async () => {
    const r = await request(app).get('/api/v1/requests').set(bearer(20, 'recipient', { expiresIn: -10 }));
    expect(r.status).toBe(401);
  });
  test('issuer salah -> 401', async () => {
    const r = await request(app).get('/api/v1/requests').set(bearer(20, 'recipient', { issuer: 'palsu' }));
    expect(r.status).toBe(401);
  });
  test('donor tidak boleh membuat permintaan -> 403', async () => {
    expect((await create(donor(), { food_id: 1, quantity: 1 })).status).toBe(403);
  });
  test('Idempotency-Key wajib', async () => {
    const r = await request(app).post('/api/v1/requests').set(recipient()).send({ food_id: 1, quantity: 1 });
    expect(r.status).toBe(400);
  });
  test('JSON rusak -> 400', async () => {
    const r = await request(app).post('/api/v1/requests').set(recipient()).set('Idempotency-Key', uuid())
      .set('Content-Type', 'application/json').send('{bukan json');
    expect(r.status).toBe(400);
  });
  test('endpoint internal butuh service key', async () => {
    expect((await request(app).get(`/internal/v1/requests/${uuid()}`)).status).toBe(401);
    expect((await request(app).get(`/internal/v1/requests/${uuid()}`).set({ 'X-Service-Key': 'salah' })).status).toBe(401);
  });
});

describe('membuat permintaan', () => {
  test('berhasil: status pending + snapshot + stok berkurang', async () => {
    const r = await create(recipient(), { food_id: 1, quantity: 2, note: 'untuk anak' });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ status: 'pending', quantity: 2, donor_id: 10, food_title: 'Nasi Kotak Ayam', recipient_id: 20 });
    expect(fake.state.stock).toBe(8);
  });
  test('validasi input -> 422', async () => {
    const r = await create(recipient(), { food_id: 'x', quantity: 0 });
    expect(r.status).toBe(422);
    expect(r.body.error.details).toHaveProperty('food_id');
    expect(r.body.error.details).toHaveProperty('quantity');
    expect(fake.state.calls.reserve).toBe(0);
  });
  test('Idempotency-Key sama -> hasil sama, reservasi sekali', async () => {
    const key = uuid();
    const a = await create(recipient(), { food_id: 1, quantity: 2 }, key);
    const b = await create(recipient(), { food_id: 1, quantity: 2 }, key);
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.data.id).toBe(a.body.data.id);
    expect(fake.state.calls.reserve).toBe(1);
    expect(fake.state.stock).toBe(8);
  });
  test('Idempotency-Key sama tapi isi beda -> 409', async () => {
    const key = uuid();
    await create(recipient(), { food_id: 1, quantity: 2 }, key);
    const r = await create(recipient(), { food_id: 1, quantity: 3 }, key);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });
  test('permintaan aktif ganda untuk makanan sama -> 409 tanpa mengurangi stok', async () => {
    await create(recipient(), { food_id: 1, quantity: 1 });
    const r = await create(recipient(), { food_id: 1, quantity: 1 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
    expect(fake.state.stock).toBe(9);
  });
  test('klik ganda bersamaan: hanya satu yang berhasil', async () => {
    const results = await Promise.all([
      create(recipient(), { food_id: 1, quantity: 1 }),
      create(recipient(), { food_id: 1, quantity: 1 }),
      create(recipient(), { food_id: 1, quantity: 1 }),
    ]);
    const codes = results.map((r) => r.status).sort();
    expect(codes).toEqual([201, 409, 409]);
    expect(fake.state.stock).toBe(9);
  });
  test('stok tidak cukup -> 409, tidak tampil di daftar, bisa dicoba ulang dengan key sama', async () => {
    const key = uuid();
    const r = await create(recipient(), { food_id: 1, quantity: 99 }, key);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('INSUFFICIENT_STOCK');
    const list = await request(app).get('/api/v1/requests').set(recipient());
    expect(list.body.data).toHaveLength(0);
    const retry = await create(recipient(), { food_id: 1, quantity: 2 }, key);
    expect(retry.status).toBe(201);
  });
  test('makanan tidak ada -> 404', async () => {
    expect((await create(recipient(), { food_id: 404, quantity: 1 })).status).toBe(404);
  });
  test('Food Service mati (timeout) -> 504, permintaan gagal, stok dilepas', async () => {
    fake.state.failNext = new AppError('UPSTREAM_TIMEOUT', 'timeout', 504);
    const r = await create(recipient(), { food_id: 1, quantity: 2 });
    expect(r.status).toBe(504);
    expect(fake.state.calls.release).toBe(1);
    const next = await create(recipient(), { food_id: 1, quantity: 2 });
    expect(next.status).toBe(201); // slot aktif sudah dibebaskan
  });
});

describe('alur status', () => {
  let id;
  beforeEach(async () => {
    id = (await create(recipient(), { food_id: 1, quantity: 2 })).body.data.id;
  });
  const act = (who, action, body = {}) => request(app).post(`/api/v1/requests/${id}/${action}`).set(who).send(body);

  test('approve oleh donor pemilik + riwayat tercatat', async () => {
    const r = await act(donor(), 'approve');
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('approved');
    expect(r.body.data.history.map((h) => h.to_status)).toEqual(['pending', 'approved']);
    expect(r.body.data.history[1].from_status).toBe('pending');
    expect(fake.state.calls.confirm).toBe(1);
  });
  test('donor lain tidak bisa approve (disamarkan 404)', async () => {
    expect((await act(donor2(), 'approve')).status).toBe(404);
  });
  test('recipient tidak bisa approve', async () => {
    expect((await act(recipient(), 'approve')).status).toBe(403);
  });
  test('approve dua kali -> 409', async () => {
    await act(donor(), 'approve');
    expect((await act(donor(), 'approve')).status).toBe(409);
  });
  test('reject butuh alasan, stok kembali', async () => {
    expect((await act(donor(), 'reject', {})).status).toBe(422);
    const r = await act(donor(), 'reject', { reason: 'Sudah habis diambil orang' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: 'rejected', rejection_reason: 'Sudah habis diambil orang' });
    expect(fake.state.stock).toBe(10);
  });
  test('setelah ditolak boleh mengajukan lagi', async () => {
    await act(donor(), 'reject', { reason: 'Maaf penuh' });
    expect((await create(recipient(), { food_id: 1, quantity: 1 })).status).toBe(201);
  });
  test('recipient membatalkan pending -> stok kembali', async () => {
    const r = await act(recipient(), 'cancel', { reason: 'berubah pikiran' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('cancelled');
    expect(fake.state.stock).toBe(10);
  });
  test('recipient lain tidak bisa membatalkan (404)', async () => {
    expect((await act(recipient2(), 'cancel')).status).toBe(404);
  });
  test('donor hanya bisa membatalkan yang sudah approved', async () => {
    expect((await act(donor(), 'cancel')).status).toBe(409); // pending: donor seharusnya menolak (reject)
    await act(donor(), 'approve');
    expect((await act(donor(), 'cancel', { reason: 'Makanan rusak' })).status).toBe(200);
    expect(fake.state.stock).toBe(10);
  });
  test('tidak bisa membatalkan yang sudah ditolak', async () => {
    await act(donor(), 'reject', { reason: 'tidak tersedia' });
    expect((await act(recipient(), 'cancel')).status).toBe(409);
  });
  test('pelepasan stok gagal -> tetap sukses, reconcile mencoba lagi', async () => {
    fake.state.failRelease = true;
    expect((await act(recipient(), 'cancel')).status).toBe(200);
    expect(fake.state.stock).toBe(8);
    fake.state.failRelease = false;
    const r = await reconcile.run();
    expect(r.released).toBe(1);
    expect(fake.state.stock).toBe(10);
  });
});

describe('visibilitas', () => {
  test('daftar menurut peran', async () => {
    const a = (await create(recipient(), { food_id: 1, quantity: 1 })).body.data;
    await create(recipient2(), { food_id: 1, quantity: 1 });
    const mine = await request(app).get('/api/v1/requests').set(recipient());
    expect(mine.body.data.map((x) => x.id)).toEqual([a.id]);
    expect((await request(app).get('/api/v1/requests').set(donor())).body.meta.total).toBe(2);
    expect((await request(app).get('/api/v1/requests').set(donor2())).body.meta.total).toBe(0);
    expect((await request(app).get('/api/v1/requests').set(admin())).body.meta.total).toBe(2);
  });
  test('filter status & pagination', async () => {
    const a = (await create(recipient(), { food_id: 1, quantity: 1 })).body.data;
    await create(recipient2(), { food_id: 1, quantity: 1 });
    await request(app).post(`/api/v1/requests/${a.id}/approve`).set(donor());
    const r = await request(app).get('/api/v1/requests?status=approved&per_page=1').set(donor());
    expect(r.body.meta.total).toBe(1);
    expect(r.body.data[0].status).toBe('approved');
    expect((await request(app).get('/api/v1/requests?status=ngawur').set(donor())).status).toBe(422);
  });
  test('detail: pihak lain 404, admin boleh, id bukan UUID 404', async () => {
    const a = (await create(recipient(), { food_id: 1, quantity: 1 })).body.data;
    expect((await request(app).get(`/api/v1/requests/${a.id}`).set(recipient2())).status).toBe(404);
    expect((await request(app).get(`/api/v1/requests/${a.id}`).set(donor2())).status).toBe(404);
    expect((await request(app).get(`/api/v1/requests/${a.id}`).set(donor())).status).toBe(200);
    expect((await request(app).get(`/api/v1/requests/${a.id}`).set(admin())).status).toBe(200);
    expect((await request(app).get('/api/v1/requests/abc').set(admin())).status).toBe(404);
  });
  test('statistik hanya admin', async () => {
    await create(recipient(), { food_id: 1, quantity: 1 });
    expect((await request(app).get('/api/v1/requests/stats').set(donor())).status).toBe(403);
    const r = await request(app).get('/api/v1/requests/stats').set(admin());
    expect(r.body.data.by_status.pending).toBe(1);
  });
});

describe('callback Donation Service', () => {
  let id;
  beforeEach(async () => {
    id = (await create(recipient(), { food_id: 1, quantity: 2 })).body.data.id;
  });
  const status = (s, reason) => request(app).post(`/internal/v1/requests/${id}/status`).set(SK).send({ status: s, reason });

  test('GET internal mengembalikan data', async () => {
    const r = await request(app).get(`/internal/v1/requests/${id}`).set(SK);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ id, donor_id: 10, recipient_id: 20, status: 'pending' });
  });
  test('scheduled harus dari approved', async () => {
    expect((await status('scheduled')).status).toBe(409);
    await request(app).post(`/api/v1/requests/${id}/approve`).set(donor());
    expect((await status('scheduled')).status).toBe(200);
    expect((await status('scheduled')).status).toBe(200); // idempoten
    expect((await status('completed')).status).toBe(200);
    const r = await request(app).get(`/api/v1/requests/${id}`).set(recipient());
    expect(r.body.data.status).toBe('completed');
    expect(r.body.data.history.map((h) => h.to_status)).toEqual(['pending', 'approved', 'scheduled', 'completed']);
  });
  test('cancelled dari scheduled mengembalikan stok', async () => {
    await request(app).post(`/api/v1/requests/${id}/approve`).set(donor());
    await status('scheduled');
    expect((await status('cancelled', 'Donor berhalangan')).status).toBe(200);
    expect(fake.state.stock).toBe(10);
  });
  test('status ngawur -> 422', async () => {
    expect((await status('approved')).status).toBe(422);
  });
  test('permintaan scheduled tidak bisa dibatalkan lewat API publik', async () => {
    await request(app).post(`/api/v1/requests/${id}/approve`).set(donor());
    await status('scheduled');
    const r = await request(app).post(`/api/v1/requests/${id}/cancel`).set(recipient()).send({});
    expect(r.status).toBe(409);
  });
});

describe('reconcile', () => {
  test('pending kedaluwarsa -> expired dan stok dikembalikan', async () => {
    const id = (await create(recipient(), { food_id: 1, quantity: 3 })).body.data.id;
    await pool.query("UPDATE requests SET expires_at = NOW() - INTERVAL 1 HOUR WHERE id = ?", [id]);
    const r = await reconcile.run();
    expect(r.expired).toBe(1);
    expect(fake.state.stock).toBe(10);
    const got = await request(app).get(`/api/v1/requests/${id}`).set(recipient());
    expect(got.body.data.status).toBe('expired');
  });
  test('reserving yang macet -> failed dan slot dibebaskan', async () => {
    const id = uuid();
    await pool.query(
      "INSERT INTO requests (id, food_id, recipient_id, quantity, status, idempotency_key, active_slot, expires_at, updated_at) VALUES (?,1,20,1,'reserving',?,1, NOW() + INTERVAL 1 DAY, NOW() - INTERVAL 10 MINUTE)",
      [id, uuid()]
    );
    expect((await create(recipient(), { food_id: 1, quantity: 1 })).status).toBe(409);
    expect((await reconcile.run()).failed).toBe(1);
    expect((await create(recipient(), { food_id: 1, quantity: 1 })).status).toBe(201);
  });
});

describe('notifikasi, riwayat aktivitas, dan statistik', () => {
  const act = (who, id, action, body = {}) => request(app).post(`/api/v1/requests/${id}/${action}`).set(who).send(body);

  test('notifikasi dikirim ke pihak yang tepat', async () => {
    const id = (await create(recipient(), { food_id: 1, quantity: 2 })).body.data.id;
    expect(notifier.notify).toHaveBeenLastCalledWith(10, 'request_new', 'Permintaan baru', expect.stringContaining('2 porsi'), 'donor-requests.html');
    await act(donor(), id, 'approve');
    expect(notifier.notify).toHaveBeenLastCalledWith(20, 'request_approved', expect.any(String), expect.any(String), 'my-requests.html');
    await act(recipient(), id, 'cancel', { reason: 'tidak jadi' });
    expect(notifier.notify).toHaveBeenLastCalledWith(10, 'request_cancelled', expect.any(String), expect.stringContaining('tidak jadi'), 'donor-requests.html');
  });
  test('penolakan memberi tahu penerima beserta alasan', async () => {
    const id = (await create(recipient(), { food_id: 1, quantity: 1 })).body.data.id;
    await act(donor(), id, 'reject', { reason: 'Sudah habis' });
    expect(notifier.notify).toHaveBeenLastCalledWith(20, 'request_rejected', expect.any(String), expect.stringContaining('Sudah habis'), 'my-requests.html');
  });
  test('aksi admin dicatat ke audit log', async () => {
    const id = (await create(recipient(), { food_id: 1, quantity: 1 })).body.data.id;
    await act(admin(), id, 'approve');
    expect(notifier.audit).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }), 'request.approve', 'request', id, expect.any(Object));
  });
  test('kegagalan notifikasi tidak menggagalkan permintaan', async () => {
    notifier.notify.mockImplementation(() => { throw new Error('mati'); });
    const r = await create(recipient(), { food_id: 1, quantity: 1 });
    notifier.notify.mockReset();
    expect(r.status).toBeGreaterThanOrEqual(200);
  });
  test('riwayat aktivitas: dibatasi per peran, filter status & tanggal, pagination', async () => {
    const a = (await create(recipient(), { food_id: 1, quantity: 1 })).body.data.id;
    await create(recipient2(), { food_id: 1, quantity: 1 });
    await act(donor(), a, 'approve');
    const mine = await request(app).get('/api/v1/activity').set(recipient());
    expect(mine.body.meta.total).toBe(2); // pending + approved milik penerima 1
    expect(mine.body.data[0].to_status).toBe('approved');
    expect(mine.body.data[0].actor_id).toBeUndefined();
    expect((await request(app).get('/api/v1/activity').set(donor2())).body.meta.total).toBe(0);
    expect((await request(app).get('/api/v1/activity').set(admin())).body.meta.total).toBe(3);
    expect((await request(app).get('/api/v1/activity?status=approved').set(donor())).body.meta.total).toBe(1);
    expect((await request(app).get('/api/v1/activity?from=2099-01-01').set(donor())).body.meta.total).toBe(0);
    expect((await request(app).get('/api/v1/activity?from=2000-01-01&to=2099-12-31&per_page=1').set(donor())).body.data).toHaveLength(1);
    expect((await request(app).get('/api/v1/activity?from=ngawur').set(donor())).status).toBe(422);
    expect((await request(app).get('/api/v1/activity')).status).toBe(401);
  });
  test('statistik: tingkat penyelesaian terdefinisi dan tren harian', async () => {
    const ids = [];
    for (const u of [recipient(), recipient2()]) ids.push((await create(u, { food_id: 1, quantity: 1 })).body.data.id);
    await act(donor(), ids[0], 'reject', { reason: 'penuh sekali' });
    await request(app).post(`/internal/v1/requests/${ids[1]}/status`).set(SK).send({ status: 'scheduled' }); // 409, belum approved
    let s = (await request(app).get('/api/v1/requests/stats').set(admin())).body.data;
    expect(s.by_status.rejected).toBe(1);
    expect(s.completion_rate).toBe(0); // 0 selesai dari 1 yang berakhir
    await act(donor(), ids[1], 'approve');
    await request(app).post(`/internal/v1/requests/${ids[1]}/status`).set(SK).send({ status: 'scheduled' });
    await request(app).post(`/internal/v1/requests/${ids[1]}/status`).set(SK).send({ status: 'completed' });
    s = (await request(app).get('/api/v1/requests/stats').set(admin())).body.data;
    expect(s.completion_rate).toBe(50);
    const t = (await request(app).get('/api/v1/requests/stats/timeline?days=7').set(admin())).body.data;
    expect(t.series).toHaveLength(7);
    expect(t.series.reduce((a, x) => a + x.requests, 0)).toBe(2);
    const mine = (await request(app).get('/api/v1/requests/stats/timeline?days=7').set(recipient())).body.data;
    expect(mine.series.reduce((a, x) => a + x.requests, 0)).toBe(1);
  });
});
