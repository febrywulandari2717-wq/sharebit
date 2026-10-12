(function () {
  const user = ui.guard(['recipient']);
  if (!user) return;
  ui.nav('dashboard-recipient.html');
  const $ = (id) => document.getElementById(id);
  let page = 1;

  async function load() {
    const el = $('reqs'); ui.loading(el);
    try {
      const r = await api.requests('GET', `/requests${api.qs({ status: $('reqStatus').value, page, per_page: 8 })}`);
      if (!r.data.length) { ui.empty(el, '🧺', 'Belum ada permintaan', 'Telusuri katalog untuk menemukan makanan.'); $('pager').innerHTML = ''; return; }
      el.innerHTML = '<div class="row g-3">' + r.data.map((x) => `
        <div class="col-md-6"><div class="card-sb p-3 h-100"><div class="d-flex justify-content-between gap-2"><h5 class="mb-1">${ui.esc(x.food_title)}</h5>${ui.badge(x.status)}</div>
          <div class="small text-muted">${x.quantity} porsi · diajukan ${ui.fmtDate(x.created_at)}</div>
          ${x.note ? `<div class="small mt-1">“${ui.esc(x.note)}”</div>` : ''}
          ${x.rejection_reason ? `<div class="small text-danger mt-1">Ditolak: ${ui.esc(x.rejection_reason)}</div>` : ''}
          ${x.status === 'pending' ? `<div class="small text-muted mt-1">Batas waktu keputusan: ${ui.fmtDate(x.expires_at)}</div>` : ''}
          <div class="mt-3 d-flex gap-2 flex-wrap"><button class="btn btn-sm btn-outline-green" data-a="detail" data-id="${x.id}">Detail</button>
            ${['pending', 'approved'].includes(x.status) ? `<button class="btn btn-sm btn-outline-danger" data-a="cancel" data-id="${x.id}">Batalkan</button>` : ''}
            ${x.status === 'scheduled' ? '<a class="btn btn-sm btn-terra" href="donations.html">Lihat jadwal</a>' : ''}</div></div></div>`).join('') + '</div>';
      el.querySelectorAll('button[data-a]').forEach((b) => b.addEventListener('click', () => act(b.dataset.a, b.dataset.id)));
      ui.pager($('pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }

  async function act(a, id) {
    try {
      if (a === 'cancel') {
        if (!confirm('Batalkan permintaan ini?')) return;
        await api.requests('POST', `/requests/${id}/cancel`, { body: {} }); ui.toast('Permintaan dibatalkan.'); load();
      } else {
        const d = (await api.requests('GET', `/requests/${id}`)).data;
        $('detailBody').innerHTML = `<h5>${ui.esc(d.food_title)}</h5><p class="text-muted">${d.quantity} porsi · ${ui.badge(d.status)}</p><h6>Riwayat status</h6>
          <ul class="timeline">${d.history.map((h) => `<li><strong>${ui.esc(ui.LABEL[h.to_status] || h.to_status)}</strong><div class="small text-muted">${ui.fmtDate(h.at)}${h.reason ? ' · ' + ui.esc(h.reason) : ''}</div></li>`).join('')}</ul>`;
        bootstrap.Modal.getOrCreateInstance($('detailModal')).show();
      }
    } catch (e) { ui.toast(ui.errText(e), 'err'); load(); }
  }
  $('reqStatus').addEventListener('change', () => { page = 1; load(); });
  load();
})();
