// Komponen UI bersama (design system): ikon, toast, modal, skeleton, grafik, kartu makanan, dll.
(function () {
  const ICONS = {
    home: '<path d="M3 11 12 3l9 8M5 10v10h14V10"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', heart: '<path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5M16 11a3 3 0 1 0 0-6M17 14.5c3 .4 5 2 5 5.5"/>',
    leaf: '<path d="M20 4C9 4 4 9 4 16c0 2 .5 3 1 4 1-6 5-9 10-10-4 2-7 5-8 10 8 0 13-5 13-16z"/>', pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m4 12 5 5L20 6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    map: '<path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', package: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4c0 3 1 4 4 4M16 6h4c0 3-1 4-4 4M12 13v4M8 21h8M10 17h4"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', inbox: '<path d="M3 13h5l1 3h6l1-3h5M3 13l3-8h12l3 8v6H3v-6z"/>', history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    tag: '<path d="M3 12V3h9l9 9-9 9-9-9zM7.5 7.5h.01"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    gift: '<rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9M12 8v13M12 8S10 3 7.5 4 8 8 12 8zM12 8s2-5 4.5-4S16 8 12 8z"/>', alert: '<path d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01"/>', navigation: '<path d="m3 11 18-8-8 18-2-8-8-2z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4V8z"/><circle cx="12" cy="13" r="3.5"/>', recycle: '<path d="M7 19H4l3-5M17 5h3l-3 5M12 3 9 8h6l-3-5zM9 16l3 5 3-5H9z"/>',
  };
  const icon = (n, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[n] || ICONS.info}</svg>`;

  const LABEL = {
    pending: 'Menunggu', approved: 'Disetujui', scheduled: 'Dijadwalkan', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan', expired: 'Kedaluwarsa',
    available: 'Tersedia', out_of_stock: 'Habis', closed: 'Ditutup', active: 'Aktif', inactive: 'Nonaktif', open: 'Terbuka', reviewing: 'Ditinjau', resolved: 'Selesai', dismissed: 'Ditolak', draft: 'Draf',
    running: 'Berjalan', upcoming: 'Akan datang', ended: 'Berakhir',
  };
  const ROLE = { donor: 'Donatur', recipient: 'Penerima', admin: 'Admin' };
  const REASON = { spoiled: 'Makanan basi/rusak', misleading: 'Informasi menyesatkan', fraud: 'Penipuan', inappropriate: 'Konten tidak pantas', other: 'Lainnya' };
  const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e6f2e4"/><g fill="none" stroke="#1e5b3a" stroke-width="7" opacity=".35"><circle cx="200" cy="150" r="64"/><circle cx="200" cy="150" r="36"/><path d="M92 92v116M80 92v34a12 12 0 0 0 24 0V92M318 92c-18 14-18 70 0 80v36"/></g></svg>');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
  const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-');
  const relTime = (iso) => {
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'baru saja'; if (s < 3600) return `${Math.floor(s / 60)} menit lalu`; if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
    return s < 604800 ? `${Math.floor(s / 86400)} hari lalu` : fmtDay(iso);
  };
  const badge = (s) => `<span class="badge b-${esc(s)}">${esc(LABEL[s] || s)}</span>`;
  const img = (u) => (u ? (u.startsWith('http') ? u : api.base.FOOD + u) : PH);
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const toIso = (v) => (v ? new Date(v).toISOString().replace(/\.\d+Z$/, 'Z') : null);
  const errText = (e) => { const d = e.details ? Object.values(e.details).flat().join(' ') : ''; return d ? `${e.message} ${d}` : e.message; };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function toast(msg, type = 'ok') {
    let w = $('.toasts'); if (!w) { w = document.createElement('div'); w.className = 'toasts'; w.setAttribute('role', 'status'); w.setAttribute('aria-live', 'polite'); document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg; w.appendChild(t); setTimeout(() => t.remove(), 4500);
  }

  /** Modal umum. Mengembalikan { close, el }. Esc & klik latar menutup. */
  function modal(html, { onClose } = {}) {
    const prev = document.activeElement;
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(ov);
    const close = (v) => { ov.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); if (onClose) onClose(v); };
    const key = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', key);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(null); });
    const f = $('input,textarea,select,button', ov); if (f) f.focus();
    return { el: $('.modal', ov), close };
  }

  /** Dialog konfirmasi. reason:{label,min} meminta alasan. Resolve {reason} atau null. */
  function confirm({ title, message = '', confirmText = 'Ya, lanjutkan', danger = false, reason = null }) {
    return new Promise((resolve) => {
      const m = modal(`<h3>${esc(title)}</h3><p class="muted">${esc(message)}</p>
        ${reason ? `<div class="field"><label for="cf-reason">${esc(reason.label)}</label><textarea id="cf-reason" class="input" maxlength="255"></textarea><div class="err" id="cf-err"></div></div>` : ''}
        <div class="actions"><button class="btn btn-ghost" data-x>Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText)}</button></div>`, { onClose: (v) => resolve(v || null) });
      $('[data-x]', m.el).onclick = () => m.close(null);
      $('[data-ok]', m.el).onclick = () => {
        let r = '';
        if (reason) { r = $('#cf-reason', m.el).value.trim(); if (r.length < (reason.min || 1)) { $('#cf-err', m.el).textContent = `Minimal ${reason.min || 1} karakter.`; return; } }
        m.close({ reason: r });
      };
    });
  }

  const skeleton = (el, n = 6, kind = 'card') => { el.innerHTML = `<div class="grid g3" aria-busy="true" aria-label="Memuat">${Array.from({ length: n }, () => `<div class="skel ${kind === 'card' ? 'skel-card' : ''}" style="${kind === 'row' ? 'height:64px' : ''}"></div>`).join('')}</div>`; };
  const empty = (el, ic, title, text = '', action = '') => { el.innerHTML = `<div class="empty"><div class="ic">${icon(ic)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`; };
  const errorBox = (el, err, retry) => {
    el.innerHTML = `<div class="empty"><div class="ic" style="background:var(--danger-l);color:var(--danger)">${icon('alert')}</div><h3>Terjadi kesalahan</h3><p>${esc(err.message)}</p>${retry ? '<button class="btn btn-secondary" id="retry">Coba lagi</button>' : ''}</div>`;
    if (retry) $('#retry', el).onclick = retry;
  };
  function fieldErrors(form, details) {
    $$('.invalid', form).forEach((e) => { e.classList.remove('invalid'); e.removeAttribute('aria-invalid'); }); $$('.err.js', form).forEach((e) => e.remove());
    Object.entries(details || {}).forEach(([k, msgs]) => {
      const input = form.querySelector(`[name="${k}"]`); if (!input) return;
      input.classList.add('invalid'); input.setAttribute('aria-invalid', 'true');
      const d = document.createElement('div'); d.className = 'err js'; d.textContent = [].concat(msgs).join(' '); input.insertAdjacentElement('afterend', d);
    });
  }
  async function busy(btn, fn) { const old = btn.innerHTML; btn.disabled = true; btn.textContent = 'Memproses…'; try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; } }
  function pager(el, meta, onPage) {
    if (!meta || meta.total_pages <= 1) { el.innerHTML = ''; return; }
    el.innerHTML = `<nav class="pager" aria-label="Halaman"><button class="btn btn-secondary btn-sm" ${meta.page <= 1 ? 'disabled' : ''} data-p="${meta.page - 1}">‹ Sebelumnya</button><span class="muted">Halaman ${meta.page} dari ${meta.total_pages} · ${meta.total} data</span><button class="btn btn-secondary btn-sm" ${meta.page >= meta.total_pages ? 'disabled' : ''} data-p="${meta.page + 1}">Berikutnya ›</button></nav>`;
    $$('button[data-p]', el).forEach((b) => { b.onclick = () => onPage(Number(b.dataset.p)); });
  }
  function tabs(el, items, onSelect, initial) {
    el.setAttribute('role', 'tablist'); el.className = 'tabs';
    el.innerHTML = items.map(([id, label]) => `<button role="tab" data-t="${id}" aria-selected="${id === (initial || items[0][0])}">${esc(label)}</button>`).join('');
    const sel = (id) => { $$('button', el).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === id))); onSelect(id); };
    $$('button', el).forEach((b) => { b.onclick = () => sel(b.dataset.t); });
    sel(initial || items[0][0]);
  }

  /** Grafik SVG sederhana: bar atau garis, dengan label sumbu, satuan, periode, dan sumber. */
  function chart(el, { series, key, labelKey = 'date', title, unit, source, type = 'bar', color = '#1e5b3a' }) {
    const W = 640, H = 220, L = 38, B = 28, T = 14, R = 10, n = series.length;
    const max = Math.max(1, ...series.map((s) => s[key])); const nice = Math.max(1, Math.ceil(max / 4) * 4);
    const x = (i) => L + ((W - L - R) * (i + 0.5)) / n; const y = (v) => T + (H - T - B) * (1 - v / nice);
    const ticks = [0, 1, 2, 3, 4].map((i) => (nice * i) / 4);
    let body = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="#e2dccb"/><text x="${L - 6}" y="${y(t) + 4}" font-size="11" text-anchor="end" fill="#56665c">${Math.round(t)}</text>`).join('');
    if (type === 'bar') { const bw = Math.max(3, ((W - L - R) / n) * 0.62); body += series.map((s, i) => `<rect x="${x(i) - bw / 2}" y="${y(s[key])}" width="${bw}" height="${Math.max(0, H - B - y(s[key]))}" rx="3" fill="${color}"><title>${esc(s[labelKey])}: ${s[key]} ${esc(unit)}</title></rect>`).join(''); }
    else { body += `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${series.map((s, i) => `${x(i)},${y(s[key])}`).join(' ')}"/>` + series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s[key])}" r="3.5" fill="${color}"><title>${esc(s[labelKey])}: ${s[key]} ${esc(unit)}</title></circle>`).join(''); }
    const step = Math.ceil(n / 7);
    body += series.map((s, i) => (i % step === 0 ? `<text x="${x(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#56665c">${esc(String(s[labelKey]).slice(5))}</text>` : '')).join('');
    const total = series.reduce((a, s) => a + s[key], 0);
    el.innerHTML = `<div class="card chart"><h4>${esc(title)}</h4><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}: total ${total} ${esc(unit)}">${body}</svg><div class="cap">Satuan: ${esc(unit)} · Periode: ${esc(series[0][labelKey])} s.d. ${esc(series[n - 1][labelKey])} · Sumber: ${esc(source)}</div></div>`;
  }

  /** Kartu makanan. opts: favs (Set id), canFav */
  function foodCard(f, { favs = null } = {}) {
    const isNew = Date.now() - new Date(f.created_at || 0).getTime() < 86400000 * 2;
    const dist = f.distance_km != null ? ` · ${f.distance_km} km` : '';
    return `<article class="card food-card" data-id="${f.id}">
      <a class="card-link" href="food-detail.html?id=${f.id}" aria-label="Lihat ${esc(f.title)}"></a>
      <img class="ph" src="${img(f.image_url)}" alt="${esc(f.title)}" loading="lazy">
      ${favs ? `<button class="fav-btn" data-fav="${f.id}" data-title="${esc(f.title)}" aria-pressed="${favs.has(f.id)}" aria-label="Favorit ${esc(f.title)}">${icon('heart')}</button>` : ''}
      <div class="body"><div class="row between"><h3>${esc(f.title)}</h3></div>
        <div class="row">${badge(f.status)} ${isNew ? '<span class="badge b-new">Baru</span>' : ''}<span class="muted small">${esc(f.category ? f.category.name : '')}</span></div>
        <div class="meta">${icon('pin')} <span>${esc(f.pickup_location)}${dist}</span></div>
        <div class="meta">${icon('clock')} <span>Layak hingga ${fmtDate(f.expires_at)}</span></div>
        <div class="stock">${f.quantity_available} ${esc(f.unit)} tersisa</div></div></article>`;
  }

  /** Pasang perilaku tombol favorit pada container (butuh login). */
  function bindFavs(root, favs) {
    $$('[data-fav]', root).forEach((b) => b.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!api.session.loggedIn) { location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`; return; }
      const id = Number(b.dataset.fav); const on = b.getAttribute('aria-pressed') === 'true';
      try {
        if (on) { await api.donation('DELETE', `/favorites/${id}`); favs.delete(id); } else { await api.donation('POST', '/favorites', { body: { food_id: id, food_title: b.dataset.title } }); favs.add(id); }
        b.setAttribute('aria-pressed', String(!on)); toast(on ? 'Dihapus dari favorit.' : 'Ditambahkan ke favorit.');
      } catch (er) { toast(errText(er), 'err'); }
    }));
  }
  async function loadFavs() { if (!api.session.loggedIn) return new Set(); try { return new Set((await api.donation('GET', '/favorites/ids')).data); } catch (_) { return new Set(); } }

  // ilustrasi hero (SVG, tanpa foto berhak cipta)
  const HERO_ART = '<svg class="art" viewBox="0 0 400 360" role="img" aria-label="Ilustrasi berbagi makanan"><circle cx="200" cy="190" r="150" fill="#ffffff" opacity=".1"/><circle cx="200" cy="190" r="108" fill="#fdfbf5"/><circle cx="200" cy="190" r="82" fill="none" stroke="#1e5b3a" stroke-width="4" opacity=".25"/><path d="M150 205c10-40 40-62 80-58 10 26-2 54-30 70-20 12-40 6-50-12z" fill="#4c9a53"/><path d="M215 150c20 8 34 22 38 44" stroke="#144229" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="262" cy="136" r="22" fill="#c85a12"/><path d="M262 114c4-12 14-16 22-14-2 10-8 16-22 14z" fill="#4c9a53"/><path d="M60 300c30-60 60-40 90-70M340 300c-30-60-60-40-90-70" stroke="#ffd29e" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/><path d="M92 80c8-14 22-14 30 0s22 14 30 0" stroke="#ffd29e" stroke-width="5" fill="none" stroke-linecap="round"/></svg>';

  window.ui = { icon, esc, $, $$, fmtDate, fmtDay, relTime, badge, img, toLocalInput, toIso, errText, toast, modal, confirm, skeleton, empty, errorBox, fieldErrors, busy, pager, tabs, chart, foodCard, bindFavs, loadFavs, LABEL, ROLE, REASON, HERO_ART, PH };
})();
