(function () {
  const user = ui.guard(['donor', 'recipient']);
  if (!user) return;
  ui.nav('donations.html');
  const $ = (id) => document.getElementById(id);
  let page = 1;
  const names = {}; const foods = {};
  const nameOf = async (id) => { if (!names[id]) { try { names[id] = (await api.donation('GET', `/users/${id}/public`)).data.name; } catch (_) { names[id] = `Pengguna #${id}`; } } return names[id]; };
  const foodOf = async (id) => { if (!foods[id]) { try { foods[id] = (await api.food('GET', `/foods/${id}`)).data.title; } catch (_) { foods[id] = `Makanan #${id}`; } } return foods[id]; };

  async function stats() {
    try {
      const d = (await api.donation('GET', '/donations/stats')).data;
      const c = (n, l) => `<div class="col-6 col-md-3"><div class="card-sb stat"><div class="n">${n}</div><div class="l">${l}</div></div></div>`;
      $('stats').innerHTML = c(d.by_status.scheduled || 0, 'Terjadwal') + c(d.by_status.completed || 0, 'Selesai') + c(d.by_status.cancelled || 0, 'Dibatalkan') + c(d.total_portions_delivered, 'Porsi tersalurkan');
    } catch (_) { /* statistik opsional */ }
  }

  async function load() {
    const el = $('list'); ui.loading(el);
    try {
      const r = await api.donation('GET', `/donations${api.qs({ status: $('status').value, page, per_page: 8 })}`);
      if (!r.data.length) { ui.empty(el, '📦', 'Belum ada donasi', 'Donasi muncul setelah donor menjadwalkan pengambilan.'); $('pager').innerHTML = ''; return; }
      const info = await Promise.all(r.data.map(async (d) => ({ food: await foodOf(d.food_id), donor: await nameOf(d.donor_id), rec: await nameOf(d.recipient_id) })));
      el.innerHTML = '<div class="row g-3">' + r.data.map((d, i) => {
        const iAmDonor = d.donor_id === user.id;
        const confirmedByMe = iAmDonor ? d.donor_confirmed_at : d.recipient_confirmed_at;
        return `<div class="col-md-6"><div class="card-sb p-3 h-100"><div class="d-flex justify-content-between gap-2"><h5 class="mb-1">${ui.esc(info[i].food)}</h5>${ui.badge(d.status)}</div>
          <div class="small text-muted mb-2">${d.quantity} porsi · ${iAmDonor ? 'untuk ' + ui.esc(info[i].rec) : 'dari ' + ui.esc(info[i].donor)}</div>
          <div class="small">⏰ ${ui.fmtDate(d.pickup_time)}</div><div class="small">📍 ${ui.esc(d.pickup_location)}</div>
          ${d.instructions ? `<div class="small">📝 ${ui.esc(d.instructions)}</div>` : ''}
          <div class="small mt-2">Donor: ${d.donor_confirmed_at ? '✅ sudah konfirmasi' : '⏳ belum'} · Penerima: ${d.recipient_confirmed_at ? '✅ sudah konfirmasi' : '⏳ belum'}</div>
          ${d.cancel_reason ? `<div class="small text-danger mt-1">Dibatalkan: ${ui.esc(d.cancel_reason)}</div>` : ''}
          ${d.status === 'scheduled' ? `<div class="mt-3 d-flex gap-2 flex-wrap">${confirmedByMe ? '<span class="text-muted small align-self-center">Anda sudah mengonfirmasi, menunggu pihak lain.</span>' : `<button class="btn btn-sm btn-green" data-a="confirm" data-id="${d.id}">Konfirmasi serah terima</button>`}
            <button class="btn btn-sm btn-outline-danger" data-a="cancel" data-id="${d.id}">Batalkan</button></div>` : ''}</div></div>`;
      }).join('') + '</div>';
      el.querySelectorAll('button[data-a]').forEach((b) => b.addEventListener('click', () => act(b.dataset.a, b.dataset.id)));
      ui.pager($('pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }

  async function act(a, id) {
    try {
      if (a === 'confirm') {
        if (!confirm('Konfirmasi bahwa makanan sudah diserahterimakan?')) return;
        const d = (await api.donation('POST', `/donations/${id}/confirm`)).data;
        ui.toast(d.status === 'completed' ? 'Donasi selesai. Terima kasih!' : 'Konfirmasi tercatat.');
      } else {
        const reason = prompt('Alasan pembatalan (min. 3 karakter):'); if (reason === null) return;
        await api.donation('POST', `/donations/${id}/cancel`, { body: { reason } }); ui.toast('Donasi dibatalkan.');
      }
      stats(); load();
    } catch (e) { ui.toast(ui.errText(e), 'err'); load(); }
  }
  $('status').addEventListener('change', () => { page = 1; load(); });
  stats(); load();
})();
