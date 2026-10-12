(function () {
  if (!ui.guard()) return;
  ui.nav('catalog.html');
  const list = document.getElementById('list');
  const pagerEl = document.getElementById('pager');
  let page = 1;

  async function loadCategories() {
    try {
      const r = await api.food('GET', '/categories');
      document.getElementById('cat').insertAdjacentHTML('beforeend', r.data.map((c) => `<option value="${c.id}">${ui.esc(c.name)}</option>`).join(''));
    } catch (_) { /* filter kategori opsional */ }
  }

  async function load() {
    ui.loading(list);
    try {
      const qs = api.qs({ q: document.getElementById('q').value.trim(), category_id: document.getElementById('cat').value,
        sort: document.getElementById('sort').value, page, per_page: 9 });
      const r = await api.food('GET', `/foods${qs}`);
      if (!r.data.length) { ui.empty(list, '🔍', 'Tidak ada makanan', 'Coba ubah kata kunci atau filter.'); pagerEl.innerHTML = ''; return; }
      list.innerHTML = '<div class="row g-4">' + r.data.map((f) => `
        <div class="col-sm-6 col-lg-4"><a class="text-decoration-none text-reset" href="food-detail.html?id=${f.id}"><div class="card-sb food-card">
          <img src="${ui.img(f.image_url)}" alt="${ui.esc(f.title)}" loading="lazy">
          <div class="p-3"><div class="d-flex justify-content-between align-items-start gap-2"><h5 class="mb-1">${ui.esc(f.title)}</h5>${ui.badge(f.status)}</div>
            <div class="small text-muted mb-2">${ui.esc(f.category ? f.category.name : '')}</div>
            <div class="small">📍 ${ui.esc(f.pickup_location)}</div>
            <div class="small">⏰ Layak hingga ${ui.fmtDate(f.expires_at)}</div>
            <div class="mt-2 fw-bold" style="color:var(--green)">${f.quantity_available} ${ui.esc(f.unit)} tersisa</div></div></div></a></div>`).join('') + '</div>';
      ui.pager(pagerEl, r.meta, (p) => { page = p; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    } catch (e) { ui.errorBox(list, e, load); }
  }

  document.getElementById('filters').addEventListener('submit', (e) => { e.preventDefault(); page = 1; load(); });
  loadCategories(); load();
})();
