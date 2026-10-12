(function () {
  ui.nav('');
  const u = api.session.user;
  if (u && api.session.token) { location.href = ui.home(u); return; }
  const form = document.getElementById('f');
  const alert = document.getElementById('alert');
  const isRegister = !!form.querySelector('[name="role"]');
  const next = new URLSearchParams(location.search).get('next');

  const showAlert = (msg) => { alert.innerHTML = `<div class="alert alert-danger py-2">${ui.esc(msg)}</div>`; };

  async function login(email, password) {
    const res = await api.raw('POST', `${api.base.DONATION}/api/v1/auth/login`, { body: { email, password } });
    api.session.save(res.data);
    const safeNext = next && /^[a-z-]+\.html(\?.*)?$/.test(next) ? next : ui.home(res.data.user);
    location.href = safeNext;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert.innerHTML = '';
    ui.fieldErrors(form, {});
    const d = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button[type=submit]');
    try {
      await ui.busy(btn, async () => {
        if (isRegister) {
          if (d.password !== d.password_confirmation) {
            ui.fieldErrors(form, { password_confirmation: ['Konfirmasi password tidak cocok.'] });
            return;
          }
          Object.keys(d).forEach((k) => { if (d[k] === '') delete d[k]; });
          await api.raw('POST', `${api.base.DONATION}/api/v1/auth/register`, { body: d });
          await login(d.email, d.password);
        } else {
          await login(d.email, d.password);
        }
      });
    } catch (err) {
      if (err.status === 422) { ui.fieldErrors(form, err.details); showAlert('Periksa kembali isian Anda.'); }
      else showAlert(err.code === 'RATE_LIMITED' ? err.message : err.message);
    }
  });
})();
