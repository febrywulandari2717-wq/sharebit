const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const requestsRoutes = require('./routes/requests');
const internalRoutes = require('./routes/internal');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use('/', healthRoutes);
  app.use('/api/v1', requestsRoutes);
  app.use('/internal/v1', internalRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
