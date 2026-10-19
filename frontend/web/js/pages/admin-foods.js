(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1; let status = '';
  box.innerHTML = `<div class="page-head"><h1>Publikasi makanan</h1></div><div class="row" style="margin-bottom:1rem" role="group" aria-label="Filter status">${[['', 'Semua'], ['available', 'Tersedia'], ['out_of_stock', 'Habis'], ['expired', 'Kedaluwarsa'], ['closed', 'Ditutup']].map(([v, l], i) => `<button class="chip" data-s="${v}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 3, 'row');
    try {
      const r = await api.food('GET', `/foods${api.qs({ all: 'true', status, page, per_page: 10 })}`);
      if (!r.data.length) return ui.empty(el, 'package', 'Tidak ada publikasi', 'Belum ada makanan pada filter ini.');
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Makanan</th><th>Donatur</th><th>Stok</th><th>Layak hingga</th><th>Status</th><th></th></tr></thead><tbody>${r.data.map((f) => `<tr><td><a href="food-detail.html?id=${f.id}"><b>${esc(f.title)}</b></a></td><td>#${f.donor_id}</td><td>${f.quantity_available}/${f.quantity_total}</td><td>${ui.fmtDate(f.expires_at)}</td><td>${ui.badge(f.status)}</td>
        <td class="right"><div class="row" style="justify-content:flex-end"><button class="btn btn-secondary btn-sm" data-a="toggle" data-id="${f.id}" data-s="${f.status}">${f.status === 'closed' ? 'Buka' : 'Tutup (moderasi)'}</button><button class="btn btn-danger btn-sm" data-a="del" data-id="${f.id}" data-t="${esc(f.title)}">Hapus</button></div></td></tr>`).join('')}</tbody></table></div>`;
      ui.$$('button[data-a]', el).forEach((b) => b.onclick = async () => {
        try {
          if (b.dataset.a === 'del') { if (!await ui.confirm({ title: 'Hapus publikasi?', message: `“${b.dataset.t}” disembunyikan. Dicatat di log audit.`, confirmText: 'Hapus', danger: true })) return; await api.food('DELETE', `/foods/${b.dataset.id}`); }
          else { const closing = b.dataset.s !== 'closed'; if (!await ui.confirm({ title: closing ? 'Tutup publikasi?' : 'Buka publikasi?', message: 'Dicatat di log audit.', confirmText: 'Ya', danger: closing })) return; await api.food('PATCH', `/foods/${b.dataset.id}`, { body: { status: closing ? 'closed' : 'available' } }); }
          ui.toast('Berhasil.'); load();
        } catch (e) { ui.toast(ui.errText(e), 'err'); }
      });
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  ui.$$('.chip', box).forEach((b) => b.onclick = () => { status = b.dataset.s; page = 1; ui.$$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); });
  load();
})();
