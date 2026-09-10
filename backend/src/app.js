'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Builds the Express application.
 *
 * Kept separate from `server.js` so tests can mount the app with supertest
 * without opening a port or connecting to a real database.
 *
 * @returns {import('express').Express} A configured app, not yet listening.
 */
function createApp() {
  const app = express();

  // Only trust the number of proxies we actually run behind; see env.js.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  // Security headers (HSTS, no-sniff, frame denial, and friends).
  app.use(
    helmet({
      // Helmet defaults to same-origin here, which would contradict the
      // wide-open CORS policy below for browser callers. Native clients
      // ignore both; keeping the two consistent avoids a confusing failure
      // if the API is ever called from a web build.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Open CORS for now so the Expo dev client and simulators on any host can
  // reach the API. Lock this down to the published app origins before launch.
  app.use(cors({ origin: '*' }));

  // 100kb is plenty for an auth payload and caps the cost of a garbage body.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  if (!config.isTest) {
    app.use(morgan(config.isProduction ? 'combined' : 'dev'));
  }

  /**
   * Liveness probe. Deliberately unauthenticated and free of any detail about
   * the deployment.
   */
  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/auth', authRoutes);

  // These two must stay last, and in this order.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
