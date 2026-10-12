const config = require('../config');
const { AppError } = require('./errors');

/** HTTP JSON dengan timeout. Mengembalikan { status, data }. */
async function requestJson(method, url, { headers = {}, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.httpTimeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    return { status: res.status, data };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('UPSTREAM_TIMEOUT', 'Service tujuan tidak merespons (timeout).', 504);
    }
    throw new AppError('UPSTREAM_UNAVAILABLE', 'Service tujuan tidak dapat dihubungi.', 503);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { requestJson };
