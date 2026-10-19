const config = require('../config');
const { requestJson } = require('../utils/httpClient');

/**
 * Mengirim notifikasi / catatan audit ke Donation Service (pemilik data notifikasi).
 * "Best effort": kegagalan hanya dicatat dan TIDAK menggagalkan operasi utama.
 */
async function post(path, body) {
  try {
    const res = await requestJson('POST', `${config.donationServiceUrl}/api/v1/internal${path}`, {
      headers: { 'X-Service-Key': config.serviceKeys.donation },
      body,
    });
    if (res.status >= 300) console.warn(`[notifier] ${path} -> HTTP ${res.status}`);
    return res.status < 300;
  } catch (err) {
    console.warn(`[notifier] ${path} gagal: ${err.message}`);
    return false;
  }
}

const notify = (userId, type, title, body, link) => {
  if (!userId) return Promise.resolve(false);
  return post('/notifications', { user_id: Number(userId), type, title, body: body || null, link: link || null });
};

const audit = (actor, action, targetType, targetId, meta = {}) =>
  post('/audit', { actor_id: actor.id, actor_role: actor.role, action, target_type: targetType, target_id: String(targetId), meta });

module.exports = { notify, audit };
