(async function () {
  const { $, esc } = ui; const box = $('#page'); const num = (n) => Number(n).toLocaleString('id-ID');
  box.innerHTML = '<h1>Statistik dampak</h1><p class="muted">Seluruh angka dihitung langsung dari database. Donasi dihitung hanya jika berstatus <b>selesai</b> (dikonfirmasi donatur dan penerima).</p><div id="s" style="margin-top:1rem"></div><div id="c" style="margin-top:1.4rem"></div>';
  try {
    const [d, f] = await Promise.all([api.pubDonation('/stats'), api.pubFood('/stats')]);
    const x = d.data; const y = f.data;
    $('#s').innerHTML = `<div class="grid g4">${[[x.completed_donations, 'Donasi selesai'], [x.portions_delivered, 'Porsi tersalurkan'], [x.active_donors, 'Donatur berkontribusi'], [x.recipients_served, 'Penerima terlayani'], [x.members, 'Anggota aktif'], [y.available_portions, 'Porsi tersedia saat ini'], [y.available_foods, 'Makanan tersedia'], [y.reserved_portions, 'Porsi sedang dipesan']].map(([n, l]) => `<div class="card stat"><div class="n">${num(n)}</div><div class="l">${l}</div></div>`).join('')}</div>`;
    const cats = y.popular_categories;
    $('#c').innerHTML = `<div class="card pad"><h3>Kategori terpopuler</h3><p class="small muted">Jumlah makanan yang pernah dipublikasikan per kategori (sumber: Food Service).</p>${cats.length ? cats.map((c) => { const max = cats[0].foods || 1; return `<div style="margin:.6rem 0"><div class="row between small"><span>${esc(c.name)}</span><b>${c.foods}</b></div><div class="progress"><i style="width:${Math.round(c.foods * 100 / max)}%"></i></div></div>`; }).join('') : '<p class="muted">Belum ada data makanan.</p>'}</div>`;
  } catch (e) { ui.errorBox($('#s'), e, () => location.reload()); }
})();
