const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireIdempotencyKey } = require('../middleware/idempotency');
const service = require('../services/requestService');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

router.post('/requests', requireAuth('recipient'), requireIdempotencyKey, wrap(async (req, res) => {
  const { request, created } = await service.createRequest({
    user: req.user,
    body: req.body || {},
    idempotencyKey: req.idempotencyKey,
  });
  res.status(created ? 201 : 200).json({ data: request });
}));

router.get('/requests', requireAuth(), wrap(async (req, res) => {
  res.json(await service.listRequests({ user: req.user, query: req.query }));
}));

router.get('/activity', requireAuth(), wrap(async (req, res) => {
  res.json(await service.activity({ user: req.user, query: req.query }));
}));

router.get('/requests/stats/timeline', requireAuth(), wrap(async (req, res) => {
  res.json({ data: await service.timeline({ user: req.user, query: req.query }) });
}));

router.get('/requests/stats', requireAuth('admin'), wrap(async (req, res) => {
  res.json({ data: await service.stats() });
}));

router.get('/requests/:id', requireAuth(), wrap(async (req, res) => {
  res.json({ data: await service.getRequest({ user: req.user, id: req.params.id }) });
}));

router.post('/requests/:id/approve', requireAuth('donor', 'admin'), wrap(async (req, res) => {
  res.json({ data: await service.approve({ user: req.user, id: req.params.id }) });
}));

router.post('/requests/:id/reject', requireAuth('donor', 'admin'), wrap(async (req, res) => {
  res.json({ data: await service.reject({ user: req.user, id: req.params.id, reason: (req.body || {}).reason }) });
}));

router.post('/requests/:id/cancel', requireAuth(), wrap(async (req, res) => {
  res.json({ data: await service.cancel({ user: req.user, id: req.params.id, reason: (req.body || {}).reason }) });
}));

module.exports = router;
