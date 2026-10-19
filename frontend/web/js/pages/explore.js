(async function () {
  const { $, $$, esc } = ui;
  const list = $('#list'); const pagerEl = $('#pager'); const mapEl = $('#map');
  let page = 1; let view = 'grid'; let geo = null; let map = null; let favs = new Set();
  const params = new URLSearchParams(location.search);
  if (params.get('q')) $('#q').value = params.get('q');

  try { const c = await api.pubFood('/categories'); $('#cat').insertAdjacentHTML('beforeend', c.data.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')); if (params.get('category_id')) $('#cat').value = params.get('category_id'); } catch (_) { /* filter opsional */ }
  favs = await ui.loadFavs();

  function query() {
    const hrs = Number($('#when').value);
    const q = { q: $('#q').value.trim(), category_id: $('#cat').value, sort: $('#sort').value, page, per_page: view === 'map' ? 50 : 9 };
    if (hrs) q.expires_before = new Date(Date.now() + hrs * 3600e3).toISOString().replace(/\.\d+Z$/, 'Z');
    if (geo) { q.lat = geo.lat; q.lng = geo.lng; if ($('#radius').value) q.radius_km = $('#radius').value; }
    if (view === 'map') q.has_coords = 'true';
    return api.qs(q);
  }

  async function ensureLeaflet() {
    if (window.L) return;
    await new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; s.onerror = () => rej(new Error('Layanan peta tidak dapat dimuat.')); document.head.appendChild(s);
    });
  }

  async function load() {
    list.classList.toggle('hidden', view === 'map'); mapEl.classList.toggle('hidden', view !== 'map');
    ui.skeleton(list, 6);
    try {
      const r = await api.pubFood(`/foods${query()}`);
      if (view === 'map') { list.classList.remove('hidden'); await showMap(r.data); ui.pager(pagerEl, null); return; }
      if (!r.data.length) { ui.empty(list, 'search', 'Tidak ada makanan yang cocok', 'Ubah kata kunci atau filter, atau coba lagi nanti.'); ui.pager(pagerEl, null); return; }
      list.innerHTML = `<div class="grid g3 ${view === 'list' ? 'list-view' : ''}" style="${view === 'list' ? 'grid-template-columns:1fr' : ''}">${r.data.map((f) => ui.foodCard(f, { favs: api.session.loggedIn ? favs : null })).join('')}</div>`;
      ui.bindFavs(list, favs);
      ui.pager(pagerEl, r.meta, (p) => { page = p; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    } catch (e) { ui.errorBox(list, e, load); }
  }

  async function showMap(items) {
    list.innerHTML = '';
    try { await ensureLeaflet(); } catch (e) {
      mapEl.classList.add('hidden');
      list.innerHTML = `<div class="alert alert-info">${esc(e.message)} Menampilkan daftar alamat sebagai gantinya.</div>` + items.map((f) => `<p>${ui.icon('pin')} <a href="food-detail.html?id=${f.id}">${esc(f.title)}</a> — ${esc(f.pickup_location)}</p>`).join('');
      return;
    }
    if (!items.length) { mapEl.classList.add('hidden'); ui.empty(list, 'map', 'Belum ada makanan dengan titik lokasi', 'Donatur dapat menambahkan titik peta saat membuat donasi.'); return; }
    if (map) { map.remove(); map = null; }
    map = L.map(mapEl).setView([items[0].latitude, items[0].longitude], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    const pts = items.map((f) => { L.marker([f.latitude, f.longitude]).addTo(map).bindPopup(`<b>${esc(f.title)}</b><br>${f.quantity_available} ${esc(f.unit)}<br><a href="food-detail.html?id=${f.id}">Lihat detail</a>`); return [f.latitude, f.longitude]; });
    if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30] });
    setTimeout(() => map.invalidateSize(), 50);
  }

  $$('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; page = 1; $$('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); }));
  $('#filters').addEventListener('submit', (e) => { e.preventDefault(); page = 1; load(); });
  $('#near').addEventListener('click', () => {
    const msg = $('#geo-msg');
    if (!navigator.geolocation) { msg.textContent = 'Peramban Anda tidak mendukung geolokasi.'; return; }
    msg.textContent = 'Mencari lokasi Anda…';
    navigator.geolocation.getCurrentPosition((p) => {
      geo = { lat: p.coords.latitude.toFixed(5), lng: p.coords.longitude.toFixed(5) }; $('#radius').disabled = false; $('#sort option[value=distance]').disabled = false; $('#sort').value = 'distance';
      msg.textContent = 'Menampilkan makanan terdekat. Hanya makanan yang memiliki titik lokasi yang dapat diurutkan berdasarkan jarak.'; page = 1; load();
    }, () => { msg.textContent = 'Izin lokasi ditolak. Anda tetap dapat mencari berdasarkan nama atau alamat.'; }, { timeout: 8000 });
  });
  load();
})();
