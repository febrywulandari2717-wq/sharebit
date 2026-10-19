(async function () {
  const { $, esc } = ui; const box = $('#page'); const user = api.session.loggedIn ? api.session.user : null;
  box.innerHTML = `<h1>Pusat bantuan</h1><p class="muted">Panduan singkat untuk donatur, penerima, dan pengambilan makanan.</p>
  <div class="grid g3" style="margin-top:1rem"><div class="card pad"><h3>Panduan donatur</h3><ol class="small"><li>Buka <i>Tambah donasi</i>, isi data lengkap dan jujur.</li><li>Setujui/tolak permintaan dalam 24 jam.</li><li>Jadwalkan pengambilan dan konfirmasi saat serah terima.</li></ol></div>
  <div class="card pad"><h3>Panduan penerima</h3><ol class="small"><li>Cari makanan, periksa alergen &amp; batas konsumsi.</li><li>Ajukan jumlah yang benar-benar dibutuhkan.</li><li>Pantau status di <i>Permintaan saya</i>.</li></ol></div>
  <div class="card pad"><h3>Panduan pengambilan</h3><ol class="small"><li>Datang pada jadwal; hubungi donatur lewat instruksi yang tertera.</li><li>Periksa kondisi makanan sebelum menerima.</li><li>Tekan <i>Konfirmasi serah terima</i> (kedua pihak).</li></ol></div></div>
  <div class="card pad" style="margin-top:1.2rem"><h3>Melaporkan masalah</h3><p>Buka halaman makanan yang bermasalah lalu klik <b>Laporkan makanan ini</b>. Admin akan meninjau dan memberi tahu Anda lewat notifikasi. Pertanyaan umum ada di <a href="faq.html">FAQ</a>.</p></div>
  <section id="laporan-saya" style="margin-top:1.6rem"><h2>Laporan saya</h2><div id="mine"></div></section>`;
  const el = $('#mine');
  if (!user) return ui.empty(el, 'flag', 'Masuk untuk melihat laporan Anda', '', '<a class="btn btn-primary" href="login.html?next=help.html">Masuk</a>');
  try {
    const r = await api.donation('GET', '/reports/mine');
    if (!r.data.length) return ui.empty(el, 'flag', 'Belum ada laporan', 'Laporan yang Anda kirim akan tampil di sini beserta statusnya.');
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Objek</th><th>Alasan</th><th>Status</th><th>Catatan admin</th></tr></thead><tbody>${r.data.map((x) => `<tr><td>${ui.fmtDay(x.created_at)}</td><td>${x.target_type === 'food' ? `<a href="food-detail.html?id=${x.target_id}">Makanan #${x.target_id}</a>` : `Pengguna #${x.target_id}`}</td><td>${esc(ui.REASON[x.reason] || x.reason)}</td><td>${ui.badge(x.status)}</td><td>${esc(x.admin_note || '-')}</td></tr>`).join('')}</tbody></table></div>`;
  } catch (e) { ui.errorBox(el, e); }
})();
