import * as SecureStore from 'expo-secure-store';
import { API } from '../config';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details || null;
  }
}

const K = { access: 'sb_access', refresh: 'sb_refresh', user: 'sb_user' };
let memory = { access: null, refresh: null, user: null };
let onSessionLost = () => {};

export const session = {
  async load() {
    const [a, r, u] = await Promise.all([
      SecureStore.getItemAsync(K.access), SecureStore.getItemAsync(K.refresh), SecureStore.getItemAsync(K.user),
    ]);
    memory = { access: a, refresh: r, user: u ? JSON.parse(u) : null };
    return memory.user;
  },
  async save(d) {
    memory = { access: d.access_token, refresh: d.refresh_token, user: d.user };
    await Promise.all([
      SecureStore.setItemAsync(K.access, d.access_token), SecureStore.setItemAsync(K.refresh, d.refresh_token),
      SecureStore.setItemAsync(K.user, JSON.stringify(d.user)),
    ]);
  },
  async setUser(u) { memory.user = u; await SecureStore.setItemAsync(K.user, JSON.stringify(u)); },
  async clear() {
    memory = { access: null, refresh: null, user: null };
    await Promise.all(Object.values(K).map((k) => SecureStore.deleteItemAsync(k)));
  },
  get refreshToken() { return memory.refresh; },
  get user() { return memory.user; },
  onLost(fn) { onSessionLost = fn; },
};

async function raw(method, url, { body, form, token, key } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (key) headers['Idempotency-Key'] = key;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
  } catch (e) {
    throw new ApiError(0, 'NETWORK', 'Tidak dapat terhubung ke server. Periksa Wi-Fi dan pastikan backend berjalan.');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch (_) { /* bukan JSON */ }
  if (!res.ok) {
    const e = (data && data.error) || {};
    throw new ApiError(res.status, e.code || 'ERROR', e.message || `Permintaan gagal (${res.status}).`, e.details);
  }
  return data;
}

let refreshing = null;
function refreshTokens() {
  if (!session.refreshToken) return Promise.reject(new ApiError(401, 'UNAUTHENTICATED', 'Sesi berakhir.'));
  if (!refreshing) {
    refreshing = raw('POST', `${API.DONATION}/api/v1/auth/refresh`, { body: { refresh_token: session.refreshToken } })
      .then((r) => session.save(r.data))
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function call(method, url, opts = {}, retried = false) {
  try {
    return await raw(method, url, { ...opts, token: memory.access });
  } catch (err) {
    if (err.status === 401 && !retried) {
      try { await refreshTokens(); } catch (_) { await session.clear(); onSessionLost(); throw err; }
      return call(method, url, opts, true);
    }
    throw err;
  }
}

export const food = (m, p, o) => call(m, `${API.FOOD}/api/v1${p}`, o);
export const requests = (m, p, o) => call(m, `${API.REQUEST}/api/v1${p}`, o);
export const donation = (m, p, o) => call(m, `${API.DONATION}/api/v1${p}`, o);
export const publicAuth = (m, p, o) => raw(m, `${API.DONATION}/api/v1${p}`, o);
export const imageUrl = (u) => (u ? (u.startsWith('http') ? u : `${API.FOOD}${u}`) : null);
export const qs = (obj) => {
  const p = Object.entries(obj).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return p.length ? `?${p.join('&')}` : '';
};
export const errText = (e) => {
  const d = e.details ? Object.values(e.details).flat().join(' ') : '';
  return d ? `${e.message} ${d}` : e.message;
};
export const newKey = () => {
  const h = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`;
};
