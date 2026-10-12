const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/health', async (req, res) => {
  let ok = true;
  try {
    await pool.query('SELECT 1');
  } catch (_) {
    ok = false;
  }
  res.status(ok ? 200 : 503).json({
    data: { status: ok ? 'ok' : 'degraded', service: 'request', database: ok ? 'up' : 'down' },
  });
});

module.exports = router;
