(function () {
  const user = ui.guard(['donor']);
  if (!user) return;
  ui.nav('dashboard-donor.html');
  const $ = (id) => document.getElementById(id);
  let categories = [];
  let editing = null;
  let foodsPage = 1, reqsPage = 1;
  const names = {};
  const nameOf = async (id) => {
    if (!names[id]) { try { names[id] = (await api.donation('GET', `/users/${id}/public`)).data.name; } catch (_) { names[id] = `Pengguna #${id}`; } }
    return names[id];
  };

  // ---- tab
  document.querySelectorAll('#tabs [data-tab]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#tabs .nav-link').forEach((x) => x.classList.toggle('active', x === b));
    ['foods', 'reqs'].forEach((t) => $(`tab-${t}`).classList.toggle('d-none', t !== b.dataset.tab));
  }));

  // ---- statistik
  async function loadStats() {
    try {
      const [f, p, d] = await Promise.all([
        api.food('GET', '/foods?mine=true&per_page=1'),
        api.requests('GET', '/requests?status=pending&per_page=1'),
        api.donation('GET', '/donations/stats'),
      ]);
      const card = (n, l) => `<div class="col-6 col-md-3"><div class="card-sb stat"><div class="n">${n}</div><div class="l">${l}</div></div></div>`;
      $('stats').innerHTML = card(f.meta.total, 'Makanan dibagikan') + card(p.meta.total, 'Menunggu keputusan') +
        card(d.data.by_status.scheduled || 0, 'Pengambilan terjadwal') + card(d.data.total_portions_delivered, 'Porsi tersalurkan');
    } catch (_) { $('stats').innerHTML = ''; }
  }

  // ---- makanan
  async function loadFoods() {
    const el = $('foods'); ui.loading(el);
    try {
      const r = await api.food('GET', `/foods?mine=true&page=${foodsPage}&per_page=8`);
      if (!r.data.length) { ui.empty(el, '🍱', 'Belum ada makanan', 'Klik "Bagikan makanan" untuk mulai.'); $('foodsPager').innerHTML = ''; return; }
      el.innerHTML = `<div class="table-responsive card-sb"><table class="table table-sb mb-0"><thead><tr><th>Makanan</th><th>Stok</th><th>Layak hingga</th><th>Status</th><th></th></tr></thead><tbody>` +
        r.data.map((f) => `<tr><td><div class="d-flex align-items-center gap-2"><img src="${ui.img(f.image_url)}" width="46" height="46" class="rounded" style="object-fit:cover" alt="">
          <div><div class="fw-bold">${ui.esc(f.title)}</div><div class="small text-muted">${ui.esc(f.category ? f.category.name : '')}</div></div></div></td>
          <td>${f.quantity_available}/${f.quantity_total} ${ui.esc(f.unit)}</td><td>${ui.fmtDate(f.expires_at)}</td><td>${ui.badge(f.status)}</td>
          <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-green" data-a="edit" data-id="${f.id}">Ubah</button>
          <button class="btn btn-sm btn-outline-green" data-a="toggle" data-id="${f.id}" data-s="${f.status}">${f.status === 'closed' ? 'Buka' : 'Tutup'}</button>
          <button class="btn btn-sm btn-outline-danger" data-a="del" data-id="${f.id}">Hapus</button></td></tr>`).join('') + '</tbody></table></div>';
      const byId = Object.fromEntries(r.data.map((f) => [f.id, f]));
      el.querySelectorAll('button[data-a]').forEach((b) => b.addEventListener('click', () => foodAction(b.dataset.a, byId[b.dataset.id])));
      ui.pager($('foodsPager'), r.meta, (p) => { foodsPage = p; loadFoods(); });
    } catch (e) { ui.errorBox(el, e, loadFoods); }
  }

  async function foodAction(a, f) {
    try {
      if (a === 'edit') return openForm(f);
      if (a === 'toggle') { await api.food('PATCH', `/foods/${f.id}`, { body: { status: f.status === 'closed' ? 'available' : 'closed' } }); ui.toast('Status diperbarui.'); }
      if (a === 'del') { if (!confirm(`Hapus "${f.title}"?`)) return; await api.food('DELETE', `/foods/${f.id}`); ui.toast('Makanan dihapus.'); }
      loadFoods(); loadStats();
    } catch (e) { ui.toast(ui.errText(e), 'err'); }
  }

  const modal = () => bootstrap.Modal.getOrCreateInstance($('foodModal'));
  const form = $('foodForm');
  function openForm(f) {
    editing = f || null;
    form.reset(); ui.fieldErrors(form, {});
    $('foodTitle').textContent = f ? 'Ubah makanan' : 'Bagikan makanan';
    form.category_id.innerHTML = categories.map((c) => `<option value="${c.id}">${ui.esc(c.name)}</option>`).join('');
    if (f) {
      ['title', 'description', 'quantity_total', 'unit', 'max_per_request', 'pickup_location', 'allergens', 'storage_info'].forEach((k) => { form[k].value = f[k] ?? ''; });
      form.category_id.value = f.category ? f.category.id : '';
      ['pickup_start', 'pickup_end', 'expires_at'].forEach((k) => { form[k].value = ui.toLocalInput(f[k]); });
    } else {
      const t = new Date(Date.now() + 3600e3); form.pickup_start.value = ui.toLocalInput(t);
      form.pickup_end.value = ui.toLocalInput(new Date(t.getTime() + 2 * 3600e3));
      form.expires_at.value = ui.toLocalInput(new Date(t.getTime() + 4 * 3600e3));
    }
    modal().show();
  }
  $('addFood').addEventListener('click', () => openForm(null));

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); ui.fieldErrors(form, {});
    const d = Object.fromEntries(new FormData(form));
    const file = form.image.files[0];
    if (file && file.size > 2 * 1024 * 1024) { ui.fieldErrors(form, { image: ['Ukuran foto maksimal 2 MB.'] }); return; }
    const body = {
      title: d.title, description: d.description || null, category_id: Number(d.category_id), quantity_total: Number(d.quantity_total),
      unit: d.unit || 'porsi', pickup_location: d.pickup_location, pickup_start: ui.toIso(d.pickup_start), pickup_end: ui.toIso(d.pickup_end),
      expires_at: ui.toIso(d.expires_at), allergens: d.allergens || null, storage_info: d.storage_info || null,
    };
    if (d.max_per_request) body.max_per_request = Number(d.max_per_request); else if (editing) body.max_per_request = null;
    try {
      await ui.busy(form.querySelector('button[type=submit]'), async () => {
        const saved = editing ? await api.food('PATCH', `/foods/${editing.id}`, { body }) : await api.food('POST', '/foods', { body });
        if (file) {
          const fd = new FormData(); fd.append('image', file);
          try { await api.food('POST', `/foods/${saved.data.id}/image`, { form: fd }); } catch (ie) { ui.toast(`Makanan tersimpan, tetapi foto gagal: ${ie.message}`, 'err'); }
        }
      });
      modal().hide(); ui.toast('Makanan tersimpan.'); loadFoods(); loadStats();
    } catch (err) {
      if (err.status === 422) ui.fieldErrors(form, err.details);
      ui.toast(ui.errText(err), 'err');
    }
  });

  // ---- permintaan masuk
  async function loadReqs() {
    const el = $('reqs'); ui.loading(el);
    try {
      const r = await api.requests('GET', `/requests${api.qs({ status: $('reqStatus').value, page: reqsPage, per_page: 8 })}`);
      if (!r.data.length) { ui.empty(el, '📭', 'Belum ada permintaan', 'Permintaan dari penerima akan muncul di sini.'); $('reqsPager').innerHTML = ''; return; }
      const rn = await Promise.all(r.data.map((x) => nameOf(x.recipient_id)));
      el.innerHTML = `<div class="table-responsive card-sb"><table class="table table-sb mb-0"><thead><tr><th>Makanan</th><th>Penerima</th><th>Jumlah</th><th>Catatan</th><th>Status</th><th></th></tr></thead><tbody>` +
        r.data.map((x, i) => `<tr><td class="fw-bold">${ui.esc(x.food_title)}<div class="small text-muted fw-normal">${ui.fmtDate(x.created_at)}</div></td><td>${ui.esc(rn[i])}</td><td>${x.quantity}</td>
          <td class="small">${ui.esc(x.note || '-')}${x.rejection_reason ? `<div class="text-danger">Ditolak: ${ui.esc(x.rejection_reason)}</div>` : ''}</td><td>${ui.badge(x.status)}</td>
          <td class="text-end text-nowrap">${x.status === 'pending' ? `<button class="btn btn-sm btn-green" data-a="approve" data-id="${x.id}">Setujui</button> <button class="btn btn-sm btn-outline-danger" data-a="reject" data-id="${x.id}">Tolak</button>` : ''}
          ${x.status === 'approved' ? `<button class="btn btn-sm btn-terra" data-a="schedule" data-id="${x.id}">Jadwalkan</button> <button class="btn btn-sm btn-outline-danger" data-a="cancel" data-id="${x.id}">Batalkan</button>` : ''}
          ${x.status === 'scheduled' ? '<a class="btn btn-sm btn-outline-green" href="donations.html">Lihat donasi</a>' : ''}</td></tr>`).join('') + '</tbody></table></div>';
      el.querySelectorAll('button[data-a]').forEach((b) => b.addEventListener('click', () => reqAction(b.dataset.a, r.data.find((x) => x.id === b.dataset.id))));
      ui.pager($('reqsPager'), r.meta, (p) => { reqsPage = p; loadReqs(); });
    } catch (e) { ui.errorBox(el, e, loadReqs); }
  }

  let schedReq = null;
  async function reqAction(a, req) {
    try {
      if (a === 'approve') { await api.requests('POST', `/requests/${req.id}/approve`); ui.toast('Permintaan disetujui. Silakan jadwalkan pengambilan.'); }
      if (a === 'reject') {
        const reason = prompt('Alasan penolakan (min. 3 karakter):'); if (reason === null) return;
        await api.requests('POST', `/requests/${req.id}/reject`, { body: { reason } }); ui.toast('Permintaan ditolak.');
      }
      if (a === 'cancel') {
        const reason = prompt('Alasan pembatalan:'); if (reason === null) return;
        await api.requests('POST', `/requests/${req.id}/cancel`, { body: { reason } }); ui.toast('Permintaan dibatalkan.');
      }
      if (a === 'schedule') {
        schedReq = req; const f = $('schedForm'); f.reset(); ui.fieldErrors(f, {});
        try { const fd = (await api.food('GET', `/foods/${req.food_id}`)).data; f.pickup_location.value = fd.pickup_location; f.pickup_time.value = ui.toLocalInput(fd.pickup_start); } catch (_) { /* isi manual */ }
        bootstrap.Modal.getOrCreateInstance($('schedModal')).show(); return;
      }
      loadReqs(); loadStats();
    } catch (e) { ui.toast(ui.errText(e), 'err'); loadReqs(); }
  }

  $('schedForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; ui.fieldErrors(f, {});
    const d = Object.fromEntries(new FormData(f));
    try {
      await ui.busy(f.querySelector('button[type=submit]'), () => api.donation('POST', '/donations', { body: {
        request_id: schedReq.id, pickup_time: ui.toIso(d.pickup_time), pickup_location: d.pickup_location, instructions: d.instructions || null } }));
      bootstrap.Modal.getOrCreateInstance($('schedModal')).hide(); ui.toast('Pengambilan dijadwalkan.'); loadReqs(); loadStats();
    } catch (err) { if (err.status === 422) ui.fieldErrors(f, err.details); ui.toast(ui.errText(err), 'err'); }
  });
  $('reqStatus').addEventListener('change', () => { reqsPage = 1; loadReqs(); });

  (async () => {
    try { categories = (await api.food('GET', '/categories')).data; } catch (_) { /* dicoba lagi saat membuka form */ }
    loadStats(); loadFoods(); loadReqs();
  })();
})();
