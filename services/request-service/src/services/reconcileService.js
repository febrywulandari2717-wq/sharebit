const { pool, withTransaction } = require('../db/pool');
const repo = require('../repositories/requestRepository');
const history = require('../repositories/historyRepository');
const food = require('./foodServiceClient');
const requestService = require('./requestService');

/**
 * Pembersihan berkala:
 *  1. 'reserving' yang macet (> 2 menit) -> lepas stok, tandai 'failed'
 *  2. 'pending' yang lewat batas waktu   -> 'expired' dan stok dikembalikan
 *  3. permintaan rejected/cancelled/expired yang stoknya belum berhasil dilepas -> coba lagi
 */
async function run() {
  const result = { failed: 0, expired: 0, released: 0 };

  for (const row of await repo.findStaleReserving(pool)) {
    try {
      await food.releaseReservation(row.id);
    } catch (err) {
      continue; // Food Service belum bisa dihubungi; coba lagi nanti
    }
    await withTransaction(async (conn) => {
      if ((await repo.changeStatus(conn, row.id, ['reserving'], 'failed')) === 1) {
        await history.addHistory(conn, {
          request_id: row.id, from_status: 'reserving', to_status: 'failed', actor_role: 'system',
          reason: 'Reservasi tidak selesai',
        });
        result.failed += 1;
      }
    });
  }

  for (const row of await repo.findExpiredPending(pool)) {
    try {
      await requestService.transition({
        id: row.id, from: ['pending'], to: 'expired', actor: { id: null, role: 'system' }, reason: 'Melewati batas waktu',
      });
      await requestService.releaseStock(row.id);
      result.expired += 1;
    } catch (err) {
      /* status sudah berubah oleh proses lain */
    }
  }

  for (const row of await repo.findNeedingRelease(pool)) {
    if (await requestService.releaseStock(row.id)) result.released += 1;
  }
  return result;
}

module.exports = { run };
