(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1; let status = '';
  box.innerHTML = `<div class="page-head"><div><h1>Permintaan</h1><p class="muted" style="margin:0">Pemantauan semua permintaan. Tindakan admin dicatat di log audit.</p></div></div><div class="row" style="margin-bottom:1rem" role="group" aria-label="Filter status">${[['', 'Semua'], ['pending', 'Menunggu'], ['approved', 'Disetujui'], ['scheduled', 'Dijadwalkan'], ['completed', 'Selesai'], ['rejected', 'Ditolak'], ['cancelled', 'Dibatalkan'], ['expired', 'Kedaluwarsa']].map(([v, l], i) => `<button class="chip" data-s="${v}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 3, 'row');
    try {
      const r = await api.requests('GET', `/requests${api.qs({ status, page, per_page: 10 })}`);
      if (!r.data.length) return ui.empty(el, 'inbox', 'Tidak ada permintaan', 'Belum ada data pada filter ini.');
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Makanan</th><th>Donatur</th><th>Penerima</th><th>Jumlah</th><th>Status</th><th>Diajukan</th><th></th></tr></thead><tbody>${r.data.map((x) => `<tr><td><b>${esc(x.food_title)}</b></td><td>#${x.donor_id}</td><td>#${x.recipient_id}</td><td>${x.quantity}</td><td>${ui.badge(x.status)}</td><td>${ui.fmtDate(x.created_at)}</td>
        <td class="right">${['pending', 'approved'].includes(x.status) ? `<button class="btn btn-danger btn-sm" data-id="${x.id}">Batalkan</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
      ui.$$('button[data-id]', el).forEach((b) => b.onclick = async () => {
        const r2 = await ui.confirm({ title: 'Batalkan permintaan (admin)?', message: 'Stok dikembalikan; pihak terkait diberi tahu.', confirmText: 'Batalkan', danger: true, reason: { label: 'Alasan', min: 3 } }); if (!r2) return;
        try { await api.requests('POST', `/requests/${b.dataset.id}/cancel`, { body: { reason: r2.reason } }); ui.toast('Permintaan dibatalkan.'); load(); } catch (e) { ui.toast(ui.errText(e), 'err'); }
      });
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  ui.$$('.chip', box).forEach((b) => b.onclick = () => { status = b.dataset.s; page = 1; ui.$$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); });
  load();
})();
