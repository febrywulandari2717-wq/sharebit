(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1;
  box.innerHTML = `<div class="page-head"><h1>Kampanye</h1><button class="btn btn-primary" id="add">${ui.icon('plus')} Kampanye baru</button></div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 2, 'row');
    try {
      const r = await api.donation('GET', `/campaigns?page=${page}&per_page=10`);
      if (!r.data.length) return ui.empty(el, 'gift', 'Belum ada kampanye', 'Buat kampanye pertama untuk komunitas.');
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Judul</th><th>Periode</th><th>Target</th><th>Kemajuan</th><th>Status</th><th></th></tr></thead><tbody>${r.data.map((k) => `<tr><td><b>${esc(k.title)}</b></td><td class="small">${ui.fmtDay(k.starts_at)} – ${ui.fmtDay(k.ends_at)}</td><td>${k.target_portions}</td><td>${k.progress.portions} (${k.progress.percent}%) · ${k.progress.participants} peserta</td><td>${ui.badge(k.status)}</td><td class="right"><button class="btn btn-secondary btn-sm" data-id="${k.id}">Ubah</button></td></tr>`).join('')}</tbody></table></div>`;
      const byId = Object.fromEntries(r.data.map((k) => [k.id, k]));
      ui.$$('button[data-id]', el).forEach((b) => b.onclick = () => form(byId[b.dataset.id]));
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  function form(k) {
    const now = new Date();
    const m = ui.modal(`<h3>${k ? 'Ubah' : 'Buat'} kampanye</h3><form id="cf" novalidate><div class="field"><label for="t">Judul</label><input id="t" name="title" class="input" value="${esc(k ? k.title : '')}" maxlength="150"></div><div class="field"><label for="d">Deskripsi</label><textarea id="d" name="description" class="input">${esc(k ? k.description || '' : '')}</textarea></div>
      <div class="grid g2"><div class="field"><label for="tp">Target porsi</label><input id="tp" name="target_portions" type="number" min="1" class="input" value="${k ? k.target_portions : 100}"></div><div class="field"><label for="s">Status</label><select id="s" name="status" class="input">${['active', 'draft', 'ended'].map((s) => `<option value="${s}" ${k && k.status === s ? 'selected' : ''}>${ui.LABEL[s] || s}</option>`).join('')}</select></div>
      <div class="field"><label for="sa">Mulai</label><input id="sa" name="starts_at" type="datetime-local" class="input" value="${ui.toLocalInput(k ? k.starts_at : now)}"></div><div class="field"><label for="ea">Selesai</label><input id="ea" name="ends_at" type="datetime-local" class="input" value="${ui.toLocalInput(k ? k.ends_at : new Date(now.getTime() + 30 * 86400e3))}"></div></div>
      <div class="actions"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary" type="submit">Simpan</button></div></form>`);
    ui.$('[data-x]', m.el).onclick = () => m.close();
    ui.$('#cf', m.el).onsubmit = async (e) => { e.preventDefault(); const f = e.target; ui.fieldErrors(f, {}); const d = Object.fromEntries(new FormData(f));
      const body = { title: d.title, description: d.description || null, target_portions: Number(d.target_portions), starts_at: ui.toIso(d.starts_at), ends_at: ui.toIso(d.ends_at), status: d.status };
      try { await (k ? api.donation('PATCH', `/campaigns/${k.id}`, { body }) : api.donation('POST', '/campaigns', { body })); m.close(); ui.toast('Kampanye tersimpan.'); load(); } catch (er) { if (er.status === 422) ui.fieldErrors(f, er.details); ui.toast(ui.errText(er), 'err'); } };
  }
  $('#add').onclick = () => form(null); load();
})();
