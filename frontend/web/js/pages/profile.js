(async function () {
  const { $, esc } = ui; const box = $('#page'); let u = api.session.user;
  try { u = (await api.donation('GET', '/auth/me')).data; api.session.setUser(u); } catch (_) { /* pakai cache */ }
  box.innerHTML = `<div class="page-head"><h1>Profil &amp; pengaturan</h1></div><div class="grid g2" style="align-items:start">
  <div class="card pad"><h3>Informasi akun</h3><form id="pf" novalidate><div class="field"><label>Email</label><input class="input" value="${esc(u.email)}" disabled></div><div class="field"><label>Peran</label><input class="input" value="${esc(ui.ROLE[u.role])}" disabled></div>
    <div class="field"><label for="name">Nama</label><input id="name" name="name" class="input" value="${esc(u.name)}" required></div><div class="field"><label for="phone">No. telepon</label><input id="phone" name="phone" class="input" value="${esc(u.phone || '')}" inputmode="numeric"></div>
    <div class="field"><label for="address">Alamat</label><input id="address" name="address" class="input" value="${esc(u.address || '')}"></div><button class="btn btn-green" type="submit">Simpan perubahan</button></form></div>
  <div class="stack"><div class="card pad"><h3>Preferensi</h3><label class="check field"><input type="checkbox" id="notif" ${u.notify_enabled ? 'checked' : ''}><span><b>Terima notifikasi</b><br><span class="small muted">Permintaan baru, persetujuan, jadwal, dan pengingat pengambilan.</span></span></label>
    <label class="check field"><input type="checkbox" id="lb" ${u.leaderboard_visible ? 'checked' : ''}><span><b>Tampil di papan peringkat</b><br><span class="small muted">Nama dan poin Anda terlihat publik bila diaktifkan.</span></span></label></div>
  <div class="card pad"><h3>Ganti password</h3><form id="pw" novalidate><div class="field"><label for="cur">Password lama</label><input id="cur" name="current_password" type="password" class="input" autocomplete="current-password"></div>
    <div class="field"><label for="neu">Password baru</label><input id="neu" name="new_password" type="password" class="input" autocomplete="new-password"><div class="hint">Minimal 8 karakter, ada huruf dan angka.</div></div><button class="btn btn-secondary" type="submit">Ganti password</button></form></div></div></div>`;
  const patch = async (body, okMsg) => { const r = await api.donation('PATCH', '/auth/me', { body }); api.session.setUser(r.data); ui.toast(okMsg); return r.data; };
  $('#pf').addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target; ui.fieldErrors(f, {}); const d = Object.fromEntries(new FormData(f));
    try { await ui.busy(f.querySelector('button'), () => patch({ name: d.name, phone: d.phone || null, address: d.address || null }, 'Profil diperbarui.')); } catch (er) { if (er.status === 422) ui.fieldErrors(f, er.details); ui.toast(ui.errText(er), 'err'); } });
  $('#pw').addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target; ui.fieldErrors(f, {}); const d = Object.fromEntries(new FormData(f));
    try { await ui.busy(f.querySelector('button'), () => patch({ current_password: d.current_password, new_password: d.new_password }, 'Password berhasil diganti.')); f.reset(); } catch (er) { if (er.status === 422) ui.fieldErrors(f, er.details); ui.toast(ui.errText(er), 'err'); } });
  $('#notif').onchange = async (e) => { try { await patch({ notify_enabled: e.target.checked }, 'Preferensi notifikasi disimpan.'); } catch (er) { e.target.checked = !e.target.checked; ui.toast(ui.errText(er), 'err'); } };
  $('#lb').onchange = async (e) => { try { await patch({ leaderboard_visible: e.target.checked }, 'Preferensi peringkat disimpan.'); } catch (er) { e.target.checked = !e.target.checked; ui.toast(ui.errText(er), 'err'); } };
})();
