// Komponen UI bersama: navbar, toast, format, guard halaman.
(function () {
  const LABEL = {
    pending: 'Menunggu', approved: 'Disetujui', scheduled: 'Dijadwalkan', completed: 'Selesai', rejected: 'Ditolak',
    cancelled: 'Dibatalkan', expired: 'Kedaluwarsa', available: 'Tersedia', out_of_stock: 'Habis', closed: 'Ditutup',
    active: 'Aktif', inactive: 'Nonaktif',
  };
  const ROLE = { donor: 'Donor', recipient: 'Penerima', admin: 'Admin' };
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e3eee6"/><circle cx="200" cy="150" r="62" fill="none" stroke="#24503a" stroke-width="8" opacity=".35"/><circle cx="200" cy="150" r="34" fill="none" stroke="#24503a" stroke-width="6" opacity=".35"/></svg>');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
  const badge = (s) => `<span class="badge-st st-${esc(s)}">${esc(LABEL[s] || s)}</span>`;
  const img = (url) => (url ? (url.startsWith('http') ? url : api.base.FOOD + url) : PLACEHOLDER);
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso); const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const toIso = (local) => (local ? new Date(local).toISOString().replace(/\.\d+Z$/, 'Z') : null);

  function toast(msg, type = 'ok') {
    let w = document.querySelector('.toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
    const t = document.createElement('div');
    t.className = `toast-sb ${type}`; t.textContent = msg; w.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }

  const loading = (el) => { el.innerHTML = '<div class="spinner-sb" role="status" aria-label="Memuat"></div>'; };
  const empty = (el, icon, title, text = '') => {
    el.innerHTML = `<div class="empty"><div class="big">${icon}</div><h5>${esc(title)}</h5><p>${esc(text)}</p></div>`;
  };
  const errorBox = (el, err, retry) => {
    el.innerHTML = `<div class="empty"><div class="big">⚠️</div><h5>Terjadi kesalahan</h5><p>${esc(err.message)}</p>${retry ? '<button class="btn btn-outline-green btn-sm" id="retry">Coba lagi</button>' : ''}</div>`;
    if (retry) el.querySelector('#retry').onclick = retry;
  };
  const errText = (err) => {
    const d = err.details ? Object.values(err.details).flat().join(' ') : '';
    return d ? `${err.message} ${d}` : err.message;
  };
  function fieldErrors(form, details) {
    form.querySelectorAll('.is-invalid').forEach((e) => e.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback.js').forEach((e) => e.remove());
    Object.entries(details || {}).forEach(([k, msgs]) => {
      const input = form.querySelector(`[name="${k}"]`);
      if (!input) return;
      input.classList.add('is-invalid');
      const f = document.createElement('div'); f.className = 'invalid-feedback js'; f.textContent = [].concat(msgs).join(' ');
      input.insertAdjacentElement('afterend', f);
    });
  }
  async function busy(btn, fn) {
    const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memproses...';
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
  }

  function nav(active) {
    const u = api.session.user;
    const links = [['index.html', 'Beranda'], ['catalog.html', 'Katalog']];
    if (u) {
      if (u.role === 'donor') links.push(['dashboard-donor.html', 'Dashboard Donor']);
      if (u.role === 'recipient') links.push(['dashboard-recipient.html', 'Permintaan Saya']);
      if (u.role === 'admin') links.push(['dashboard-admin.html', 'Dashboard Admin']);
      if (u.role !== 'admin') links.push(['donations.html', 'Donasi']);
    }
    const right = u
      ? `<a class="btn btn-outline-green btn-sm me-2" href="profile.html">${esc(u.name)} · ${esc(ROLE[u.role])}</a><button id="logout" class="btn btn-sm btn-terra">Keluar</button>`
      : '<a class="btn btn-outline-green btn-sm me-2" href="login.html">Masuk</a><a class="btn btn-sm btn-terra" href="register.html">Daftar</a>';
    document.getElementById('nav').innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-sb"><div class="container">
        <a class="brand navbar-brand" href="index.html">Share<span>Bite</span></a>
        <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nv" aria-label="Menu"><span class="navbar-toggler-icon"></span></button>
        <div class="collapse navbar-collapse" id="nv">
          <ul class="navbar-nav me-auto">${links.map(([h, t]) => `<li class="nav-item"><a class="nav-link ${h === active ? 'active' : ''}" href="${h}">${t}</a></li>`).join('')}</ul>
          <div class="d-flex align-items-center py-2 py-lg-0">${right}</div>
        </div></div></nav>`;
    const lo = document.getElementById('logout');
    if (lo) lo.onclick = logout;
  }

  async function logout() {
    const rt = api.session.refreshToken;
    try { if (rt) await api.raw('POST', `${api.base.DONATION}/api/v1/auth/logout`, { body: { refresh_token: rt } }); } catch (_) { /* abaikan */ }
    api.session.clear(); location.href = 'login.html';
  }

  /** Wajib login (dan role tertentu). Mengembalikan user atau null (sambil mengalihkan). */
  function guard(roles) {
    const u = api.session.user;
    if (!u || !api.session.token) { location.href = 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); return null; }
    if (roles && !roles.includes(u.role)) { location.href = 'index.html'; return null; }
    return u;
  }

  const home = (u) => ({ donor: 'dashboard-donor.html', recipient: 'catalog.html', admin: 'dashboard-admin.html' }[u.role]);

  function pager(el, meta, onPage) {
    if (!meta || meta.total_pages <= 1) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="d-flex justify-content-center align-items-center gap-3 mt-3">
      <button class="btn btn-outline-green btn-sm" ${meta.page <= 1 ? 'disabled' : ''} data-p="${meta.page - 1}">‹ Sebelumnya</button>
      <span class="text-muted">Halaman ${meta.page} dari ${meta.total_pages}</span>
      <button class="btn btn-outline-green btn-sm" ${meta.page >= meta.total_pages ? 'disabled' : ''} data-p="${meta.page + 1}">Berikutnya ›</button></div>`;
    el.querySelectorAll('button[data-p]').forEach((b) => { b.onclick = () => onPage(Number(b.dataset.p)); });
  }

  window.ui = { esc, fmtDate, badge, img, toLocalInput, toIso, toast, loading, empty, errorBox, errText, fieldErrors, busy, nav, guard, home, pager, logout, LABEL, ROLE };
})();
