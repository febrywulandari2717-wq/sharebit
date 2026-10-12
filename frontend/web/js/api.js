// Pembungkus fetch: header Authorization, refresh token otomatis, dan penanganan error seragam.
(function () {
  const C = window.SHAREBITE;
  const K = { access: 'sb_access', refresh: 'sb_refresh', user: 'sb_user' };

  class ApiError extends Error {
    constructor(status, code, message, details) {
      super(message);
      this.status = status; this.code = code; this.details = details || null;
    }
  }

  const session = {
    get token() { return localStorage.getItem(K.access); },
    get refreshToken() { return localStorage.getItem(K.refresh); },
    get user() { try { return JSON.parse(localStorage.getItem(K.user)); } catch (_) { return null; } },
    save(d) {
      localStorage.setItem(K.access, d.access_token);
      localStorage.setItem(K.refresh, d.refresh_token);
      localStorage.setItem(K.user, JSON.stringify(d.user));
    },
    setUser(u) { localStorage.setItem(K.user, JSON.stringify(u)); },
    clear() { Object.values(K).forEach((k) => localStorage.removeItem(k)); },
  };

  let refreshing = null;
  async function doRefresh() {
    if (!session.refreshToken) throw new ApiError(401, 'UNAUTHENTICATED', 'Sesi berakhir.');
    if (!refreshing) {
      refreshing = (async () => {
        const res = await raw('POST', `${C.DONATION}/api/v1/auth/refresh`, { body: { refresh_token: session.refreshToken } });
        session.save(res.data);
      })().finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  async function raw(method, url, { body, form, token, key } = {}) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (key) headers['Idempotency-Key'] = key;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    let res;
    try {
      res = await fetch(url, { method, headers, body: payload });
    } catch (_) {
      throw new ApiError(0, 'NETWORK', 'Tidak dapat terhubung ke server. Pastikan semua service sudah berjalan.');
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

  async function call(method, url, opts = {}, retried = false) {
    try {
      return await raw(method, url, { ...opts, token: session.token });
    } catch (err) {
      if (err.status === 401 && !retried && session.refreshToken && !url.includes('/auth/')) {
        try { await doRefresh(); } catch (_) { session.clear(); location.href = 'login.html'; throw err; }
        return call(method, url, opts, true);
      }
      if (err.status === 401 && !url.includes('/auth/login')) { session.clear(); location.href = 'login.html'; }
      throw err;
    }
  }

  const food = (m, p, o) => call(m, `${C.FOOD}/api/v1${p}`, o);
  const requests = (m, p, o) => call(m, `${C.REQUEST}/api/v1${p}`, o);
  const donation = (m, p, o) => call(m, `${C.DONATION}/api/v1${p}`, o);
  const qs = (obj) => {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) p.set(k, v); });
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  window.api = { ApiError, session, food, requests, donation, qs, raw, base: C };
})();
