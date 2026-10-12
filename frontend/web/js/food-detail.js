(function () {
  const user = ui.guard();
  if (!user) return;
  ui.nav('catalog.html');
  const box = document.getElementById('content');
  const id = new URLSearchParams(location.search).get('id');
  let idemKey = crypto.randomUUID(); // dipakai ulang saat percobaan ulang; diganti setelah sukses

  async function load() {
    ui.loading(box);
    try {
      const f = (await api.food('GET', `/foods/${encodeURIComponent(id)}`)).data;
      let donorName = `Donor #${f.donor_id}`;
      try { donorName = (await api.donation('GET', `/users/${f.donor_id}/public`)).data.name; } catch (_) { /* tetap pakai ID */ }
      render(f, donorName);
    } catch (e) {
      if (e.status === 404) ui.empty(box, '🍽️', 'Makanan tidak ditemukan', 'Mungkin sudah dihapus oleh donor.');
      else ui.errorBox(box, e, load);
    }
  }

  function render(f, donorName) {
    const expired = new Date(f.expires_at) <= new Date();
    const canRequest = user.role === 'recipient' && f.status === 'available' && !expired && f.quantity_available > 0;
    const maxQ = Math.min(f.quantity_available, f.max_per_request || f.quantity_available);
    box.innerHTML = `
      <a href="catalog.html" class="text-decoration-none">‹ Kembali ke katalog</a>
      <div class="row g-4 mt-1"><div class="col-lg-7"><img class="food-hero-img" src="${ui.img(f.image_url)}" alt="${ui.esc(f.title)}">
        <h2 class="mt-4">${ui.esc(f.title)}</h2>
        <div class="mb-3">${ui.badge(f.status)} <span class="text-muted ms-2">${ui.esc(f.category ? f.category.name : '')}</span></div>
        <p>${ui.esc(f.description || 'Tidak ada deskripsi.').replace(/\n/g, '<br>')}</p>
        <div class="card-sb p-3"><dl class="row mb-0">
          <dt class="col-sm-4">Donor</dt><dd class="col-sm-8">${ui.esc(donorName)}</dd>
          <dt class="col-sm-4">Lokasi</dt><dd class="col-sm-8">${ui.esc(f.pickup_location)}</dd>
          <dt class="col-sm-4">Waktu ambil</dt><dd class="col-sm-8">${ui.fmtDate(f.pickup_start)} – ${ui.fmtDate(f.pickup_end)}</dd>
          <dt class="col-sm-4">Layak hingga</dt><dd class="col-sm-8">${ui.fmtDate(f.expires_at)}</dd>
          <dt class="col-sm-4">Stok</dt><dd class="col-sm-8">${f.quantity_available} dari ${f.quantity_total} ${ui.esc(f.unit)}</dd>
          ${f.max_per_request ? `<dt class="col-sm-4">Maks. per permintaan</dt><dd class="col-sm-8">${f.max_per_request}</dd>` : ''}
          ${f.allergens ? `<dt class="col-sm-4">Alergen</dt><dd class="col-sm-8">${ui.esc(f.allergens)}</dd>` : ''}
          ${f.storage_info ? `<dt class="col-sm-4">Penyimpanan</dt><dd class="col-sm-8">${ui.esc(f.storage_info)}</dd>` : ''}
        </dl></div></div>
        <div class="col-lg-5"><div class="card-sb p-4" id="side"></div></div></div>`;
    const side = document.getElementById('side');
    if (canRequest) {
      side.innerHTML = `<h4>Ajukan permintaan</h4><div id="alert"></div>
        <form id="rf" novalidate>
          <div class="mb-3"><label class="form-label">Jumlah (${ui.esc(f.unit)})</label><input name="quantity" type="number" min="1" max="${maxQ}" value="1" class="form-control" required><div class="form-text">Maksimal ${maxQ}.</div></div>
          <div class="mb-3"><label class="form-label">Catatan untuk donor (opsional)</label><textarea name="note" rows="2" maxlength="255" class="form-control"></textarea></div>
          <button class="btn btn-terra w-100" type="submit">Ajukan permintaan</button></form>`;
      const form = document.getElementById('rf');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alert = document.getElementById('alert'); alert.innerHTML = ''; ui.fieldErrors(form, {});
        const d = Object.fromEntries(new FormData(form));
        try {
          await ui.busy(form.querySelector('button'), () => api.requests('POST', '/requests', {
            key: idemKey, body: { food_id: f.id, quantity: Number(d.quantity), note: d.note || undefined } }));
          idemKey = crypto.randomUUID();
          ui.toast('Permintaan terkirim. Menunggu persetujuan donor.');
          setTimeout(() => { location.href = 'dashboard-recipient.html'; }, 900);
        } catch (err) {
          if (err.status === 422) ui.fieldErrors(form, err.details);
          const msg = { DUPLICATE_ACTIVE_REQUEST: 'Anda sudah punya permintaan aktif untuk makanan ini. Lihat di "Permintaan Saya".',
            INSUFFICIENT_STOCK: 'Stok tidak mencukupi. Muat ulang halaman.', FOOD_NOT_AVAILABLE: 'Makanan sudah tidak tersedia.' }[err.code] || ui.errText(err);
          alert.innerHTML = `<div class="alert alert-danger py-2">${ui.esc(msg)}</div>`;
          if (['INSUFFICIENT_STOCK', 'FOOD_NOT_AVAILABLE'].includes(err.code)) setTimeout(load, 1500);
        }
      });
    } else if (user.role === 'recipient') {
      side.innerHTML = '<h4>Tidak dapat diajukan</h4><p class="text-muted mb-0">Makanan ini sudah habis, ditutup, atau melewati batas waktu.</p>';
    } else if (f.donor_id === user.id) {
      side.innerHTML = '<h4>Makanan Anda</h4><p class="text-muted">Kelola di dashboard donor.</p><a class="btn btn-green" href="dashboard-donor.html">Buka dashboard</a>';
    } else {
      side.innerHTML = '<h4>Hanya melihat</h4><p class="text-muted mb-0">Hanya akun penerima yang dapat mengajukan permintaan.</p>';
    }
  }
  load();
})();
