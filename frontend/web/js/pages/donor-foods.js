(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1; let status = '';
  box.innerHTML = `<div class="page-head"><h1>Makanan saya</h1><a class="btn btn-primary" href="donor-form.html">${ui.icon('plus')} Tambah donasi</a></div>
  <div class="row" style="margin-bottom:1rem" role="group" aria-label="Filter status">${[['', 'Semua'], ['available', 'Tersedia'], ['out_of_stock', 'Habis'], ['expired', 'Kedaluwarsa'], ['closed', 'Ditutup']].map(([v, l], i) => `<button class="chip" data-s="${v}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 3, 'row');
    try {
      const r = await api.food('GET', `/foods${api.qs({ mine: 'true', status, page, per_page: 8 })}`);
      if (!r.data.length) return ui.empty(el, 'package', 'Belum ada makanan', 'Mulai berbagi dengan menambahkan donasi pertama Anda.', '<a class="btn btn-primary" href="donor-form.html">Tambah donasi</a>');
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Makanan</th><th>Stok</th><th>Layak hingga</th><th>Status</th><th><span class="sr-only">Aksi</span></th></tr></thead><tbody>${r.data.map((f) => `<tr><td><div class="row" style="flex-wrap:nowrap"><img src="${ui.img(f.image_url)}" alt="" width="52" height="52" style="object-fit:cover;border-radius:10px"><div><b>${esc(f.title)}</b><div class="small muted">${esc(f.category ? f.category.name : '')}</div></div></div></td>
        <td>${f.quantity_available}/${f.quantity_total} ${esc(f.unit)}</td><td>${ui.fmtDate(f.expires_at)}</td><td>${ui.badge(f.status)}</td>
        <td class="right"><div class="row" style="justify-content:flex-end"><a class="btn btn-secondary btn-sm" href="donor-form.html?id=${f.id}">Ubah</a><button class="btn btn-secondary btn-sm" data-a="toggle" data-id="${f.id}" data-s="${f.status}">${f.status === 'closed' ? 'Buka' : 'Tutup'}</button><button class="btn btn-danger btn-sm" data-a="del" data-id="${f.id}" data-t="${esc(f.title)}">Hapus</button></div></td></tr>`).join('')}</tbody></table></div>`;
      ui.$$('button[data-a]', el).forEach((b) => b.onclick = () => act(b));
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  async function act(b) {
    try {
      if (b.dataset.a === 'del') { if (!await ui.confirm({ title: 'Hapus makanan?', message: `“${b.dataset.t}” akan disembunyikan dari katalog.`, confirmText: 'Hapus', danger: true })) return; await api.food('DELETE', `/foods/${b.dataset.id}`); ui.toast('Makanan dihapus.'); }
      else { const closing = b.dataset.s !== 'closed'; if (closing && !await ui.confirm({ title: 'Tutup publikasi?', message: 'Makanan tidak lagi tampil di katalog. Permintaan yang sudah ada tetap diproses.', confirmText: 'Tutup' })) return; await api.food('PATCH', `/foods/${b.dataset.id}`, { body: { status: closing ? 'closed' : 'available' } }); ui.toast(closing ? 'Publikasi ditutup.' : 'Publikasi dibuka.'); }
      load();
    } catch (e) { ui.toast(ui.errText(e), 'err'); }
  }
  ui.$$('[data-s]', box).forEach((b) => { if (b.classList.contains('chip')) b.onclick = () => { status = b.dataset.s; page = 1; ui.$$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); }; });
  load();
})();
