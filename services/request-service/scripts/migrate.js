const config = require('../src/config');
const { ensureDatabase, pool } = require('../src/db/pool');
const { migrate } = require('../src/db/schema');

(async () => {
  try {
    await ensureDatabase();
    await migrate();
    console.log(`✓ Migrasi selesai (${config.db.database}).`);
  } catch (err) {
    console.error('✗ Migrasi gagal:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
