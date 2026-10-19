(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1; let status = 'open';
  box.innerHTML = `<div class="page-head"><div><h1>Moderasi laporan</h1><p class="muted" style="margin:0">Tinjau laporan makanan/pengguna, beri catatan, dan tutup. Pelapor mendapat notifikasi.</p></div></div>
  <div class="row" style="margin-bottom:1rem" role="group" aria-label="Filter status">${[['open', 'Terbuka'], ['reviewing', 'Ditinjau'], ['resolved', 'Selesai'], ['dismissed', 'Ditolak'], ['', 'Semua']].map(([v, l]) => `<button class="chip" data-s="${v}" aria-pressed="${v === 'open'}">${l}</button>`).join('')}</div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 2);
    try {
      const r = await api.donation('GET', `/reports${api.qs({ status, page, per_page: 8 })}`);
      if (!r.data.length) return ui.empty(el, 'flag', 'Tidak ada laporan', 'Laporan dari pengguna muncul di sini.');
      el.innerHTML = `<div class="stack">${r.data.map((x) => `<article class="card pad"><div class="row between"><div><b>${x.target_type === 'food' ? `<a href="food-detail.html?id=${x.target_id}">Makanan #${x.target_id}</a>` : `Pengguna #${x.target_id}`}</b> · ${esc(ui.REASON[x.reason] || x.reason)}</div>${ui.badge(x.status)}</div>
        <p class="small muted">Pelapor #${x.reporter_id} · ${ui.fmtDate(x.created_at)}</p>${x.details ? `<p>${esc(x.details)}</p>` : ''}${x.admin_note ? `<p class="alert alert-info">Catatan admin: ${esc(x.admin_note)}</p>` : ''}
        ${['open', 'reviewing'].includes(x.status) ? `<div class="row">${x.status === 'open' ? `<button class="btn btn-secondary btn-sm" data-a="reviewing" data-id="${x.id}">Tandai ditinjau</button>` : ''}<button class="btn btn-green btn-sm" data-a="resolved" data-id="${x.id}">Selesaikan</button><button class="btn btn-danger btn-sm" data-a="dismissed" data-id="${x.id}">Tolak laporan</button>${x.target_type === 'food' ? `<button class="btn btn-ghost btn-sm" data-close="${x.target_id}">Tutup makanan</button>` : ''}</div>` : ''}</article>`).join('')}</div>`;
      ui.$$('button[data-a]', el).forEach((b) => b.onclick = async () => {
        const s = b.dataset.a; let note = null;
        if (s !== 'reviewing') { const r2 = await ui.confirm({ title: s === 'resolved' ? 'Selesaikan laporan?' : 'Tolak laporan?', message: 'Catatan akan terlihat oleh pelapor.', confirmText: 'Simpan', danger: s === 'dismissed', reason: { label: 'Catatan admin', min: 3 } }); if (!r2) return; note = r2.reason; }
        try { await api.donation('PATCH', `/reports/${b.dataset.id}`, { body: { status: s, admin_note: note } }); ui.toast('Laporan diperbarui.'); load(); } catch (e) { ui.toast(ui.errText(e), 'err'); }
      });
      ui.$$('button[data-close]', el).forEach((b) => b.onclick = async () => { if (!await ui.confirm({ title: 'Tutup publikasi makanan ini?', message: 'Makanan tidak tampil di katalog. Dicatat di log audit.', confirmText: 'Tutup makanan', danger: true })) return;
        try { await api.food('PATCH', `/foods/${b.dataset.close}`, { body: { status: 'closed' } }); ui.toast('Makanan ditutup.'); } catch (e) { ui.toast(ui.errText(e), 'err'); } });
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  ui.$$('.chip', box).forEach((b) => b.onclick = () => { status = b.dataset.s; page = 1; ui.$$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); });
  load();
})();
