(function () {
  const user = ui.guard(['admin']);
  if (!user) return;
  ui.nav('dashboard-admin.html');
  const $ = (id) => document.getElementById(id);
  const pages = { users: 1, foods: 1, reqs: 1, dons: 1 };
  const loaders = {};

  document.querySelectorAll('#tabs [data-tab]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#tabs .nav-link').forEach((x) => x.classList.toggle('active', x === b));
    Object.keys(pages).forEach((t) => $(`tab-${t}`).classList.toggle('d-none', t !== b.dataset.tab));
    loaders[b.dataset.tab]();
  }));

  const table = (heads, rows) => `<div class="table-responsive card-sb"><table class="table table-sb mb-0"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  async function view(key, elId, pagerId, fetcher, render) {
    const el = $(elId); ui.loading(el);
    try {
      const r = await fetcher(pages[key]);
      if (!r.data.length) { ui.empty(el, '📄', 'Tidak ada data'); $(pagerId).innerHTML = ''; return; }
      el.innerHTML = render(r.data);
      ui.pager($(pagerId), r.meta, (p) => { pages[key] = p; loaders[key](); });
      return r.data;
    } catch (e) { ui.errorBox(el, e, loaders[key]); }
  }

  async function stats() {
    const card = (n, l) => `<div class="col-6 col-md-3"><div class="card-sb stat"><div class="n">${n}</div><div class="l">${l}</div></div></div>`;
    const [u, f, r, d] = await Promise.allSettled([
      api.donation('GET', '/users?per_page=1'), api.food('GET', '/foods/stats'), api.requests('GET', '/requests/stats'), api.donation('GET', '/donations/stats'),
    ]);
    const v = (x, fn) => (x.status === 'fulfilled' ? fn(x.value) : '–');
    $('stats').innerHTML = card(v(u, (x) => x.meta.total), 'Pengguna') + card(v(f, (x) => x.data.total), 'Makanan') +
      card(v(f, (x) => x.data.total_available_stock), 'Stok tersedia') + card(v(r, (x) => x.data.total), 'Permintaan') +
      card(v(r, (x) => x.data.by_status.pending || 0), 'Permintaan menunggu') + card(v(d, (x) => x.data.total), 'Donasi') +
      card(v(d, (x) => x.data.by_status.completed || 0), 'Donasi selesai') + card(v(d, (x) => x.data.total_portions_delivered), 'Porsi tersalurkan');
  }

  loaders.users = async () => {
    const data = await view('users', 'users', 'usersPager',
      (p) => api.donation('GET', `/users${api.qs({ q: $('uq').value.trim(), role: $('urole').value, page: p, per_page: 10 })}`),
      (rows) => table(['ID', 'Nama', 'Email', 'Peran', 'Status', ''], rows.map((x) => `<tr><td>${x.id}</td><td>${ui.esc(x.name)}</td><td>${ui.esc(x.email)}</td><td>${ui.esc(ui.ROLE[x.role])}</td>
        <td>${ui.badge(x.is_active ? 'active' : 'inactive')}</td><td class="text-end">${x.id === user.id ? '' : `<button class="btn btn-sm ${x.is_active ? 'btn-outline-danger' : 'btn-outline-green'}" data-id="${x.id}" data-on="${x.is_active ? 0 : 1}">${x.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>`}</td></tr>`)));
    if (data) $('users').querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', async () => {
      try { await api.donation('PATCH', `/users/${b.dataset.id}`, { body: { is_active: b.dataset.on === '1' } }); ui.toast('Status pengguna diperbarui.'); loaders.users(); }
      catch (e) { ui.toast(ui.errText(e), 'err'); }
    }));
  };
  loaders.foods = async () => {
    const data = await view('foods', 'foods', 'foodsPager', (p) => api.food('GET', `/foods?all=true&page=${p}&per_page=10`),
      (rows) => table(['Makanan', 'Donor', 'Stok', 'Layak hingga', 'Status', ''], rows.map((f) => `<tr><td class="fw-bold">${ui.esc(f.title)}</td><td>#${f.donor_id}</td><td>${f.quantity_available}/${f.quantity_total}</td>
        <td>${ui.fmtDate(f.expires_at)}</td><td>${ui.badge(f.status)}</td><td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-green" data-a="toggle" data-id="${f.id}" data-s="${f.status}">${f.status === 'closed' ? 'Buka' : 'Tutup'}</button>
        <button class="btn btn-sm btn-outline-danger" data-a="del" data-id="${f.id}">Hapus</button></td></tr>`)));
    if (data) $('foods').querySelectorAll('button[data-a]').forEach((b) => b.addEventListener('click', async () => {
      try {
        if (b.dataset.a === 'del') { if (!confirm('Hapus makanan ini?')) return; await api.food('DELETE', `/foods/${b.dataset.id}`); }
        else await api.food('PATCH', `/foods/${b.dataset.id}`, { body: { status: b.dataset.s === 'closed' ? 'available' : 'closed' } });
        ui.toast('Berhasil.'); loaders.foods(); stats();
      } catch (e) { ui.toast(ui.errText(e), 'err'); }
    }));
  };
  loaders.reqs = () => view('reqs', 'reqs', 'reqsPager', (p) => api.requests('GET', `/requests?page=${p}&per_page=10`),
    (rows) => table(['Makanan', 'Donor', 'Penerima', 'Jumlah', 'Status', 'Diajukan'], rows.map((x) => `<tr><td class="fw-bold">${ui.esc(x.food_title)}</td><td>#${x.donor_id}</td><td>#${x.recipient_id}</td><td>${x.quantity}</td><td>${ui.badge(x.status)}</td><td>${ui.fmtDate(x.created_at)}</td></tr>`)));
  loaders.dons = () => view('dons', 'dons', 'donsPager', (p) => api.donation('GET', `/donations?page=${p}&per_page=10`),
    (rows) => table(['Makanan', 'Donor', 'Penerima', 'Jumlah', 'Pengambilan', 'Status'], rows.map((d) => `<tr><td>#${d.food_id}</td><td>#${d.donor_id}</td><td>#${d.recipient_id}</td><td>${d.quantity}</td><td>${ui.fmtDate(d.pickup_time)}</td><td>${ui.badge(d.status)}</td></tr>`)));

  let t; const debounced = () => { clearTimeout(t); t = setTimeout(() => { pages.users = 1; loaders.users(); }, 300); };
  $('uq').addEventListener('input', debounced); $('urole').addEventListener('change', debounced);
  stats(); loaders.users();
})();
