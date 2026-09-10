'use strict';

/**
 * Pantrio API entry point.
 *
 * Connects to MongoDB first and only then starts accepting traffic, so the
 * service never answers a request it cannot serve.
 */

const config = require('./src/config/env');
const createApp = require('./src/app');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');

async function start() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[api] Pantrio API listening on port ${config.port} (${config.nodeEnv})`);
  });

  /**
   * Drains in-flight requests and closes the database handle before exiting,
   * so a deploy or a Ctrl-C does not sever live connections.
   *
   * @param {string} signal The received POSIX signal.
   */
  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down`);

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    // Backstop: if a socket refuses to close, do not hang forever.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('[api] failed to start:', error);
  process.exit(1);
});
