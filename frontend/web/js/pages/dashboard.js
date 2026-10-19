(async function () {
  const { $, esc } = ui; const user = api.session.user; const box = $('#page'); const num = (n) => Number(n ?? 0).toLocaleString('id-ID');
  const card = (n, l, href) => `<${href ? `a href="${href}"` : 'div'} class="card stat" style="text-decoration:none;color:inherit;display:block"><div class="n">${num(n)}</div><div class="l">${l}</div></${href ? 'a' : 'div'}>`;
  const safe = async (p, fb = null) => { try { return await p; } catch (_) { return fb; } };
  box.innerHTML = `<div class="page-head"><div><h1>Halo, ${esc(user.name.split(' ')[0])}</h1><p class="muted" style="margin:0">${esc(ui.ROLE[user.role])} · ringkasan aktivitas Anda</p></div></div><div id="body"></div>`;
  const body = $('#body'); ui.skeleton(body, 4, 'row');

  async function recipient() {
    const cnt = (s) => safe(api.requests('GET', `/requests?status=${s}&per_page=1`));
    const [p, a, s, c, fav, don, act, tl] = await Promise.all([cnt('pending'), cnt('approved'), cnt('scheduled'), cnt('completed'),
      safe(api.donation('GET', '/favorites?per_page=1')), safe(api.donation('GET', '/donations?status=scheduled&per_page=4')), safe(api.requests('GET', '/activity?per_page=5')), safe(api.requests('GET', '/requests/stats/timeline?days=14'))]);
    const t = (r) => (r ? r.meta.total : '–');
    body.innerHTML = `<div class="grid g4">${card(Number(t(p)) + Number(t(a)) + Number(t(s)) || 0, 'Permintaan aktif', 'my-requests.html')}${card(t(p), 'Menunggu keputusan', 'my-requests.html')}${card(t(a), 'Disetujui', 'my-requests.html')}${card(t(s), 'Terjadwal', 'donations.html')}${card(t(c), 'Riwayat diterima', 'history.html')}${card(t(fav), 'Favorit', 'favorites.html')}</div>
      <div class="grid g2" style="margin-top:1.2rem"><div class="card pad"><h3>Jadwal pengambilan</h3><div id="pick"></div></div><div class="card pad"><h3>Aktivitas terbaru</h3><div id="act"></div></div></div><div id="chart" style="margin-top:1.2rem"></div>`;
    const pk = $('#pick'); if (!don || !don.data.length) ui.empty(pk, 'calendar', 'Belum ada jadwal', 'Jadwal muncul setelah donatur menyetujui dan menjadwalkan.'); else pk.innerHTML = don.data.map((d) => `<p>${ui.icon('clock')} <b>${ui.fmtDate(d.pickup_time)}</b><br><span class="muted small">${esc(d.pickup_location)} · ${d.quantity} porsi</span></p>`).join('') + '<a href="donations.html">Kelola →</a>';
    activityList($('#act'), act);
    if (tl) ui.chart($('#chart'), { series: tl.data.series, key: 'requests', title: 'Permintaan Anda per hari', unit: 'permintaan', source: 'Request Service' });
  }

  async function donor() {
    const [foods, live, pend, ds, tl, act, g, soon, pendList] = await Promise.all([safe(api.food('GET', '/foods?mine=true&per_page=1')), safe(api.food('GET', '/foods?mine=true&status=available&per_page=1')),
      safe(api.requests('GET', '/requests?status=pending&per_page=1')), safe(api.donation('GET', '/donations/stats')), safe(api.donation('GET', '/stats/timeline?days=14')),
      safe(api.requests('GET', '/activity?per_page=5')), safe(api.donation('GET', '/me/gamification')), safe(api.food('GET', '/foods?mine=true&status=available&sort=expires_soon&per_page=3')), safe(api.requests('GET', '/requests?status=pending&per_page=4'))]);
    const t = (r) => (r ? r.meta.total : '–'); const s = ds ? ds.data : null;
    body.innerHTML = `<div class="grid g4">${card(t(foods), 'Makanan dipublikasikan', 'donor-foods.html')}${card(t(live), 'Donasi aktif', 'donor-foods.html')}${card(t(pend), 'Permintaan masuk (menunggu)', 'donor-requests.html')}${card(s ? s.by_status.completed || 0 : '–', 'Donasi selesai', 'donations.html')}${card(s ? s.total_portions_delivered : '–', 'Porsi dibagikan', 'donations.html')}${card(g ? g.data.points : '–', 'Poin kontribusi', 'leaderboard.html')}</div>
      <div class="card pad" style="margin-top:1.2rem"><h3>Perlu tindakan</h3><div id="todo"></div></div>
      <div id="chart" style="margin-top:1.2rem"></div>
      <div class="grid g2" style="margin-top:1.2rem"><div class="card pad"><h3>Aktivitas terbaru</h3><div id="act"></div></div><div class="card pad"><h3>Badge Anda</h3><div id="bd"></div></div></div>`;
    const todo = $('#todo'); const items = [];
    if (pendList) pendList.data.forEach((r) => items.push(`<p>${ui.icon('inbox')} <b>${esc(r.food_title)}</b> — ${r.quantity} porsi menunggu keputusan <a href="donor-requests.html">Tinjau</a></p>`));
    if (soon) soon.data.filter((f) => new Date(f.expires_at) - Date.now() < 6 * 3600e3).forEach((f) => items.push(`<p>${ui.icon('clock')} <b>${esc(f.title)}</b> kedaluwarsa ${ui.relTime(f.expires_at).includes('lalu') ? 'segera' : ui.fmtDate(f.expires_at)} <a href="donor-form.html?id=${f.id}">Ubah</a></p>`));
    todo.innerHTML = items.length ? items.join('') : '<p class="muted">Tidak ada tindakan tertunda. 🎉</p>';
    if (tl) ui.chart($('#chart'), { series: tl.data.series, key: 'portions', title: 'Porsi tersalurkan per hari', unit: 'porsi', source: 'Donation Service (donasi selesai)', color: '#c85a12' });
    activityList($('#act'), act);
    $('#bd').innerHTML = g ? g.data.badges.map((b) => `<span class="badge ${b.earned ? 'b-approved' : ''}" title="${esc(b.description)}" style="margin:.15rem">${b.earned ? '🏅' : '🔒'} ${esc(b.name)} ${b.earned ? '' : `(${b.progress}/${b.target})`}</span>`).join('') + `<p class="small muted" style="margin-top:.6rem">${g.data.rank ? `Peringkat #${g.data.rank}. ` : ''}<a href="leaderboard.html">Lihat peringkat</a></p>` : '<p class="muted">Belum dapat dimuat.</p>';
  }

  async function admin() {
    const [u, f, r, d, rep, rt, dt, aud, fs] = await Promise.all([safe(api.donation('GET', '/users?per_page=1')), safe(api.food('GET', '/foods/stats')), safe(api.requests('GET', '/requests/stats')), safe(api.donation('GET', '/donations/stats')),
      safe(api.donation('GET', '/reports?status=open&per_page=1')), safe(api.requests('GET', '/requests/stats/timeline?days=30')), safe(api.donation('GET', '/stats/timeline?days=30')), safe(api.donation('GET', '/audit-logs?per_page=6')), safe(api.pubFood('/stats'))]);
    const v = (x, fn) => (x ? fn(x) : '–');
    body.innerHTML = `<div class="grid g4">${card(v(u, (x) => x.meta.total), 'Pengguna', 'admin-users.html')}${card(v(f, (x) => x.data.by_status.available || 0), 'Donasi aktif', 'admin-foods.html')}${card(v(d, (x) => x.data.by_status.completed || 0), 'Donasi selesai', 'admin-requests.html')}${card(v(d, (x) => x.data.total_portions_delivered), 'Total porsi dibagikan')}${card(v(r, (x) => x.data.total), 'Permintaan', 'admin-requests.html')}${card(v(r, (x) => (x.data.completion_rate === null ? 'n/a' : x.data.completion_rate + '%')), 'Tingkat penyelesaian*')}${card(v(rep, (x) => x.meta.open), 'Laporan belum ditangani', 'admin-reports.html')}${card(v(f, (x) => x.data.total_available_stock), 'Stok tersedia')}</div>
      <p class="small muted">*Tingkat penyelesaian = permintaan selesai ÷ permintaan yang sudah berakhir (selesai, ditolak, dibatalkan, kedaluwarsa).</p>
      <div class="grid g2" style="margin-top:1rem"><div id="c1"></div><div id="c2"></div></div><div class="grid g2" style="margin-top:1.2rem"><div id="c3"></div><div class="card pad"><h3>Kategori populer</h3><div id="cats"></div></div></div>
      <div class="card pad" style="margin-top:1.2rem"><div class="row between"><h3>Aktivitas sistem terbaru</h3><a href="admin-audit.html">Semua log →</a></div><div id="aud"></div></div>`;
    if (rt) ui.chart($('#c1'), { series: rt.data.series, key: 'requests', title: 'Permintaan baru per hari (30 hari)', unit: 'permintaan', source: 'Request Service', type: 'line' });
    if (dt) { ui.chart($('#c2'), { series: dt.data.series, key: 'portions', title: 'Porsi tersalurkan per hari (30 hari)', unit: 'porsi', source: 'Donation Service', color: '#c85a12' });
      if (dt.data.registrations) ui.chart($('#c3'), { series: dt.data.registrations, key: 'users', title: 'Pendaftar baru per hari (30 hari)', unit: 'pengguna', source: 'Donation Service', type: 'line', color: '#4c9a53' }); }
    const cats = fs ? fs.data.popular_categories : [];
    $('#cats').innerHTML = cats.length ? cats.map((c) => `<div style="margin:.5rem 0"><div class="row between small"><span>${esc(c.name)}</span><b>${c.foods}</b></div><div class="progress"><i style="width:${Math.round(c.foods * 100 / cats[0].foods)}%"></i></div></div>`).join('') : '<p class="muted">Belum ada data.</p>';
    $('#aud').innerHTML = aud && aud.data.length ? aud.data.map((l) => `<p class="small"><span class="badge">${esc(l.action)}</span> ${esc(l.actor_role || 'sistem')}#${l.actor_id ?? '-'} → ${esc(l.target_type || '')} ${esc(l.target_id || '')} <span class="muted">· ${ui.relTime(l.created_at)}</span></p>`).join('') : '<p class="muted">Belum ada aktivitas tercatat.</p>';
  }

  function activityList(el, r) {
    if (!r || !r.data.length) return ui.empty(el, 'history', 'Belum ada aktivitas', 'Aktivitas permintaan akan muncul di sini.');
    el.innerHTML = r.data.map((a) => `<p>${ui.badge(a.to_status)} <b>${esc(a.food_title)}</b><br><span class="muted small">${ui.relTime(a.at)}${a.reason ? ' · ' + esc(a.reason) : ''}</span></p>`).join('') + '<a href="history.html">Semua riwayat →</a>';
  }
  try { await ({ recipient, donor, admin }[user.role])(); } catch (e) { ui.errorBox(body, e, () => location.reload()); }
})();
