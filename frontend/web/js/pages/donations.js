(async function () {
  const { $, esc } = ui; const user = api.session.user; const box = $('#page'); let page = 1; const names = {}; const foods = {};
  const nameOf = async (id) => { if (!names[id]) { try { names[id] = (await api.donation('GET', `/users/${id}/public`)).data.name; } catch (_) { names[id] = `Pengguna #${id}`; } } return names[id]; };
  const foodOf = async (id) => { if (!foods[id]) { try { foods[id] = (await api.food('GET', `/foods/${id}`)).data.title; } catch (_) { foods[id] = `Makanan #${id}`; } } return foods[id]; };
  box.innerHTML = `<div class="page-head"><div><h1>Jadwal &amp; riwayat donasi</h1><p class="muted" style="margin:0">Donasi selesai jika donatur dan penerima sama-sama mengonfirmasi serah terima.</p></div></div><div class="grid g4" id="stats" style="margin-bottom:1rem"></div>
  <div class="row" style="margin-bottom:1rem" role="group" aria-label="Filter status">${[['', 'Semua'], ['scheduled', 'Dijadwalkan'], ['completed', 'Selesai'], ['cancelled', 'Dibatalkan']].map(([v, l], i) => `<button class="chip" data-s="${v}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div><div id="list"></div><div id="pager"></div>`;
  let status = '';
  async function stats() { try { const d = (await api.donation('GET', '/donations/stats')).data; $('#stats').innerHTML = [[d.by_status.scheduled || 0, 'Terjadwal'], [d.by_status.completed || 0, 'Selesai'], [d.by_status.cancelled || 0, 'Dibatalkan'], [d.total_portions_delivered, 'Porsi tersalurkan']].map(([n, l]) => `<div class="card stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join(''); } catch (_) { /* opsional */ } }
  async function load() {
    const el = $('#list'); ui.skeleton(el, 2);
    try {
      const r = await api.donation('GET', `/donations${api.qs({ status, page, per_page: 8 })}`);
      if (!r.data.length) return ui.empty(el, 'calendar', 'Belum ada donasi', user.role === 'donor' ? 'Setujui permintaan lalu jadwalkan pengambilan.' : 'Donasi muncul setelah donatur menjadwalkan pengambilan.');
      const info = await Promise.all(r.data.map(async (d) => ({ food: await foodOf(d.food_id), donor: await nameOf(d.donor_id), rec: await nameOf(d.recipient_id) })));
      el.innerHTML = `<div class="grid g2">${r.data.map((d, i) => { const iAmDonor = d.donor_id === user.id; const mine = iAmDonor ? d.donor_confirmed_at : d.recipient_confirmed_at;
        return `<article class="card pad"><div class="row between"><h3 style="margin:0">${esc(info[i].food)}</h3>${ui.badge(d.status)}</div><p class="muted small">${d.quantity} porsi · ${iAmDonor ? 'untuk ' + esc(info[i].rec) : 'dari ' + esc(info[i].donor)}</p>
          <p style="margin:.2rem 0">${ui.icon('clock')} ${ui.fmtDate(d.pickup_time)}</p><p style="margin:.2rem 0">${ui.icon('pin')} ${esc(d.pickup_location)}</p>${d.instructions ? `<p style="margin:.2rem 0">${ui.icon('info')} ${esc(d.instructions)}</p>` : ''}
          <p class="small muted">Donatur: ${d.donor_confirmed_at ? '✅ konfirmasi' : '⏳ belum'} · Penerima: ${d.recipient_confirmed_at ? '✅ konfirmasi' : '⏳ belum'}</p>${d.cancel_reason ? `<p class="small" style="color:var(--danger)">Dibatalkan: ${esc(d.cancel_reason)}</p>` : ''}
          ${d.status === 'scheduled' ? `<div class="row">${mine ? '<span class="small muted">Anda sudah mengonfirmasi, menunggu pihak lain.</span>' : `<button class="btn btn-green btn-sm" data-a="confirm" data-id="${d.id}">Konfirmasi serah terima</button>`}<button class="btn btn-danger btn-sm" data-a="cancel" data-id="${d.id}">Batalkan</button></div>` : ''}</article>`; }).join('')}</div>`;
      ui.$$('button[data-a]', el).forEach((b) => b.onclick = () => act(b.dataset.a, b.dataset.id));
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  async function act(a, id) {
    try {
      if (a === 'confirm') { if (!await ui.confirm({ title: 'Konfirmasi serah terima?', message: 'Pastikan makanan sudah diserahterimakan. Tindakan ini tidak dapat dibatalkan.', confirmText: 'Ya, sudah diserahkan' })) return;
        const d = (await api.donation('POST', `/donations/${id}/confirm`)).data; ui.toast(d.status === 'completed' ? 'Donasi selesai. Terima kasih!' : 'Konfirmasi tercatat.'); }
      else { const r = await ui.confirm({ title: 'Batalkan donasi?', message: 'Stok akan dikembalikan dan pihak lain diberi tahu.', confirmText: 'Batalkan donasi', danger: true, reason: { label: 'Alasan pembatalan', min: 3 } }); if (!r) return; await api.donation('POST', `/donations/${id}/cancel`, { body: { reason: r.reason } }); ui.toast('Donasi dibatalkan.'); }
      stats(); load();
    } catch (e) { ui.toast(ui.errText(e), 'err'); load(); }
  }
  ui.$$('[data-s]', box).forEach((b) => b.onclick = () => { status = b.dataset.s; page = 1; ui.$$('[data-s]', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); });
  stats(); load();
})();
