const express = require('express');
const { requireServiceKey } = require('../middleware/serviceKey');
const service = require('../services/requestService');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

router.get('/requests/:id', requireServiceKey('donation'), wrap(async (req, res) => {
  res.json({ data: await service.internalGet(req.params.id) });
}));

router.post('/requests/:id/status', requireServiceKey('donation'), wrap(async (req, res) => {
  const { status, reason } = req.body || {};
  res.json({ data: await service.internalSetStatus({ id: req.params.id, status, reason }) });
}));

module.exports = router;
