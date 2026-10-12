(function () {
  const user = ui.guard();
  if (!user) return;
  ui.nav('');
  const pf = document.getElementById('pf');
  const pw = document.getElementById('pw');
  const fill = (u) => { document.getElementById('email').value = u.email; document.getElementById('role').value = ui.ROLE[u.role]; pf.name.value = u.name; pf.phone.value = u.phone || ''; pf.address.value = u.address || ''; };
  api.donation('GET', '/auth/me').then((r) => { api.session.setUser(r.data); fill(r.data); }).catch((e) => ui.toast(e.message, 'err'));

  pf.addEventListener('submit', async (e) => {
    e.preventDefault(); ui.fieldErrors(pf, {});
    const d = Object.fromEntries(new FormData(pf));
    try {
      const r = await ui.busy(pf.querySelector('button'), () => api.donation('PATCH', '/auth/me', { body: { name: d.name, phone: d.phone || null, address: d.address || null } }));
      api.session.setUser(r.data); ui.nav(''); ui.toast('Profil diperbarui.');
    } catch (err) { if (err.status === 422) ui.fieldErrors(pf, err.details); ui.toast(ui.errText(err), 'err'); }
  });
  pw.addEventListener('submit', async (e) => {
    e.preventDefault(); ui.fieldErrors(pw, {});
    const d = Object.fromEntries(new FormData(pw));
    try {
      await ui.busy(pw.querySelector('button'), () => api.donation('PATCH', '/auth/me', { body: d }));
      pw.reset(); ui.toast('Password berhasil diganti.');
    } catch (err) { if (err.status === 422) ui.fieldErrors(pw, err.details); ui.toast(ui.errText(err), 'err'); }
  });
})();
