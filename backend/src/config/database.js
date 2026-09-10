'use strict';

const mongoose = require('mongoose');
const config = require('./env');
// Required for its side effect of registering the schema, so `syncIndexes()`
// below runs even if no route has pulled the model in yet.
const User = require('../models/User');

/**
 * Opens the MongoDB Atlas connection.
 *
 * `strictQuery` is pinned so an unexpected Mongoose default change cannot
 * quietly alter how filters are interpreted.
 *
 * @returns {Promise<typeof mongoose>} The connected Mongoose instance.
 */
async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (error) => {
    console.error('[mongo] connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected');
  });

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  // Builds the unique index on `email` if it does not exist yet. Without this
  // the uniqueness guarantee is only advisory on a fresh database.
  await User.syncIndexes();

  console.log('[mongo] connected');
  return mongoose;
}

/**
 * Closes the connection, used on shutdown and between test runs.
 *
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  await mongoose.connection.close();
}

module.exports = { connectDatabase, disconnectDatabase };
