(async function () {
  const { $, esc } = ui; const box = $('#page'); const id = new URLSearchParams(location.search).get('id'); let food = null; let cats = [];
  try { cats = (await api.food('GET', '/categories')).data; if (id) food = (await api.food('GET', `/foods/${encodeURIComponent(id)}`)).data; }
  catch (e) { return ui.errorBox(box, e, () => location.reload()); }
  if (food && food.donor_id !== api.session.user.id) return ui.empty(box, 'shield', 'Bukan makanan Anda', 'Anda hanya dapat mengubah makanan milik sendiri.');
  document.title = `${food ? 'Ubah' : 'Tambah'} donasi · ShareBite`;
  const t0 = new Date(Date.now() + 3600e3); const v = (k, d = '') => esc(food && food[k] != null ? food[k] : d);
  const dt = (k, off) => ui.toLocalInput(food ? food[k] : new Date(t0.getTime() + off * 3600e3));
  box.innerHTML = `<div class="page-head"><h1>${food ? 'Ubah makanan' : 'Tambah donasi'}</h1></div><form id="f" class="card pad" novalidate style="max-width:820px">
    <div class="grid g2"><div class="field" style="grid-column:1/-1"><label for="title">Nama makanan *</label><input id="title" name="title" class="input" value="${v('title')}" required maxlength="120"></div>
    <div class="field"><label for="cat">Kategori *</label><select id="cat" name="category_id" class="input">${cats.map((c) => `<option value="${c.id}" ${food && food.category && food.category.id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="unit">Satuan</label><input id="unit" name="unit" class="input" value="${v('unit', 'porsi')}"></div>
    <div class="field"><label for="qty">Jumlah total *</label><input id="qty" name="quantity_total" type="number" min="1" max="1000" class="input" value="${v('quantity_total')}" required></div>
    <div class="field"><label for="mpr">Maks. per permintaan</label><input id="mpr" name="max_per_request" type="number" min="1" class="input" value="${v('max_per_request')}" placeholder="tanpa batas"></div>
    <div class="field" style="grid-column:1/-1"><label for="desc">Deskripsi</label><textarea id="desc" name="description" class="input" maxlength="2000">${v('description')}</textarea></div>
    <div class="field" style="grid-column:1/-1"><label for="loc">Lokasi pengambilan *</label><input id="loc" name="pickup_location" class="input" value="${v('pickup_location')}" required></div>
    <div class="field"><label for="ps">Mulai diambil *</label><input id="ps" name="pickup_start" type="datetime-local" class="input" value="${dt('pickup_start', 0)}" required></div>
    <div class="field"><label for="pe">Selesai diambil *</label><input id="pe" name="pickup_end" type="datetime-local" class="input" value="${dt('pickup_end', 2)}" required></div>
    <div class="field"><label for="ex">Batas konsumsi *</label><input id="ex" name="expires_at" type="datetime-local" class="input" value="${dt('expires_at', 4)}" required></div>
    <div class="field"><label for="al">Alergen</label><input id="al" name="allergens" class="input" value="${v('allergens')}" placeholder="mis. kacang, udang"></div>
    <div class="field" style="grid-column:1/-1"><label for="st">Cara penyimpanan</label><input id="st" name="storage_info" class="input" value="${v('storage_info')}"></div></div>
    <fieldset class="field" style="border:1px solid var(--line);border-radius:var(--r);padding:1rem"><legend><b>Titik lokasi (opsional, untuk peta &amp; filter jarak)</b></legend>
      <div class="grid g2"><div class="field"><label for="lat">Latitude</label><input id="lat" name="latitude" class="input" value="${v('latitude')}" inputmode="decimal" placeholder="-7.1550"></div><div class="field"><label for="lng">Longitude</label><input id="lng" name="longitude" class="input" value="${v('longitude')}" inputmode="decimal" placeholder="112.6560"></div></div>
      <div class="row"><button type="button" class="btn btn-secondary btn-sm" id="here">${ui.icon('navigation')} Gunakan lokasi saya</button><button type="button" class="btn btn-secondary btn-sm" id="pick">${ui.icon('map')} Pilih di peta</button></div><div id="pm" class="map hidden" style="height:300px;margin-top:.8rem"></div></fieldset>
    <div class="field upload"><label for="img">Foto (JPG/PNG/WebP, maks 2 MB)</label><input id="img" name="image" type="file" accept="image/jpeg,image/png,image/webp"><div id="prev">${food && food.image_url ? `<img src="${ui.img(food.image_url)}" alt="Foto saat ini">` : ''}</div></div>
    <div class="row"><button class="btn btn-primary" type="submit">${food ? 'Simpan perubahan' : 'Publikasikan'}</button><a class="btn btn-ghost" href="donor-foods.html">Batal</a></div></form>`;
  const f = $('#f');
  $('#img').onchange = (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { ui.fieldErrors(f, { image: ['Ukuran foto maksimal 2 MB.'] }); e.target.value = ''; return; } ui.fieldErrors(f, {}); const url = URL.createObjectURL(file); $('#prev').innerHTML = `<img src="${url}" alt="Pratinjau foto">`; };
  $('#here').onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => { f.latitude.value = p.coords.latitude.toFixed(5); f.longitude.value = p.coords.longitude.toFixed(5); ui.toast('Lokasi diisi.'); }, () => ui.toast('Izin lokasi ditolak.', 'err')) : ui.toast('Geolokasi tidak didukung.', 'err');
  let map = null; $('#pick').onclick = async () => {
    const el = $('#pm'); el.classList.remove('hidden');
    try { if (!window.L) await new Promise((res, rej) => { const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(c); const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; s.onerror = () => rej(new Error('x')); document.head.appendChild(s); }); }
    catch (_) { el.classList.add('hidden'); return ui.toast('Layanan peta tidak dapat dimuat. Isi latitude/longitude manual.', 'err'); }
    if (map) return; const lat = Number(f.latitude.value) || -7.155; const lng = Number(f.longitude.value) || 112.656; map = L.map(el).setView([lat, lng], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map); let mk = null;
    const set = (a, b) => { f.latitude.value = a.toFixed(5); f.longitude.value = b.toFixed(5); if (mk) mk.setLatLng([a, b]); else mk = L.marker([a, b]).addTo(map); };
    if (f.latitude.value) set(lat, lng); map.on('click', (e) => set(e.latlng.lat, e.latlng.lng)); setTimeout(() => map.invalidateSize(), 50);
  };
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); ui.fieldErrors(f, {}); const d = Object.fromEntries(new FormData(f)); const file = f.image.files[0];
    const body = { title: d.title, category_id: Number(d.category_id), description: d.description || null, quantity_total: Number(d.quantity_total), unit: d.unit || 'porsi', pickup_location: d.pickup_location,
      pickup_start: ui.toIso(d.pickup_start), pickup_end: ui.toIso(d.pickup_end), expires_at: ui.toIso(d.expires_at), allergens: d.allergens || null, storage_info: d.storage_info || null,
      latitude: d.latitude === '' ? null : Number(d.latitude), longitude: d.longitude === '' ? null : Number(d.longitude) };
    if (d.max_per_request) body.max_per_request = Number(d.max_per_request); else if (food) body.max_per_request = null;
    if ((body.latitude === null) !== (body.longitude === null)) { ui.fieldErrors(f, { latitude: ['Isi latitude dan longitude bersamaan.'] }); return; }
    try {
      await ui.busy(f.querySelector('button[type=submit]'), async () => {
        const saved = food ? await api.food('PATCH', `/foods/${food.id}`, { body }) : await api.food('POST', '/foods', { body });
        if (file) { const fd = new FormData(); fd.append('image', file); try { await api.food('POST', `/foods/${saved.data.id}/image`, { form: fd }); } catch (ie) { ui.toast(`Makanan tersimpan, tetapi foto gagal: ${ie.message}`, 'err'); } }
        ui.toast('Makanan tersimpan.'); setTimeout(() => { location.href = 'donor-foods.html'; }, 700);
      });
    } catch (err) { if (err.status === 422) ui.fieldErrors(f, err.details); ui.toast(ui.errText(err), 'err'); }
  });
})();
