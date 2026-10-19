(async function () {
  const { $, esc } = ui; const box = $('#page'); let page = 1;
  box.innerHTML = '<div class="page-head"><h1>Favorit saya</h1></div><div id="list"></div><div id="pager"></div>';
  async function load() {
    const el = $('#list'); ui.skeleton(el, 3);
    try {
      const r = await api.donation('GET', `/favorites?page=${page}&per_page=9`);
      if (!r.data.length) return ui.empty(el, 'heart', 'Belum ada favorit', 'Ketuk ikon hati pada makanan untuk menyimpannya.', '<a class="btn btn-primary" href="explore.html">Jelajahi makanan</a>');
      const foods = await Promise.all(r.data.map(async (f) => { try { return { fav: f, food: (await api.food('GET', `/foods/${f.food_id}`)).data }; } catch (e) { return { fav: f, food: null }; } }));
      const favs = new Set(r.data.map((f) => f.food_id));
      el.innerHTML = `<div class="grid g3">${foods.map(({ fav, food }) => {
        if (!food) return `<article class="card pad"><span class="badge b-closed">Tidak tersedia</span><h3 style="margin-top:.6rem">${esc(fav.food_title || 'Makanan #' + fav.food_id)}</h3><p class="muted small">Makanan ini sudah dihapus donatur.</p><button class="btn btn-secondary btn-sm" data-rm="${fav.food_id}">Hapus dari favorit</button></article>`;
        const unavailable = food.status !== 'available' || new Date(food.expires_at) <= new Date();
        return unavailable ? `<div>${ui.foodCard(food, { favs })}</div>` : ui.foodCard(food, { favs });
      }).join('')}</div>`;
      ui.bindFavs(el, favs);
      ui.$$('[data-rm]', el).forEach((b) => b.onclick = async () => { try { await api.donation('DELETE', `/favorites/${b.dataset.rm}`); ui.toast('Dihapus dari favorit.'); load(); } catch (e) { ui.toast(ui.errText(e), 'err'); } });
      ui.pager($('#pager'), r.meta, (p) => { page = p; load(); });
    } catch (e) { ui.errorBox(el, e, load); }
  }
  load();
})();
