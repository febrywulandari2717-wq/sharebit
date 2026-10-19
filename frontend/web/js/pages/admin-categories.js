(async function () {
  const { $, esc } = ui; const box = $('#page');
  box.innerHTML = `<div class="page-head"><h1>Kategori makanan</h1></div><form id="nf" class="row" style="margin-bottom:1rem" novalidate><label class="sr-only" for="nn">Nama kategori baru</label><input id="nn" name="name" class="input" style="max-width:320px" placeholder="Nama kategori baru" maxlength="80"><button class="btn btn-primary" type="submit">${ui.icon('plus')} Tambah</button></form><div id="list"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 2, 'row');
    try {
      const r = await api.food('GET', '/categories');
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Nama</th><th></th></tr></thead><tbody>${r.data.map((c) => `<tr><td>${c.id}</td><td><b>${esc(c.name)}</b></td><td class="right"><button class="btn btn-secondary btn-sm" data-e="${c.id}" data-n="${esc(c.name)}">Ubah</button> <button class="btn btn-danger btn-sm" data-d="${c.id}" data-n="${esc(c.name)}">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      ui.$$('[data-e]', el).forEach((b) => b.onclick = () => { const m = ui.modal(`<h3>Ubah kategori</h3><form id="ef"><div class="field"><label for="en">Nama</label><input id="en" name="name" class="input" value="${b.dataset.n}" maxlength="80"></div><div class="actions"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary">Simpan</button></div></form>`);
        ui.$('[data-x]', m.el).onclick = () => m.close(); ui.$('#ef', m.el).onsubmit = async (e) => { e.preventDefault(); try { await api.food('PATCH', `/categories/${b.dataset.e}`, { body: { name: ui.$('#en', m.el).value } }); m.close(); ui.toast('Kategori diubah.'); load(); } catch (er) { ui.toast(ui.errText(er), 'err'); } }; });
      ui.$$('[data-d]', el).forEach((b) => b.onclick = async () => { if (!await ui.confirm({ title: 'Hapus kategori?', message: `“${b.dataset.n}” hanya bisa dihapus jika tidak dipakai makanan aktif.`, confirmText: 'Hapus', danger: true })) return;
        try { await api.food('DELETE', `/categories/${b.dataset.d}`); ui.toast('Kategori dihapus.'); load(); } catch (e) { ui.toast(ui.errText(e), 'err'); } });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const f = e.target; ui.fieldErrors(f, {}); try { await api.food('POST', '/categories', { body: { name: f.name.value } }); f.reset(); ui.toast('Kategori ditambahkan.'); load(); } catch (er) { if (er.status === 422) ui.fieldErrors(f, er.details); ui.toast(ui.errText(er), 'err'); } };
  load();
})();
