(function () {
  ui.nav('index.html');
  const u = api.session.user;
  const cta = document.getElementById('cta');
  if (!u) {
    cta.innerHTML = '<a class="btn btn-terra btn-lg" href="register.html">Mulai sekarang</a><a class="btn btn-outline-light btn-lg" href="login.html">Masuk</a>';
    return;
  }
  cta.innerHTML = `<a class="btn btn-terra btn-lg" href="catalog.html">Lihat katalog</a><a class="btn btn-outline-light btn-lg" href="${ui.home(u)}">Ke dashboard saya</a>`;
  const el = document.getElementById('latest');
  ui.loading(el);
  api.food('GET', '/foods?per_page=3').then((r) => {
    if (!r.data.length) return ui.empty(el, '🍽️', 'Belum ada makanan', 'Jadilah yang pertama membagikan.');
    el.innerHTML = '<div class="row g-3">' + r.data.map((f) => `
      <div class="col-md-4"><a class="text-decoration-none text-reset" href="food-detail.html?id=${f.id}"><div class="card-sb food-card">
        <img src="${ui.img(f.image_url)}" alt="" loading="lazy"><div class="p-3"><h5 class="mb-1">${ui.esc(f.title)}</h5>
        <div class="text-muted small">${f.quantity_available} ${ui.esc(f.unit)} tersisa</div></div></div></a></div>`).join('') + '</div>';
  }).catch((e) => ui.errorBox(el, e));
})();
