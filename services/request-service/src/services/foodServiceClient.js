const config = require('../config');
const { requestJson } = require('../utils/httpClient');
const { AppError } = require('../utils/errors');

const headers = () => ({ 'X-Service-Key': config.serviceKeys.request });
const base = () => `${config.foodServiceUrl}/internal/v1`;

function upstreamError(res, fallbackMsg) {
  if (res.status === 401) {
    return new AppError('UPSTREAM_ERROR', 'Food Service menolak X-Service-Key. Samakan REQUEST_SERVICE_KEY.', 502);
  }
  return new AppError('UPSTREAM_ERROR', fallbackMsg, 502);
}

/** Reservasi stok. Mengembalikan { request_id, food_id, quantity, donor_id, food_title, status }. */
async function reserveStock({ foodId, requestId, quantity, recipientId }) {
  const res = await requestJson('POST', `${base()}/foods/${foodId}/reservations`, {
    headers: headers(),
    body: { request_id: requestId, quantity, recipient_id: recipientId },
  });
  if (res.status === 200 || res.status === 201) return res.data.data;
  const err = res.data && res.data.error;
  if (res.status === 404) throw new AppError('NOT_FOUND', 'Makanan tidak ditemukan.', 404);
  if (res.status === 409 && err) throw new AppError(err.code || 'CONFLICT', err.message, 409);
  if (res.status === 422 && err) throw new AppError('VALIDATION_ERROR', err.message, 422, err.details);
  throw upstreamError(res, 'Food Service mengembalikan kesalahan saat reservasi stok.');
}

async function confirmReservation(requestId) {
  const res = await requestJson('POST', `${base()}/reservations/${requestId}/confirm`, { headers: headers() });
  if (res.status === 200) return res.data.data;
  throw upstreamError(res, 'Gagal mengonfirmasi reservasi.');
}

/** Melepas reservasi (idempoten). 404 dianggap sudah tidak ada -> aman. */
async function releaseReservation(requestId) {
  const res = await requestJson('POST', `${base()}/reservations/${requestId}/release`, { headers: headers() });
  if (res.status === 200) return res.data.data;
  if (res.status === 404) return null;
  throw upstreamError(res, 'Gagal melepas reservasi.');
}

module.exports = { reserveStock, confirmReservation, releaseReservation };
