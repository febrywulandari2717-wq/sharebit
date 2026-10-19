(async function () {
  const { $, esc } = ui; const box = $('#page'); const user = api.session.loggedIn ? api.session.user : null;
  box.innerHTML = `<div class="page-head"><div><h1>Peringkat kontribusi</h1><p class="muted" style="margin:0">Berdasarkan donasi yang benar-benar selesai.</p></div>
    <div class="row" role="group" aria-label="Periode"><button class="chip" data-p="month" aria-pressed="false">Bulan ini</button><button class="chip" data-p="all" aria-pressed="true">Sepanjang waktu</button></div></div>
    <div id="rules" class="alert alert-info"></div><div id="lb"></div><div id="me" style="margin-top:1.6rem"></div>`;
  async function load(period) {
    ui.$$('[data-p]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === period)));
    const el = $('#lb'); ui.skeleton(el, 3, 'row');
    try {
      const r = (await api.pubDonation(`/leaderboard?period=${period}`)).data;
      $('#rules').innerHTML = `<b>Aturan poin:</b> ${r.rules.donor_completed_donation} poin per donasi selesai + ${r.rules.donor_per_portion} poin per porsi. ${esc(r.rules.note)} <br><span class="small">${esc(r.privacy)}</span>`;
      if (!r.entries.length) return ui.empty(el, 'trophy', 'Belum ada peringkat', 'Peringkat muncul setelah ada donasi yang selesai.');
      el.innerHTML = `<div class="table-wrap"><table><caption class="sr-only">Peringkat</caption><thead><tr><th>#</th><th>Nama</th><th>Poin</th><th>Donasi selesai</th><th>Porsi</th></tr></thead><tbody>${r.entries.map((e) => `<tr><td><span class="rank r${e.rank}">${e.rank}</span></td><td><b>${esc(e.name)}</b></td><td>${e.points}</td><td>${e.donations}</td><td>${e.portions}</td></tr>`).join('')}</tbody></table></div>`;
    } catch (e) { ui.errorBox(el, e, () => load(period)); }
  }
  ui.$$('[data-p]').forEach((b) => b.onclick = () => load(b.dataset.p));
  load('all');
  if (user && user.role === 'donor') {
    try {
      const g = (await api.donation('GET', '/me/gamification')).data;
      $('#me').innerHTML = `<h2>Pencapaian Anda</h2><p>${g.points} poin · ${g.completed_donations} donasi selesai · ${g.portions_shared} porsi${g.rank ? ` · peringkat #${g.rank}` : ''}</p><div class="grid g4">${g.badges.map((b) => `<div class="card badge-card ${b.earned ? 'earned' : ''}"><div class="ic">${b.earned ? '🏅' : '🔒'}</div><b>${esc(b.name)}</b><p class="small muted" style="margin:.3rem 0">${esc(b.description)}</p><span class="small">${b.progress}/${b.target}</span></div>`).join('')}</div>`;
    } catch (_) { /* opsional */ }
  }
})();
