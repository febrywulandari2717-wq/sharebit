(async function () {
  const { $, esc, icon } = ui; const box = $('#page'); const id = new URLSearchParams(location.search).get('id');
  const user = api.session.loggedIn ? api.session.user : null; let idemKey = crypto.randomUUID();
  if (!id) return ui.empty(box, 'package', 'Makanan tidak ditemukan', 'ID makanan tidak ada pada alamat.');

  async function load() {
    ui.skeleton(box, 2);
    try {
      const f = (await api.pubFood(`/foods/${encodeURIComponent(id)}`)).data;
      let donor = `Donatur #${f.donor_id}`;
      if (user) { try { donor = (await api.donation('GET', `/users/${f.donor_id}/public`)).data.name; } catch (_) { /* pakai ID */ } }
      const favs = await ui.loadFavs();
      render(f, donor, favs);
    } catch (e) { if (e.status === 404) ui.empty(box, 'package', 'Makanan tidak ditemukan', 'Mungkin sudah dihapus oleh donatur.', '<a class="btn btn-primary" href="explore.html">Jelajahi makanan</a>'); else ui.errorBox(box, e, load); }
  }

  function render(f, donor, favs) {
    document.title = `${f.title} · ShareBite`;
    const expired = new Date(f.expires_at) <= new Date();
    const live = f.status === 'available' && !expired && f.quantity_available > 0;
    const maxQ = Math.min(f.quantity_available, f.max_per_request || f.quantity_available);
    const mine = user && f.donor_id === user.id;
    const dir = f.latitude != null ? `<a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="https://www.openstreetmap.org/directions?to=${f.latitude}%2C${f.longitude}">${icon('navigation')} Petunjuk arah</a>` : '';
    box.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:1.6rem;align-items:start">
      <div><img src="${ui.img(f.image_url)}" alt="${esc(f.title)}" style="width:100%;max-height:420px;object-fit:cover;border-radius:var(--r-lg);background:var(--mint)">
        <div class="row between" style="margin-top:1rem"><h1 style="font-size:2rem;margin:0">${esc(f.title)}</h1>
          <button class="btn btn-secondary btn-sm" id="fav" aria-pressed="${favs.has(f.id)}">${icon('heart')} <span>${favs.has(f.id) ? 'Favorit' : 'Simpan'}</span></button></div>
        <div class="row" style="margin:.5rem 0 1rem">${ui.badge(expired && f.status === 'available' ? 'expired' : f.status)}<span class="muted">${esc(f.category ? f.category.name : '')}</span></div>
        <p>${esc(f.description || 'Tidak ada deskripsi.').replace(/\n/g, '<br>')}</p>
        <div class="card pad"><dl style="display:grid;grid-template-columns:150px 1fr;gap:.6rem 1rem;margin:0">
          <dt class="muted">Donatur</dt><dd style="margin:0">${esc(donor)}</dd>
          <dt class="muted">Lokasi</dt><dd style="margin:0">${esc(f.pickup_location)} ${dir}</dd>
          <dt class="muted">Jadwal ambil</dt><dd style="margin:0">${ui.fmtDate(f.pickup_start)} – ${ui.fmtDate(f.pickup_end)}</dd>
          <dt class="muted">Layak hingga</dt><dd style="margin:0">${ui.fmtDate(f.expires_at)}</dd>
          <dt class="muted">Stok</dt><dd style="margin:0"><b>${f.quantity_available}</b> dari ${f.quantity_total} ${esc(f.unit)}${f.max_per_request ? ` (maks. ${f.max_per_request} per permintaan)` : ''}</dd>
          <dt class="muted">Alergen</dt><dd style="margin:0">${esc(f.allergens || 'Tidak dicantumkan donatur')}</dd>
          ${f.storage_info ? `<dt class="muted">Penyimpanan</dt><dd style="margin:0">${esc(f.storage_info)}</dd>` : ''}</dl></div>
        <div class="alert alert-info" style="margin-top:1rem"><b>Persyaratan pengambilan:</b> datang sesuai jadwal, sebutkan nama akun Anda, dan konfirmasi serah terima di aplikasi. Jangan mengonsumsi makanan yang tampak atau berbau tidak wajar.</div>
        ${user && !mine ? `<button class="btn btn-ghost btn-sm" id="report">${icon('flag')} Laporkan makanan ini</button>` : ''}</div>
      <aside class="card pad" id="side" style="position:sticky;top:90px"></aside></div>`;
    $('#fav').onclick = async () => {
      if (!user) { location.href = `login.html?next=${encodeURIComponent('food-detail.html?id=' + f.id)}`; return; }
      const on = $('#fav').getAttribute('aria-pressed') === 'true';
      try { if (on) { await api.donation('DELETE', `/favorites/${f.id}`); } else { await api.donation('POST', '/favorites', { body: { food_id: f.id, food_title: f.title } }); }
        $('#fav').setAttribute('aria-pressed', String(!on)); $('#fav span').textContent = on ? 'Simpan' : 'Favorit'; ui.toast(on ? 'Dihapus dari favorit.' : 'Ditambahkan ke favorit.'); } catch (e) { ui.toast(ui.errText(e), 'err'); }
    };
    const rb = $('#report'); if (rb) rb.onclick = () => reportDialog(f);
    const side = $('#side');
    if (!user) side.innerHTML = `<h3>Ingin mengambil makanan ini?</h3><p class="muted">Masuk atau daftar sebagai penerima untuk mengajukan permintaan.</p><a class="btn btn-primary btn-block" href="login.html?next=${encodeURIComponent('food-detail.html?id=' + f.id)}">Masuk untuk memesan</a>`;
    else if (mine) side.innerHTML = `<h3>Makanan Anda</h3><p class="muted">Kelola stok, ubah data, atau lihat permintaan masuk.</p><div class="stack"><a class="btn btn-green btn-block" href="donor-form.html?id=${f.id}">Ubah makanan</a><a class="btn btn-secondary btn-block" href="donor-requests.html">Permintaan masuk</a></div>`;
    else if (user.role !== 'recipient') side.innerHTML = '<h3>Hanya melihat</h3><p class="muted">Hanya akun penerima yang dapat mengajukan permintaan.</p>';
    else if (!live) side.innerHTML = '<h3>Tidak tersedia</h3><p class="muted">Makanan ini habis, ditutup, atau melewati batas konsumsi.</p>';
    else {
      side.innerHTML = `<h3>Ajukan permintaan</h3><div id="alert" role="alert"></div><form id="rf" novalidate>
        <div class="field"><label for="qty">Jumlah (${esc(f.unit)})</label><input id="qty" name="quantity" type="number" min="1" max="${maxQ}" value="1" class="input" required><div class="hint">Maksimal ${maxQ}.</div></div>
        <div class="field"><label for="note">Catatan untuk donatur (opsional)</label><textarea id="note" name="note" maxlength="255" class="input"></textarea></div>
        <button class="btn btn-primary btn-block" type="submit">Ajukan permintaan</button></form>`;
      const form = $('#rf');
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); const al = $('#alert'); al.innerHTML = ''; ui.fieldErrors(form, {}); const d = Object.fromEntries(new FormData(form));
        const ok = await ui.confirm({ title: 'Kirim permintaan?', message: `${d.quantity} ${f.unit} “${f.title}”. Stok langsung dipesan untuk Anda.`, confirmText: 'Kirim' });
        if (!ok) return;
        try {
          await ui.busy(form.querySelector('button'), () => api.requests('POST', '/requests', { key: idemKey, body: { food_id: f.id, quantity: Number(d.quantity), note: d.note || undefined } }));
          idemKey = crypto.randomUUID(); ui.toast('Permintaan terkirim. Menunggu persetujuan donatur.'); setTimeout(() => { location.href = 'my-requests.html'; }, 900);
        } catch (err) {
          if (err.status === 422) ui.fieldErrors(form, err.details);
          const m = { DUPLICATE_ACTIVE_REQUEST: 'Anda sudah punya permintaan aktif untuk makanan ini. Lihat di "Permintaan saya".', INSUFFICIENT_STOCK: 'Stok tidak mencukupi.', FOOD_NOT_AVAILABLE: 'Makanan sudah tidak tersedia.' }[err.code] || ui.errText(err);
          al.innerHTML = `<div class="alert alert-err">${esc(m)}</div>`; if (['INSUFFICIENT_STOCK', 'FOOD_NOT_AVAILABLE'].includes(err.code)) setTimeout(load, 1500);
        }
      });
    }
  }

  function reportDialog(f) {
    const m = ui.modal(`<h3>Laporkan makanan</h3><form id="rep" novalidate><div class="field"><label for="rr">Alasan</label><select id="rr" name="reason" class="input">${Object.entries(ui.REASON).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div class="field"><label for="rd">Detail (opsional)</label><textarea id="rd" name="details" class="input" maxlength="2000"></textarea></div>
      <div class="actions"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary" type="submit">Kirim laporan</button></div></form>`);
    ui.$('[data-x]', m.el).onclick = () => m.close();
    ui.$('#rep', m.el).addEventListener('submit', async (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
      try { await api.donation('POST', '/reports', { body: { target_type: 'food', target_id: f.id, reason: d.reason, details: d.details || null } }); m.close(); ui.toast('Laporan terkirim. Admin akan meninjau.'); }
      catch (err) { ui.toast(err.code === 'CONFLICT' ? 'Anda sudah melaporkan ini; masih diproses.' : ui.errText(err), 'err'); }
    });
  }
  load();
})();
