(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1; let unread = false;
  box.innerHTML = `<div class="page-head"><h1>Notifikasi</h1><div class="row"><button class="chip" id="only" aria-pressed="false">Belum dibaca</button><button class="btn btn-secondary btn-sm" id="all">Tandai semua dibaca</button></div></div><div class="card" id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 3, 'row');
    try {
      const r = await api.donation('GET', `/notifications${api.qs({ unread: unread ? 1 : '', page, per_page: 12 })}`);
      if (!r.data.length) return ui.empty(el, 'bell', unread ? 'Tidak ada notifikasi baru' : 'Belum ada notifikasi', 'Pemberitahuan permintaan, jadwal, dan status akan muncul di sini.');
      el.innerHTML = r.data.map((n) => `<a class="notif ${n.read ? '' : 'unread'}" href="${esc(n.link || '#')}" data-id="${n.id}"><span style="color:var(--forest)">${ui.icon('bell')}</span><div class="grow"><b>${esc(n.title)}</b><div class="small">${esc(n.body || '')}</div><div class="small muted">${ui.relTime(n.created_at)}${n.read ? '' : ' · baru'}</div></div></a>`).join('');
      ui.$$('.notif', el).forEach((a) => a.addEventListener('click', () => { api.donation('POST', `/notifications/${a.dataset.id}/read`).catch(() => {}); }));
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  $('#only').onclick = () => { unread = !unread; $('#only').setAttribute('aria-pressed', String(unread)); page = 1; load(); };
  $('#all').onclick = async () => { try { await api.donation('POST', '/notifications/read-all'); ui.toast('Semua notifikasi ditandai dibaca.'); const d = ui.$('#bell-dot'); if (d) d.classList.add('hidden'); load(); } catch (e) { ui.toast(ui.errText(e), 'err'); } };
  load();
})();
