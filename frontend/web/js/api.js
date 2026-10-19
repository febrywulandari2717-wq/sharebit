// Klien API: Authorization otomatis, refresh token otomatis, error seragam, endpoint publik tanpa login.
(function () {
  const C = window.SHAREBITE;
  const K = { access: 'sb_access', refresh: 'sb_refresh', user: 'sb_user' };

  class ApiError extends Error {
    constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details || null; }
  }

  const store = (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch (_) { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; } })();
  const session = {
    get token() { return store.getItem(K.access); },
    get refreshToken() { return store.getItem(K.refresh); },
    get user() { try { return JSON.parse(store.getItem(K.user)); } catch (_) { return null; } },
    get loggedIn() { return !!(store.getItem(K.access) && this.user); },
    save(d) { store.setItem(K.access, d.access_token); store.setItem(K.refresh, d.refresh_token); store.setItem(K.user, JSON.stringify(d.user)); },
    setUser(u) { store.setItem(K.user, JSON.stringify(u)); },
    clear() { Object.values(K).forEach((k) => store.removeItem(k)); },
  };

  async function raw(method, url, { body, form, token, key } = {}) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (key) headers['Idempotency-Key'] = key;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    let res;
    try { res = await fetch(url, { method, headers, body: payload }); }
    catch (_) { throw new ApiError(0, 'NETWORK', 'Tidak dapat terhubung ke server. Pastikan semua service sudah berjalan.'); }
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
  function doRefresh() {
    if (!session.refreshToken) return Promise.reject(new ApiError(401, 'UNAUTHENTICATED', 'Sesi berakhir.'));
    if (!refreshing) {
      refreshing = raw('POST', `${C.DONATION}/api/v1/auth/refresh`, { body: { refresh_token: session.refreshToken } })
        .then((r) => session.save(r.data)).finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  function toLogin() {
    session.clear();
    const here = location.pathname.split('/').pop() + location.search;
    location.href = `login.html?next=${encodeURIComponent(here)}`;
  }

  async function call(method, url, opts = {}, retried = false) {
    if (!session.token) { toLogin(); throw new ApiError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.'); }
    try { return await raw(method, url, { ...opts, token: session.token }); }
    catch (err) {
      if (err.status === 401 && !retried) {
        try { await doRefresh(); } catch (_) { toLogin(); throw err; }
        return call(method, url, opts, true);
      }
      if (err.status === 401) toLogin();
      throw err;
    }
  }

  const qs = (obj) => {
    const p = new URLSearchParams();
    Object.entries(obj || {}).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined && v !== false) p.set(k, v); });
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const mk = (base, prefix) => (m, p, o) => call(m, `${base}${prefix}${p}`, o);
  const pub = (base, prefix) => (p, o) => raw('GET', `${base}${prefix}${p}`, o);

  window.api = {
    ApiError, session, qs, raw, base: C,
    food: mk(C.FOOD, '/api/v1'), requests: mk(C.REQUEST, '/api/v1'), donation: mk(C.DONATION, '/api/v1'),
    pubFood: pub(C.FOOD, '/api/v1/public'), pubDonation: pub(C.DONATION, '/api/v1/public'),
    login: async (email, password) => { const r = await raw('POST', `${C.DONATION}/api/v1/auth/login`, { body: { email, password } }); session.save(r.data); return r.data.user; },
    logout: async () => { try { if (session.refreshToken) await raw('POST', `${C.DONATION}/api/v1/auth/logout`, { body: { refresh_token: session.refreshToken } }); } catch (_) { /* abaikan */ } session.clear(); },
  };
})();
