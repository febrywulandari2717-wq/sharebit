const request = require('supertest');
const { createApp } = require('../src/app');
const { pool } = require('../src/db/pool');

afterAll(async () => { await pool.end(); });

test('GET /health', async () => {
  const res = await request(createApp()).get('/health');
  expect([200, 503]).toContain(res.status);
  expect(res.body.data.service).toBe('request');
});

test('endpoint tidak dikenal -> 404 JSON', async () => {
  const res = await request(createApp()).get('/tidak-ada');
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});
