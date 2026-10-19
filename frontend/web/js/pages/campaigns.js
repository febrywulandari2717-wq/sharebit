(async function () {
  const { $, esc } = ui; const box = $('#page'); const user = api.session.loggedIn ? api.session.user : null; const num = (n) => Number(n).toLocaleString('id-ID');
  box.innerHTML = '<h1>Kampanye komunitas</h1><p class="muted">Bergabung dan salurkan donasi bersama. Kemajuan dihitung dari donasi yang benar-benar selesai milik peserta selama periode kampanye.</p><div id="list" style="margin-top:1rem"></div>';
  async function load() {
    const list = $('#list'); ui.skeleton(list, 3);
    try {
      const r = user ? await api.donation('GET', '/campaigns?per_page=24') : await api.pubDonation('/campaigns?per_page=24');
      const items = r.data.filter((k) => k.status !== 'draft');
      if (!items.length) return ui.empty(list, 'gift', 'Belum ada kampanye', 'Kampanye akan ditambahkan oleh admin.');
      list.innerHTML = `<div class="grid g3">${items.map((k) => `<article class="card pad"><div class="row between"><span class="badge b-${k.state === 'running' ? 'approved' : k.state === 'upcoming' ? 'scheduled' : 'closed'}">${ui.LABEL[k.state]}</span><span class="small muted">${ui.fmtDay(k.starts_at)} – ${ui.fmtDay(k.ends_at)}</span></div>
        <h3 style="margin-top:.7rem">${esc(k.title)}</h3><p class="muted">${esc(k.description || '')}</p>
        <div class="progress" role="progressbar" aria-valuenow="${k.progress.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="Kemajuan"><i style="width:${k.progress.percent}%"></i></div>
        <p class="small muted" style="margin:.4rem 0 1rem">${num(k.progress.portions)} dari ${num(k.target_portions)} porsi (${k.progress.percent}%) · ${k.progress.participants} peserta</p>
        ${k.state === 'running' ? (user ? (k.joined ? `<button class="btn btn-secondary btn-sm" data-leave="${k.id}">Keluar kampanye</button>` : `<button class="btn btn-primary btn-sm" data-join="${k.id}">Ikut kampanye</button>`) : '<a class="btn btn-primary btn-sm" href="login.html?next=campaigns.html">Masuk untuk ikut</a>') : ''}</article>`).join('')}</div>`;
      ui.$$('[data-join]', list).forEach((b) => b.onclick = async () => { try { await api.donation('POST', `/campaigns/${b.dataset.join}/join`); ui.toast('Anda bergabung di kampanye.'); load(); } catch (e) { ui.toast(ui.errText(e), 'err'); } });
      ui.$$('[data-leave]', list).forEach((b) => b.onclick = async () => { try { await api.donation('DELETE', `/campaigns/${b.dataset.leave}/join`); ui.toast('Anda keluar dari kampanye.'); load(); } catch (e) { ui.toast(ui.errText(e), 'err'); } });
    } catch (e) { ui.errorBox(list, e, load); }
  }
  load();
})();
