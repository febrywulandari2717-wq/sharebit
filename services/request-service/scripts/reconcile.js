const { pool } = require('../src/db/pool');
const reconcile = require('../src/services/reconcileService');

(async () => {
  try {
    const r = await reconcile.run();
    console.log(`✓ Rekonsiliasi selesai: ${r.failed} failed, ${r.expired} expired, ${r.released} stok dilepas.`);
  } catch (err) {
    console.error('✗ Rekonsiliasi gagal:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
