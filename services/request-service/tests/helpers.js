const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function token(id, role, opts = {}) {
  return jwt.sign({ sub: String(id), role }, global.__TEST_PRIVATE_KEY__, {
    algorithm: 'RS256',
    issuer: opts.issuer || 'sharebite-identity',
    audience: 'sharebite-api',
    expiresIn: opts.expiresIn === undefined ? 900 : opts.expiresIn,
  });
}
const bearer = (id, role, opts) => ({ Authorization: `Bearer ${token(id, role, opts)}` });
const uuid = () => crypto.randomUUID();

/** Food Service palsu di memori: menyimpan stok dan reservasi. */
function makeFakeFood(initialStock = 10, donorId = 10) {
  const state = { stock: initialStock, reservations: {}, calls: { reserve: 0, release: 0, confirm: 0 }, failNext: null, failRelease: false };
  const { AppError } = require('../src/utils/errors');
  return {
    state,
    impl: {
      reserveStock: async ({ foodId, requestId, quantity }) => {
        state.calls.reserve += 1;
        if (state.failNext) {
          const e = state.failNext;
          state.failNext = null;
          throw e;
        }
        if (foodId === 404) throw new AppError('NOT_FOUND', 'Makanan tidak ditemukan.', 404);
        if (state.reservations[requestId]) return state.reservations[requestId];
        if (quantity > state.stock) throw new AppError('INSUFFICIENT_STOCK', 'Stok tidak cukup.', 409);
        state.stock -= quantity;
        const r = { request_id: requestId, food_id: foodId, quantity, status: 'held', donor_id: donorId, food_title: 'Nasi Kotak Ayam' };
        state.reservations[requestId] = r;
        return r;
      },
      confirmReservation: async (requestId) => {
        state.calls.confirm += 1;
        return state.reservations[requestId];
      },
      releaseReservation: async (requestId) => {
        state.calls.release += 1;
        if (state.failRelease) throw new AppError('UPSTREAM_UNAVAILABLE', 'mati', 503);
        const r = state.reservations[requestId];
        if (r && r.status !== 'released') {
          r.status = 'released';
          state.stock += r.quantity;
        }
        return r || null;
      },
    },
  };
}

module.exports = { token, bearer, uuid, makeFakeFood };
