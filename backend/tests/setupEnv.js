'use strict';

/**
 * Test environment defaults.
 *
 * Runs before any application module is required, so `src/config/env.js` sees
 * these values. dotenv does not overwrite variables that are already set, so a
 * developer's real `.env` cannot leak into the test run.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-outside-jest';
process.env.JWT_EXPIRES_IN = '24h';
// The in-memory server replaces this at runtime; it only has to be non-empty
// so the config module's required-variable check passes.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/pantrio-test';
// bcrypt at cost 12 takes ~300ms per hash, which would dominate the suite.
// The hashing path itself is covered by a dedicated test.
process.env.BCRYPT_SALT_ROUNDS = '4';
// Every test shares one IP, so the real 5-per-minute limit would throttle the
// suite itself. tests/rateLimit.test.js lowers this again to assert the
// limiter actually works.
process.env.RATE_LIMIT_MAX = '10000';
