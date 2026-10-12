const ACTIVE = ['reserving', 'pending', 'approved', 'scheduled'];
const HIDDEN = ['reserving', 'failed'];
const ALL_STATUSES = [
  'reserving', 'pending', 'approved', 'rejected', 'scheduled', 'completed', 'cancelled', 'expired', 'failed',
];

const activeSlot = (status) => (ACTIVE.includes(status) ? 1 : null);


async function insertReserving(conn, r) {
  await conn.query(
    `INSERT INTO requests (
      id, food_id, food_title, donor_id, recipient_id,
      quantity, note, status, idempotency_key, active_slot, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'reserving', ?, 1, ?)`,
    [
      r.id,
      r.food_id,
      r.food_title ?? null,
      r.donor_id ?? null,
      r.recipient_id,
      r.quantity,
      r.note || null,
      r.idempotency_key,
      r.expires_at,
    ]
  );
}

async function findById(conn, id) {
  const [rows] = await conn.query('SELECT * FROM requests WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findByKey(conn, key) {
  const [rows] = await conn.query('SELECT * FROM requests WHERE idempotency_key = ? LIMIT 1', [key]);
  return rows[0] || null;
}

async function deleteById(conn, id) {
  await conn.query('DELETE FROM request_history WHERE request_id = ?', [id]);
  await conn.query('DELETE FROM requests WHERE id = ?', [id]);
}

/** Ubah status secara atomik. Mengembalikan jumlah baris yang berubah (0 = status tidak sesuai). */
async function changeStatus(conn, id, fromStatuses, toStatus, { rejectionReason, extra = {} } = {}) {
  const sets = ['status = ?', 'active_slot = ?', 'updated_at = NOW()'];
  const values = [toStatus, activeSlot(toStatus)];
  if (rejectionReason !== undefined) {
    sets.push('rejection_reason = ?');
    values.push(rejectionReason);
  }
  for (const [col, val] of Object.entries(extra)) {
    sets.push(`${col} = ?`);
    values.push(val);
  }
  values.push(id, fromStatuses);
  const [res] = await conn.query(`UPDATE requests SET ${sets.join(', ')} WHERE id = ? AND status IN (?)`, values);
  return res.affectedRows;
}

async function list(conn, { recipientId, donorId, statuses, foodId, page, perPage }) {
  const where = [`status NOT IN (${HIDDEN.map(() => '?').join(',')})`];
  const values = [...HIDDEN];
  if (recipientId) { where.push('recipient_id = ?'); values.push(recipientId); }
  if (donorId) { where.push('donor_id = ?'); values.push(donorId); }
  if (statuses && statuses.length) { where.push('status IN (?)'); values.push(statuses); }
  if (foodId) { where.push('food_id = ?'); values.push(foodId); }
  const clause = where.join(' AND ');
  const [[{ total }]] = await conn.query(`SELECT COUNT(*) AS total FROM requests WHERE ${clause}`, values);
  const [rows] = await conn.query(
    `SELECT * FROM requests WHERE ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...values, perPage, (page - 1) * perPage]
  );
  return { rows, total: Number(total) };
}

async function countByStatus(conn) {
  const [rows] = await conn.query('SELECT status, COUNT(*) AS total FROM requests GROUP BY status');
  const out = {};
  for (const r of rows) if (!HIDDEN.includes(r.status)) out[r.status] = Number(r.total);
  return out;
}

async function findStaleReserving(conn, minutes = 2) {
  const [rows] = await conn.query(
    "SELECT * FROM requests WHERE status = 'reserving' AND updated_at < (NOW() - INTERVAL ? MINUTE)",
    [minutes]
  );
  return rows;
}

async function findExpiredPending(conn) {
  const [rows] = await conn.query("SELECT * FROM requests WHERE status = 'pending' AND expires_at < NOW()");
  return rows;
}

async function findNeedingRelease(conn, limit = 100) {
  const [rows] = await conn.query(
    "SELECT * FROM requests WHERE status IN ('rejected','cancelled','expired') AND stock_released = 0 LIMIT ?",
    [limit]
  );
  return rows;
}

module.exports = {
  ACTIVE, ALL_STATUSES, HIDDEN,
  insertReserving, findById, findByKey, deleteById, changeStatus,
  list, countByStatus, findStaleReserving, findExpiredPending, findNeedingRelease,
};
