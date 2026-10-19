(async function () {
  const { $, esc } = ui; const box = $('#page'); const me = api.session.user; let page = 1; let t;
  box.innerHTML = `<div class="page-head"><h1>Manajemen pengguna</h1></div><div class="row" style="margin-bottom:1rem"><input id="q" class="input" style="max-width:300px" placeholder="Cari nama atau email" aria-label="Cari pengguna"><select id="role" class="input" style="max-width:200px" aria-label="Peran"><option value="">Semua peran</option><option value="donor">Donatur</option><option value="recipient">Penerima</option><option value="admin">Admin</option></select><select id="act" class="input" style="max-width:200px" aria-label="Status"><option value="">Semua status</option><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div><div id="list"></div><div id="pager"></div>`;
  async function load() {
    const el = $('#list'); ui.skeleton(el, 3, 'row');
    try {
      const r = await api.donation('GET', `/users${api.qs({ q: $('#q').value.trim(), role: $('#role').value, is_active: $('#act').value, page, per_page: 10 })}`);
      if (!r.data.length) return ui.empty(el, 'users', 'Tidak ada pengguna', 'Ubah pencarian atau filter.');
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th>Terdaftar</th><th></th></tr></thead><tbody>${r.data.map((u) => `<tr><td>${u.id}</td><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${esc(ui.ROLE[u.role])}</td><td>${ui.badge(u.is_active ? 'active' : 'inactive')}</td><td>${ui.fmtDay(u.created_at)}</td>
        <td class="right">${u.id === me.id ? '<span class="muted small">Anda</span>' : `<button class="btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-secondary'}" data-id="${u.id}" data-on="${u.is_active ? 0 : 1}" data-n="${esc(u.name)}">${u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
      ui.$$('button[data-id]', el).forEach((b) => b.onclick = async () => {
        const on = b.dataset.on === '1'; if (!await ui.confirm({ title: `${on ? 'Aktifkan' : 'Nonaktifkan'} akun?`, message: `${b.dataset.n} ${on ? 'dapat masuk kembali.' : 'tidak dapat masuk dan sesi login dicabut.'} Tindakan dicatat di log audit.`, confirmText: on ? 'Aktifkan' : 'Nonaktifkan', danger: !on })) return;
        try { await api.donation('PATCH', `/users/${b.dataset.id}`, { body: { is_active: on } }); ui.toast('Status pengguna diperbarui.'); load(); } catch (e) { ui.toast(ui.errText(e), 'err'); }
      });
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  const d = () => { clearTimeout(t); t = setTimeout(() => { page = 1; load(); }, 300); };
  $('#q').oninput = d; $('#role').onchange = d; $('#act').onchange = d; load();
})();
