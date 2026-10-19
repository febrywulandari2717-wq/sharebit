(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1; let t;
  box.innerHTML = `<div class="page-head"><div><h1>Log audit</h1><p class="muted" style="margin:0">Catatan tindakan penting. Password, token, dan rahasia tidak pernah disimpan.</p></div></div><div class="row" style="margin-bottom:1rem"><input id="a" class="input" style="max-width:280px" placeholder="Filter aksi (mis. report., user.)" aria-label="Filter aksi"></div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 3, 'row');
    try {
      const r = await api.donation('GET', `/audit-logs${api.qs({ action: $('#a').value.trim(), page, per_page: 20 })}`);
      if (!r.data.length) return ui.empty(el, 'shield', 'Belum ada catatan', 'Tindakan admin akan tercatat di sini.');
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Aksi</th><th>Pelaku</th><th>Objek</th><th>Detail</th></tr></thead><tbody>${r.data.map((l) => `<tr><td>${ui.fmtDate(l.created_at)}</td><td><span class="badge">${esc(l.action)}</span></td><td>${esc(l.actor_role || 'sistem')} #${l.actor_id ?? '-'}</td><td>${esc(l.target_type || '-')} ${esc(l.target_id || '')}</td><td class="small">${l.meta ? esc(JSON.stringify(l.meta)) : '-'}</td></tr>`).join('')}</tbody></table></div>`;
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  $('#a').oninput = () => { clearTimeout(t); t = setTimeout(() => { page = 1; load(); }, 300); }; load();
})();
