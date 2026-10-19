// Kerangka halaman: navbar publik / topbar + sidebar dashboard, guard peran, footer, polling notifikasi.
(function () {
  const { icon, esc, $ } = ui;
  const body = document.body;
  const layout = body.dataset.layout || 'public';
  const roles = (body.dataset.roles || '').split(',').filter(Boolean);
  const user = api.session.user;
  const here = location.pathname.split('/').pop() || 'index.html';

  // ---- guard
  if (layout === 'app' || roles.length) {
    if (!api.session.loggedIn) { location.replace(`login.html?next=${encodeURIComponent(here + location.search)}`); window.__sbHalt = true; window.stop(); return; }
    if (roles.length && !roles.includes(user.role)) { location.replace('dashboard.html'); window.__sbHalt = true; window.stop(); return; }
  }

  const MENU = {
    recipient: [
      ['Utama', [['dashboard.html', 'Dashboard', 'home'], ['explore.html', 'Jelajahi makanan', 'search'], ['favorites.html', 'Favorit', 'heart']]],
      ['Aktivitas', [['my-requests.html', 'Permintaan saya', 'inbox'], ['donations.html', 'Jadwal pengambilan', 'calendar'], ['history.html', 'Riwayat', 'history']]],
      ['Komunitas', [['campaigns.html', 'Kampanye', 'gift'], ['leaderboard.html', 'Peringkat', 'trophy']]],
      ['Akun', [['notifications.html', 'Notifikasi', 'bell'], ['profile.html', 'Profil & pengaturan', 'settings'], ['help.html', 'Bantuan & laporan', 'help']]],
    ],
    donor: [
      ['Utama', [['dashboard.html', 'Dashboard', 'home'], ['donor-foods.html', 'Makanan saya', 'package'], ['donor-form.html', 'Tambah donasi', 'plus']]],
      ['Aktivitas', [['donor-requests.html', 'Permintaan masuk', 'inbox'], ['donations.html', 'Jadwal & riwayat donasi', 'calendar'], ['history.html', 'Riwayat aktivitas', 'history']]],
      ['Komunitas', [['campaigns.html', 'Kampanye', 'gift'], ['leaderboard.html', 'Peringkat & badge', 'trophy'], ['explore.html', 'Jelajahi makanan', 'search']]],
      ['Akun', [['notifications.html', 'Notifikasi', 'bell'], ['profile.html', 'Profil & pengaturan', 'settings'], ['help.html', 'Bantuan & laporan', 'help']]],
    ],
    admin: [
      ['Ringkasan', [['dashboard.html', 'Dashboard', 'chart']]],
      ['Manajemen', [['admin-users.html', 'Pengguna', 'users'], ['admin-foods.html', 'Publikasi makanan', 'package'], ['admin-requests.html', 'Permintaan', 'inbox'], ['admin-categories.html', 'Kategori', 'tag'], ['admin-campaigns.html', 'Kampanye', 'gift']]],
      ['Moderasi', [['admin-reports.html', 'Laporan', 'flag'], ['admin-audit.html', 'Log audit', 'shield']]],
      ['Akun', [['notifications.html', 'Notifikasi', 'bell'], ['profile.html', 'Profil', 'settings']]],
    ],
  };
  const PUBLIC_LINKS = [['explore.html', 'Jelajahi'], ['how-it-works.html', 'Cara kerja'], ['campaigns.html', 'Kampanye'], ['impact.html', 'Dampak'], ['leaderboard.html', 'Peringkat'], ['help.html', 'Bantuan']];

  function topbar() {
    const links = PUBLIC_LINKS.map(([h, t]) => `<a href="${h}" ${h === here ? 'aria-current="page"' : ''}>${t}</a>`).join('');
    const right = user && api.session.loggedIn
      ? `<a class="btn btn-ghost btn-sm bell" href="notifications.html" aria-label="Notifikasi">${icon('bell')}<span class="dot hidden" id="bell-dot">0</span></a>
         <a class="btn btn-secondary btn-sm" href="dashboard.html">${icon('home')} Dashboard</a>
         <button class="btn btn-ghost btn-sm" id="logout" aria-label="Keluar">${icon('logout')}</button>`
      : '<a class="btn btn-secondary btn-sm" href="login.html">Masuk</a><a class="btn btn-primary btn-sm" href="register.html">Daftar</a>';
    return `<a class="skip" href="#view">Lewati ke konten</a>
      <header class="topbar"><div class="container"><a class="brand" href="index.html">${icon('leaf')}Share<b>Bite</b></a>
        <nav class="nav" id="nav" aria-label="Navigasi utama">${links}</nav><div class="row" style="margin-left:auto">${right}
        <button class="btn btn-ghost btn-sm menu-btn" id="menu-btn" aria-label="Menu" aria-expanded="false">${icon('menu')}</button></div></div></header>`;
  }

  function sidebar() {
    const groups = (MENU[user.role] || []).map(([g, items]) => `<div class="grp">${g}</div>${items.map(([h, t, ic]) => `<a href="${h}" ${h === here ? 'aria-current="page"' : ''}>${icon(ic)}<span>${t}</span></a>`).join('')}`).join('');
    return `<aside class="side" id="side" aria-label="Menu dashboard"><div class="row" style="padding:.6rem .7rem"><span class="badge b-approved">${esc(ui.ROLE[user.role])}</span><span class="small muted">${esc(user.name)}</span></div>${groups}</aside>`;
  }

  function crumbs() {
    const parts = [['Beranda', 'index.html']];
    if (layout === 'app') parts.push(['Dashboard', 'dashboard.html']);
    if (body.dataset.parent) { const [t, h] = body.dataset.parent.split('|'); parts.push([t, h]); }
    const cur = body.dataset.title || document.title;
    return `<nav class="crumbs" aria-label="Breadcrumb">${parts.map(([t, h]) => `<a href="${h}">${esc(t)}</a><span aria-hidden="true">/</span>`).join('')}<span aria-current="page">${esc(cur)}</span></nav>`;
  }

  const footer = `<footer class="foot"><div class="container"><div class="grid g4">
      <div><div class="brand" style="color:#fff">${icon('leaf')}Share<b>Bite</b></div><p class="small" style="margin-top:.6rem">Platform berbagi makanan berlebih yang masih layak dikonsumsi.</p></div>
      <div><h4>Jelajahi</h4><ul><li><a href="explore.html">Cari makanan</a></li><li><a href="campaigns.html">Kampanye</a></li><li><a href="impact.html">Dampak</a></li><li><a href="leaderboard.html">Peringkat</a></li></ul></div>
      <div><h4>Bantuan</h4><ul><li><a href="how-it-works.html">Cara kerja</a></li><li><a href="faq.html">FAQ</a></li><li><a href="help.html">Pusat bantuan</a></li></ul></div>
      <div><h4>Tentang</h4><ul><li><a href="about.html">Tentang ShareBite</a></li><li><a href="terms.html">Kebijakan privasi & ketentuan</a></li></ul></div></div>
      <p class="small" style="margin-top:1.6rem;opacity:.8">© ${new Date().getFullYear()} ShareBite — proyek mata kuliah Cloud Computing.</p></div></footer>`;

  const view = $('#view');
  const content = view.outerHTML;
  const wide = body.dataset.wide === '1';
  const head = layout === 'app' && user
    ? `${topbar()}<div class="container app">${sidebar()}<main id="view-wrap" tabindex="-1">${crumbs()}${content}</main></div>`
    : `${topbar()}<main id="view-wrap">${wide ? content : `<div class="container" style="padding-block:1.6rem">${crumbs()}${content}</div>`}</main>`;
  view.remove();
  body.insertAdjacentHTML('afterbegin', head);
  body.insertAdjacentHTML('beforeend', footer);

  const menuBtn = $('#menu-btn');
  if (menuBtn) menuBtn.onclick = () => { const o = $('#nav').classList.toggle('open'); const s = $('#side'); if (s) s.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', String(o)); };
  const lo = $('#logout'); if (lo) lo.onclick = async () => { await api.logout(); location.href = 'index.html'; };

  // polling notifikasi (30 dtk)
  if (user && api.session.loggedIn) {
    const tick = async () => {
      try { const n = (await api.donation('GET', '/notifications/unread-count')).data.unread; const d = $('#bell-dot'); if (d) { d.textContent = n > 99 ? '99+' : n; d.classList.toggle('hidden', n === 0); } } catch (_) { /* diam */ }
    };
    tick(); setInterval(tick, 30000);
  }
  if (body.dataset.title) document.title = `${body.dataset.title} · ShareBite`;
})();
