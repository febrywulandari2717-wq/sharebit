(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1; let status = 'pending'; const names = {};
  const nameOf = async (id) => { if (!names[id]) { try { names[id] = (await api.donation('GET', `/users/${id}/public`)).data.name; } catch (_) { names[id] = `Penerima #${id}`; } } return names[id]; };
  box.innerHTML = `<div class="page-head"><div><h1>Permintaan masuk</h1><p class="muted" style="margin:0">Setujui atau tolak dalam 24 jam; lalu jadwalkan pengambilan. Penerima hanya terlihat namanya.</p></div></div>
  <div class="row" style="margin-bottom:1rem" role="group" aria-label="Filter status">${[['pending', 'Menunggu'], ['approved', 'Perlu dijadwalkan'], ['scheduled', 'Dijadwalkan'], ['completed', 'Selesai'], ['rejected', 'Ditolak'], ['cancelled', 'Dibatalkan'], ['', 'Semua']].map(([v, l]) => `<button class="chip" data-s="${v}" aria-pressed="${v === 'pending'}">${l}</button>`).join('')}</div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 2);
    try {
      const r = await api.requests('GET', `/requests${api.qs({ status, page, per_page: 8 })}`);
      if (!r.data.length) return ui.empty(el, 'inbox', 'Tidak ada permintaan', 'Permintaan dari penerima akan muncul di sini dan Anda mendapat notifikasi.');
      const rn = await Promise.all(r.data.map((x) => nameOf(x.recipient_id)));
      el.innerHTML = `<div class="grid g2">${r.data.map((x, i) => `<article class="card pad"><div class="row between"><h3 style="margin:0">${esc(x.food_title)}</h3>${ui.badge(x.status)}</div>
        <p class="muted small">${esc(rn[i])} · ${x.quantity} porsi · ${ui.fmtDate(x.created_at)}</p>${x.note ? `<p>“${esc(x.note)}”</p>` : ''}${x.rejection_reason ? `<p style="color:var(--danger)">Ditolak: ${esc(x.rejection_reason)}</p>` : ''}
        <div class="row">${x.status === 'pending' ? `<button class="btn btn-green btn-sm" data-a="approve" data-id="${x.id}">Setujui</button><button class="btn btn-danger btn-sm" data-a="reject" data-id="${x.id}">Tolak</button>` : ''}
          ${x.status === 'approved' ? `<button class="btn btn-primary btn-sm" data-a="schedule" data-id="${x.id}">Jadwalkan pengambilan</button><button class="btn btn-danger btn-sm" data-a="cancel" data-id="${x.id}">Batalkan</button>` : ''}
          ${x.status === 'scheduled' ? '<a class="btn btn-secondary btn-sm" href="donations.html">Kelola serah terima</a>' : ''}<button class="btn btn-ghost btn-sm" data-a="detail" data-id="${x.id}">Riwayat</button></div></article>`).join('')}</div>`;
      const byId = Object.fromEntries(r.data.map((x) => [x.id, x]));
      ui.$$('button[data-a]', el).forEach((b) => b.onclick = () => act(b.dataset.a, byId[b.dataset.id]));
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  async function act(a, x) {
    try {
      if (a === 'approve') { if (!await ui.confirm({ title: 'Setujui permintaan?', message: `${x.quantity} porsi “${x.food_title}” untuk penerima ini.`, confirmText: 'Setujui' })) return; await api.requests('POST', `/requests/${x.id}/approve`); ui.toast('Disetujui. Silakan jadwalkan pengambilan.'); }
      else if (a === 'reject') { const r = await ui.confirm({ title: 'Tolak permintaan?', message: 'Stok dikembalikan dan penerima diberi tahu.', confirmText: 'Tolak', danger: true, reason: { label: 'Alasan penolakan', min: 3 } }); if (!r) return; await api.requests('POST', `/requests/${x.id}/reject`, { body: { reason: r.reason } }); ui.toast('Permintaan ditolak.'); }
      else if (a === 'cancel') { const r = await ui.confirm({ title: 'Batalkan permintaan?', message: 'Stok dikembalikan dan penerima diberi tahu.', confirmText: 'Batalkan', danger: true, reason: { label: 'Alasan pembatalan', min: 3 } }); if (!r) return; await api.requests('POST', `/requests/${x.id}/cancel`, { body: { reason: r.reason } }); ui.toast('Permintaan dibatalkan.'); }
      else if (a === 'schedule') return schedule(x);
      else { const d = (await api.requests('GET', `/requests/${x.id}`)).data; const m = ui.modal(`<h3>${esc(d.food_title)}</h3><ul class="timeline">${d.history.map((h) => `<li><b>${esc(ui.LABEL[h.to_status] || h.to_status)}</b><div class="small muted">${ui.fmtDate(h.at)}${h.reason ? ' · ' + esc(h.reason) : ''}</div></li>`).join('')}</ul><div class="actions"><button class="btn btn-green" data-x>Tutup</button></div>`); ui.$('[data-x]', m.el).onclick = () => m.close(); return; }
      load();
    } catch (e) { ui.toast(ui.errText(e), 'err'); load(); }
  }
  async function schedule(x) {
    let loc = '', time = ui.toLocalInput(new Date(Date.now() + 86400e3));
    try { const f = (await api.food('GET', `/foods/${x.food_id}`)).data; loc = f.pickup_location; time = ui.toLocalInput(f.pickup_start); } catch (_) { /* isi manual */ }
    const m = ui.modal(`<h3>Jadwalkan pengambilan</h3><form id="sf" novalidate><div class="field"><label for="pt">Waktu pengambilan</label><input id="pt" name="pickup_time" type="datetime-local" class="input" value="${time}" required></div>
      <div class="field"><label for="pl">Lokasi</label><input id="pl" name="pickup_location" class="input" value="${esc(loc)}" required></div><div class="field"><label for="pi">Instruksi untuk penerima</label><textarea id="pi" name="instructions" class="input"></textarea></div>
      <div class="actions"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary" type="submit">Jadwalkan</button></div></form>`);
    ui.$('[data-x]', m.el).onclick = () => m.close();
    ui.$('#sf', m.el).addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target; ui.fieldErrors(f, {}); const d = Object.fromEntries(new FormData(f));
      try { await ui.busy(f.querySelector('button[type=submit]'), () => api.donation('POST', '/donations', { body: { request_id: x.id, pickup_time: ui.toIso(d.pickup_time), pickup_location: d.pickup_location, instructions: d.instructions || null } })); m.close(); ui.toast('Pengambilan dijadwalkan. Penerima diberi tahu.'); load(); }
      catch (er) { if (er.status === 422) ui.fieldErrors(f, er.details); ui.toast(ui.errText(er), 'err'); } });
  }
  ui.$$('[data-s]', box).forEach((b) => b.onclick = () => { status = b.dataset.s; page = 1; ui.$$('[data-s]', box).forEach((y) => y.setAttribute('aria-pressed', String(y === b))); load(); });
  load();
})();
