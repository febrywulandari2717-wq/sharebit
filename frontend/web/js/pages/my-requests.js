(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1; let status = '';
  box.innerHTML = `<div class="page-head"><h1>Permintaan saya</h1><a class="btn btn-primary" href="explore.html">${ui.icon('search')} Cari makanan</a></div>
  <div class="row" style="margin-bottom:1rem" role="group" aria-label="Filter status">${[['', 'Semua'], ['pending', 'Menunggu'], ['approved', 'Disetujui'], ['scheduled', 'Dijadwalkan'], ['completed', 'Selesai'], ['rejected', 'Ditolak'], ['cancelled', 'Dibatalkan'], ['expired', 'Kedaluwarsa']].map(([v, l], i) => `<button class="chip" data-s="${v}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 2);
    try {
      const r = await api.requests('GET', `/requests${api.qs({ status, page, per_page: 8 })}`);
      if (!r.data.length) return ui.empty(el, 'inbox', 'Belum ada permintaan', 'Pilih makanan di katalog untuk mengajukan permintaan.', '<a class="btn btn-primary" href="explore.html">Jelajahi makanan</a>');
      el.innerHTML = `<div class="grid g2">${r.data.map((x) => `<article class="card pad"><div class="row between"><h3 style="margin:0"><a href="food-detail.html?id=${x.food_id}" style="text-decoration:none">${esc(x.food_title)}</a></h3>${ui.badge(x.status)}</div>
        <p class="muted small">${x.quantity} porsi · diajukan ${ui.fmtDate(x.created_at)}</p>${x.note ? `<p>“${esc(x.note)}”</p>` : ''}${x.rejection_reason ? `<p style="color:var(--danger)">Ditolak: ${esc(x.rejection_reason)}</p>` : ''}
        ${x.status === 'pending' ? `<p class="small muted">Batas waktu keputusan donatur: ${ui.fmtDate(x.expires_at)}</p>` : ''}
        <div class="row"><button class="btn btn-secondary btn-sm" data-a="detail" data-id="${x.id}">Detail reservasi</button>${['pending', 'approved'].includes(x.status) ? `<button class="btn btn-danger btn-sm" data-a="cancel" data-id="${x.id}">Batalkan</button>` : ''}${x.status === 'scheduled' ? '<a class="btn btn-green btn-sm" href="donations.html">Lihat jadwal</a>' : ''}</div></article>`).join('')}</div>`;
      ui.$$('button[data-a]', el).forEach((b) => b.onclick = () => act(b.dataset.a, b.dataset.id));
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  async function act(a, id) {
    try {
      if (a === 'cancel') { const r = await ui.confirm({ title: 'Batalkan permintaan?', message: 'Stok yang dipesan akan dikembalikan.', confirmText: 'Ya, batalkan', danger: true, reason: { label: 'Alasan (opsional diisi singkat)', min: 1 } }); if (!r) return; await api.requests('POST', `/requests/${id}/cancel`, { body: { reason: r.reason } }); ui.toast('Permintaan dibatalkan.'); load(); return; }
      const d = (await api.requests('GET', `/requests/${id}`)).data;
      const m = ui.modal(`<h3>${esc(d.food_title)}</h3><p>${d.quantity} porsi · ${ui.badge(d.status)}</p><h4>Riwayat status</h4><ul class="timeline">${d.history.map((h) => `<li><b>${esc(ui.LABEL[h.to_status] || h.to_status)}</b><div class="small muted">${ui.fmtDate(h.at)}${h.reason ? ' · ' + esc(h.reason) : ''}</div></li>`).join('')}</ul><div class="actions"><button class="btn btn-green" data-x>Tutup</button></div>`);
      ui.$('[data-x]', m.el).onclick = () => m.close();
    } catch (e) { ui.toast(ui.errText(e), 'err'); load(); }
  }
  ui.$$('[data-s]', box).forEach((b) => b.onclick = () => { status = b.dataset.s; page = 1; ui.$$('[data-s]', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); });
  load();
})();
