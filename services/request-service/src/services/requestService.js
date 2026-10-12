const crypto = require('crypto');
const config = require('../config');
const { pool, withTransaction } = require('../db/pool');
const repo = require('../repositories/requestRepository');
const history = require('../repositories/historyRepository');
const food = require('./foodServiceClient');
const { AppError, notFound, validation } = require('../utils/errors');
const { isUuid } = require('../utils/uuid');

const iso = (d) => (d ? new Date(d).toISOString() : null);

function serialize(row, hist) {
  const out = {
    id: row.id,
    food_id: Number(row.food_id),
    food_title: row.food_title,
    donor_id: row.donor_id === null ? null : Number(row.donor_id),
    recipient_id: Number(row.recipient_id),
    quantity: row.quantity,
    note: row.note,
    status: row.status,
    rejection_reason: row.rejection_reason,
    expires_at: iso(row.expires_at),
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
  if (hist) {
    out.history = hist.map((h) => ({
      from_status: h.from_status,
      to_status: h.to_status,
      actor_id: h.actor_id === null ? null : Number(h.actor_id),
      actor_role: h.actor_role,
      reason: h.reason,
      at: iso(h.at),
    }));
  }
  return out;
}

const isDup = (err, key) => err && err.code === 'ER_DUP_ENTRY' && String(err.sqlMessage || err.message).includes(key);

/** Melepas stok di Food Service lalu menandai stock_released. Kegagalan hanya dicatat (dicoba ulang oleh reconcile). */
async function releaseStock(id) {
  try {
    await food.releaseReservation(id);
    await pool.query('UPDATE requests SET stock_released = 1 WHERE id = ?', [id]);
    return true;
  } catch (err) {
    console.warn(`[request-service] Gagal melepas stok untuk ${id}: ${err.message}`);
    return false;
  }
}

async function transition({ id, from, to, actor, reason, setRejectionReason = false }) {
  return withTransaction(async (conn) => {
    const before = await repo.findById(conn, id);
    const changed = await repo.changeStatus(conn, id, from, to, {
      rejectionReason: setRejectionReason ? reason : undefined,
    });
    if (changed === 0) {
      const row = await repo.findById(conn, id);
      if (!row || repo.HIDDEN.includes(row.status)) throw notFound('Permintaan tidak ditemukan.');
      throw new AppError('INVALID_STATE_TRANSITION', `Tidak bisa mengubah status dari ${row.status} ke ${to}.`, 409);
    }
    const row = await repo.findById(conn, id);
    await history.addHistory(conn, {
      request_id: id,
      from_status: before ? before.status : null,
      to_status: to,
      actor_id: actor.id,
      actor_role: actor.role,
      reason,
    });
    return row;
  });
}

// ---------------------------------------------------------------- pembuatan permintaan (saga)
async function createRequest({ user, body, idempotencyKey }) {
  const details = {};
  const foodId = Number(body.food_id);
  const quantity = Number(body.quantity);
  const note = body.note === undefined || body.note === null ? null : String(body.note).trim() || null;
  if (!Number.isInteger(foodId) || foodId < 1) details.food_id = ['Wajib berupa angka bulat positif.'];
  if (!Number.isInteger(quantity) || quantity < 1) details.quantity = ['Minimal 1.'];
  if (note && note.length > 255) details.note = ['Maksimal 255 karakter.'];
  if (Object.keys(details).length) throw validation(details);

  // 1. Idempotensi
  const existing = await repo.findByKey(pool, idempotencyKey);
  if (existing) {
    if (Number(existing.recipient_id) !== user.id) {
      throw new AppError('IDEMPOTENCY_CONFLICT', 'Idempotency-Key sudah dipakai.', 409);
    }
    if (existing.status === 'failed') {
      await repo.deleteById(pool, existing.id); // kegagalan sebelumnya boleh dicoba ulang
    } else if (existing.status === 'reserving') {
      throw new AppError('REQUEST_IN_PROGRESS', 'Permintaan sedang diproses, coba beberapa saat lagi.', 409);
    } else {
      if (Number(existing.food_id) !== foodId || existing.quantity !== quantity) {
        throw new AppError('IDEMPOTENCY_CONFLICT', 'Idempotency-Key sudah dipakai untuk permintaan berbeda.', 409);
      }
      return { request: serialize(existing), created: false };
    }
  }

  // 2. Catat niat (status reserving). Unique key menolak permintaan aktif ganda secara atomik.
  const id = crypto.randomUUID();
  try {
    await repo.insertReserving(pool, {
      id,
      food_id: foodId,
      recipient_id: user.id,
      quantity,
      note,
      idempotency_key: idempotencyKey,
      expires_at: new Date(Date.now() + config.holdHours * 3600 * 1000),
    });
  } catch (err) {
    if (isDup(err, 'uq_active_request')) {
      throw new AppError('DUPLICATE_ACTIVE_REQUEST', 'Anda sudah punya permintaan aktif untuk makanan ini.', 409);
    }
    if (isDup(err, 'uq_idempotency')) {
      throw new AppError('REQUEST_IN_PROGRESS', 'Permintaan yang sama sedang diproses.', 409);
    }
    throw err;
  }

  // 3. Reservasi stok di Food Service
  let reservation;
  try {
    reservation = await food.reserveStock({ foodId, requestId: id, quantity, recipientId: user.id });
  } catch (err) {
    // Jika jawabannya tidak pasti (timeout/jaringan), lepaskan reservasi kalau-kalau sudah terbentuk
    if (['UPSTREAM_TIMEOUT', 'UPSTREAM_UNAVAILABLE'].includes(err.code)) await releaseStock(id).catch(() => {});
    await withTransaction(async (conn) => {
      await repo.changeStatus(conn, id, ['reserving'], 'failed');
    });
    throw err;
  }

  // 4. Simpan snapshot dan jadikan pending
  try {
    await withTransaction(async (conn) => {
      const changed = await repo.changeStatus(conn, id, ['reserving'], 'pending', {
        extra: { food_id: reservation.food_id, food_title: reservation.food_title, donor_id: reservation.donor_id },
      });
      if (changed === 0) throw new AppError('INTERNAL_ERROR', 'Status permintaan berubah saat diproses.', 500);
      await history.addHistory(conn, {
        request_id: id, from_status: 'reserving', to_status: 'pending', actor_id: user.id, actor_role: 'recipient',
      });
    });
  } catch (err) {
    // Kompensasi: stok sudah dikurangi tetapi permintaan gagal tersimpan
    await releaseStock(id);
    await pool.query("UPDATE requests SET status = 'failed', active_slot = NULL WHERE id = ? AND status = 'reserving'", [id]);
    throw err;
  }
  return { request: serialize(await repo.findById(pool, id)), created: true };
}

// ---------------------------------------------------------------- baca
async function listRequests({ user, query }) {
  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()).filter(Boolean) : null;
  if (statuses) {
    const bad = statuses.filter((s) => !repo.ALL_STATUSES.includes(s) || repo.HIDDEN.includes(s));
    if (bad.length) throw validation({ status: [`Status tidak valid: ${bad.join(', ')}`] });
  }
  const foodId = query.food_id ? Number(query.food_id) : null;
  if (query.food_id && (!Number.isInteger(foodId) || foodId < 1)) throw validation({ food_id: ['Tidak valid.'] });
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(query.per_page, 10) || 12, 1), 50);

  const { rows, total } = await repo.list(pool, {
    recipientId: user.role === 'recipient' ? user.id : null,
    donorId: user.role === 'donor' ? user.id : null,
    statuses,
    foodId,
    page,
    perPage,
  });
  return {
    data: rows.map((r) => serialize(r)),
    meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
  };
}

async function loadVisible(user, id) {
  if (!isUuid(id)) throw notFound('Permintaan tidak ditemukan.');
  const row = await repo.findById(pool, id);
  if (!row || repo.HIDDEN.includes(row.status)) throw notFound('Permintaan tidak ditemukan.');
  const isRecipient = Number(row.recipient_id) === user.id;
  const isDonor = row.donor_id !== null && Number(row.donor_id) === user.id;
  if (!isRecipient && !isDonor && user.role !== 'admin') throw notFound('Permintaan tidak ditemukan.');
  return { row, isRecipient, isDonor };
}

async function getRequest({ user, id }) {
  const { row } = await loadVisible(user, id);
  return serialize(row, await history.listByRequest(pool, row.id));
}

async function stats() {
  const byStatus = await repo.countByStatus(pool);
  return { total: Object.values(byStatus).reduce((a, b) => a + b, 0), by_status: byStatus };
}

// ---------------------------------------------------------------- aksi
async function approve({ user, id }) {
  const { row, isDonor } = await loadVisible(user, id);
  if (!isDonor && user.role !== 'admin') throw new AppError('FORBIDDEN', 'Hanya donor pemilik makanan yang boleh menyetujui.', 403);
  await transition({ id: row.id, from: ['pending'], to: 'approved', actor: user });
  try {
    await food.confirmReservation(row.id);
  } catch (err) {
    console.warn(`[request-service] Konfirmasi reservasi ${row.id} gagal: ${err.message}`);
  }
  return getRequest({ user, id });
}

async function reject({ user, id, reason }) {
  const text = String(reason || '').trim();
  if (text.length < 3 || text.length > 255) throw validation({ reason: ['Alasan wajib 3-255 karakter.'] });
  const { row, isDonor } = await loadVisible(user, id);
  if (!isDonor && user.role !== 'admin') throw new AppError('FORBIDDEN', 'Hanya donor pemilik makanan yang boleh menolak.', 403);
  await transition({ id: row.id, from: ['pending'], to: 'rejected', actor: user, reason: text, setRejectionReason: true });
  await releaseStock(row.id);
  return getRequest({ user, id });
}

async function cancel({ user, id, reason }) {
  const { row, isRecipient, isDonor } = await loadVisible(user, id);
  let from = [];
  if (user.role === 'admin') from = ['pending', 'approved'];
  else if (isRecipient) from = ['pending', 'approved'];
  else if (isDonor) from = ['approved'];
  if (row.status === 'scheduled') {
    throw new AppError('INVALID_STATE_TRANSITION', 'Permintaan sudah dijadwalkan. Batalkan melalui donasinya.', 409);
  }
  if (!from.length) throw new AppError('FORBIDDEN', 'Anda tidak berhak membatalkan permintaan ini.', 403);
  const text = reason ? String(reason).trim().slice(0, 255) || null : null;
  await transition({ id: row.id, from, to: 'cancelled', actor: user, reason: text });
  await releaseStock(row.id);
  return getRequest({ user, id });
}

// ---------------------------------------------------------------- internal (Donation Service)
async function internalGet(id) {
  if (!isUuid(id)) throw notFound('Permintaan tidak ditemukan.');
  const row = await repo.findById(pool, id);
  if (!row || repo.HIDDEN.includes(row.status)) throw notFound('Permintaan tidak ditemukan.');
  return {
    id: row.id,
    food_id: Number(row.food_id),
    food_title: row.food_title,
    donor_id: Number(row.donor_id),
    recipient_id: Number(row.recipient_id),
    quantity: row.quantity,
    status: row.status,
  };
}

const CALLBACK_FROM = { scheduled: ['approved'], completed: ['scheduled'], cancelled: ['approved', 'scheduled'] };

async function internalSetStatus({ id, status, reason }) {
  if (!CALLBACK_FROM[status]) {
    throw validation({ status: ['Harus salah satu dari scheduled, completed, cancelled.'] });
  }
  if (!isUuid(id)) throw notFound('Permintaan tidak ditemukan.');
  const row = await repo.findById(pool, id);
  if (!row || repo.HIDDEN.includes(row.status)) throw notFound('Permintaan tidak ditemukan.');
  if (row.status === status) return { id, status }; // idempoten
  await transition({
    id, from: CALLBACK_FROM[status], to: status,
    actor: { id: null, role: 'system' }, reason: reason ? String(reason).slice(0, 255) : null,
  });
  if (status === 'cancelled') await releaseStock(id);
  return { id, status };
}

module.exports = {
  createRequest, listRequests, getRequest, stats, approve, reject, cancel,
  internalGet, internalSetStatus, releaseStock, transition, serialize,
};
