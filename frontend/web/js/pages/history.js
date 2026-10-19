(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1;
  box.innerHTML = `<div class="page-head"><div><h1>Riwayat aktivitas</h1><p class="muted" style="margin:0">Setiap perubahan status permintaan Anda.</p></div></div>
  <form id="f" class="card pad grid g4" style="align-items:end;margin-bottom:1rem"><div class="field" style="margin:0"><label for="from">Dari tanggal</label><input id="from" type="date" class="input"></div><div class="field" style="margin:0"><label for="to">Sampai tanggal</label><input id="to" type="date" class="input"></div>
  <div class="field" style="margin:0"><label for="st">Status</label><select id="st" class="input"><option value="">Semua</option>${['pending', 'approved', 'rejected', 'scheduled', 'completed', 'cancelled', 'expired'].map((s) => `<option value="${s}">${ui.LABEL[s]}</option>`).join('')}</select></div><button class="btn btn-green" type="submit">Terapkan</button></form>
  <div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 3, 'row');
    try {
      const r = await api.requests('GET', `/activity${api.qs({ from: $('#from').value, to: $('#to').value, status: $('#st').value, page, per_page: 12 })}`);
      if (!r.data.length) return ui.empty(el, 'history', 'Tidak ada aktivitas', 'Coba ubah filter tanggal atau status.');
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Makanan</th><th>Perubahan</th><th>Oleh</th><th>Keterangan</th></tr></thead><tbody>${r.data.map((a) => `<tr><td>${ui.fmtDate(a.at)}</td><td><b>${esc(a.food_title)}</b><div class="small muted">${a.quantity} porsi</div></td><td>${a.from_status ? ui.badge(a.from_status) + ' → ' : ''}${ui.badge(a.to_status)}</td><td>${esc({ recipient: 'Penerima', donor: 'Donatur', admin: 'Admin', system: 'Sistem' }[a.actor_role] || a.actor_role)}</td><td>${esc(a.reason || '-')}</td></tr>`).join('')}</tbody></table></div>`;
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  $('#f').addEventListener('submit', (e) => { e.preventDefault(); page = 1; load(); }); load();
})();
