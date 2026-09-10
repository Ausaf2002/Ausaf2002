'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/models/User');

let memoryServer = null;

/**
 * Boots an in-memory MongoDB and points Mongoose at it.
 *
 * @returns {Promise<void>}
 */
async function connectTestDatabase() {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri('pantrio-test'));
  await User.syncIndexes();
}

/**
 * Empties every collection so each test starts from a known state.
 *
 * @returns {Promise<void>}
 */
async function clearTestDatabase() {
  const { collections } = mongoose.connection;

  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
}

/**
 * Tears down the connection and the in-memory server.
 *
 * @returns {Promise<void>}
 */
async function disconnectTestDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectTestDatabase, clearTestDatabase, disconnectTestDatabase };
