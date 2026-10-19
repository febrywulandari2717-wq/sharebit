(function () {
  const { $ } = ui; const form = $('#f'); const alert = $('#alert');
  if (api.session.loggedIn) { location.replace('dashboard.html'); return; }
  const isRegister = !!form.querySelector('[name=role]'); const sp = new URLSearchParams(location.search);
  if (isRegister && sp.get('role') === 'donor') form.role.value = 'donor';
  const showAlert = (m) => { alert.innerHTML = `<div class="alert alert-err">${ui.esc(m)}</div>`; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); alert.innerHTML = ''; ui.fieldErrors(form, {}); const d = Object.fromEntries(new FormData(form)); const btn = form.querySelector('button[type=submit]');
    try {
      await ui.busy(btn, async () => {
        if (isRegister) {
          const local = {}; if (d.password !== d.password_confirmation) local.password_confirmation = ['Konfirmasi password tidak cocok.']; if (!$('#agree').checked) { showAlert('Setujui kebijakan privasi & ketentuan untuk melanjutkan.'); return; }
          if (Object.keys(local).length) { ui.fieldErrors(form, local); return; }
          Object.keys(d).forEach((k) => { if (d[k] === '') delete d[k]; });
          await api.raw('POST', `${api.base.DONATION}/api/v1/auth/register`, { body: d });
        }
        const u = await api.login(d.email, d.password);
        const next = sp.get('next'); location.href = next && /^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(next) ? next : 'dashboard.html';
        return u;
      });
    } catch (err) { if (err.status === 422) { ui.fieldErrors(form, err.details); showAlert('Periksa kembali isian Anda.'); } else showAlert(err.message); }
  });
})();
