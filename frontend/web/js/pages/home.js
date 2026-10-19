(async function () {
  const { $, esc, icon } = ui;
  $('#hero-art').innerHTML = ui.HERO_ART; $('#ic1').innerHTML = icon('gift'); $('#ic2').innerHTML = icon('search');
  const num = (n) => Number(n).toLocaleString('id-ID');
  const [food, don, cats, latest, camps] = await Promise.allSettled([
    api.pubFood('/stats'), api.pubDonation('/stats'), api.pubFood('/categories'), api.pubFood('/foods?per_page=6'), api.pubDonation('/campaigns?per_page=3')]);
  const ok = (r) => r.status === 'fulfilled';

  $('#hero-stats').innerHTML = ok(food) && ok(don)
    ? `<div><b>${num(food.value.data.available_portions)}</b><span>porsi tersedia sekarang</span></div><div><b>${num(don.value.data.portions_delivered)}</b><span>porsi telah tersalurkan</span></div><div><b>${num(don.value.data.active_donors)}</b><span>donatur aktif</span></div>`
    : '<span class="small">Statistik belum dapat dimuat.</span>';

  $('#cats').innerHTML = ok(cats) ? cats.value.data.map((c) => `<a class="chip" href="explore.html?category_id=${c.id}">${icon('tag')}${esc(c.name)}</a>`).join('') : '<span class="muted">Kategori belum dapat dimuat.</span>';

  const l = $('#latest');
  if (!ok(latest)) ui.errorBox(l, latest.reason);
  else if (!latest.value.data.length) ui.empty(l, 'package', 'Belum ada makanan tersedia', 'Jadilah yang pertama membagikan makanan.', '<a class="btn btn-primary" href="register.html?role=donor">Bagikan makanan</a>');
  else { const favs = await ui.loadFavs(); l.innerHTML = latest.value.data.map((f) => ui.foodCard(f, { favs: api.session.loggedIn ? favs : null })).join(''); ui.bindFavs(l, favs); }

  const c = $('#camps');
  if (!ok(camps) || !camps.value.data.length) ui.empty(c, 'gift', 'Belum ada kampanye aktif', 'Kampanye komunitas akan tampil di sini.');
  else c.innerHTML = camps.value.data.map((k) => `<div class="card pad"><span class="badge b-${k.state === 'running' ? 'approved' : 'closed'}">${ui.LABEL[k.state]}</span><h3 style="margin-top:.6rem">${esc(k.title)}</h3>
    <div class="progress" role="progressbar" aria-valuenow="${k.progress.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${k.progress.percent}%"></i></div>
    <p class="small muted" style="margin-top:.4rem">${num(k.progress.portions)} / ${num(k.target_portions)} porsi · ${k.progress.participants} peserta</p><a href="campaigns.html">Detail →</a></div>`).join('');

  const i = $('#impact');
  if (!ok(don)) ui.errorBox(i, don.reason);
  else { const d = don.value.data; i.innerHTML = [[d.completed_donations, 'Donasi selesai'], [d.portions_delivered, 'Porsi tersalurkan'], [d.active_donors, 'Donatur berkontribusi'], [d.recipients_served, 'Penerima terlayani']]
    .map(([n, t]) => `<div class="card stat"><div class="n">${num(n)}</div><div class="l">${t}</div></div>`).join(''); }
})();
