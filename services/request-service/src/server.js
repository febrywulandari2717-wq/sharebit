const config = require('./config');
const { ensureDatabase, pool } = require('./db/pool');
const { migrate } = require('./db/schema');
const { createApp } = require('./app');
const reconcile = require('./services/reconcileService');

async function start() {
  try {
    await ensureDatabase();
    await migrate();
    console.log('✓ Database siap:', config.db.database);
  } catch (err) {
    console.error('✗ Gagal menyiapkan database:', err.message);
    console.error('  Pastikan MySQL XAMPP sudah Start dan DB_USER/DB_PASSWORD di .env benar.');
    process.exit(1);
  }

  const server = createApp().listen(config.port, config.host, () => {
    console.log(`✓ Request Service berjalan di http://localhost:${config.port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`✗ Port ${config.port} sudah dipakai proses lain.`);
    else console.error(err);
    process.exit(1);
  });

  if (config.reconcileIntervalSeconds > 0) {
    const timer = setInterval(() => {
      reconcile.run().catch((e) => console.warn('[reconcile] gagal:', e.message));
    }, config.reconcileIntervalSeconds * 1000);
    timer.unref();
  }

  const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
