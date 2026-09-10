'use strict';

/**
 * Centralised environment configuration.
 *
 * Every secret (JWT signing key, Mongo connection string) is read from the
 * process environment exactly once, here, so that no other module needs to
 * touch `process.env` directly. Loading `.env` happens as a side effect of
 * requiring this file, which means it must be the first application module
 * required by `server.js`.
 */

const path = require('path');
const dotenv = require('dotenv');

// `quiet` suppresses dotenv's startup banner so it cannot interleave with
// application logs. Variables already present in the environment win, which
// is what lets CI and the test harness override the file.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

/**
 * Reads a required environment variable.
 *
 * @param {string} name Name of the variable.
 * @returns {string} The trimmed value.
 * @throws {Error} If the variable is missing or blank, so the process fails
 *   loudly at boot instead of silently signing tokens with `undefined`.
 */
function required(name) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        'Copy backend/.env.example to backend/.env and fill in the values.'
    );
  }

  return value.trim();
}

/**
 * Reads an optional environment variable, falling back to a default.
 *
 * @param {string} name Name of the variable.
 * @param {string} fallback Value used when the variable is not set.
 * @returns {string} The resolved value.
 */
function optional(name, fallback) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

const nodeEnv = optional('NODE_ENV', 'development');

const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number.parseInt(optional('PORT', '4000'), 10),
  mongoUri: required('MONGODB_URI'),
  jwt: {
    secret: required('JWT_SECRET'),
    // The brief asks for 24 hour sessions; kept configurable so staging can
    // shorten it without a code change.
    expiresIn: optional('JWT_EXPIRES_IN', '24h'),
  },
  bcrypt: {
    // Cost factor 12 is the project standard. Higher is slower to brute force
    // but also slower to log in, so it is pinned rather than guessed per call.
    saltRounds: Number.parseInt(optional('BCRYPT_SALT_ROUNDS', '12'), 10),
  },
  rateLimit: {
    windowMs: Number.parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    max: Number.parseInt(optional('RATE_LIMIT_MAX', '5'), 10),
  },
  // Number of reverse proxies in front of the API. Left at 0 by default:
  // trusting a proxy that is not actually there lets a caller spoof
  // X-Forwarded-For and walk straight past the per-IP rate limiter.
  trustProxy: Number.parseInt(optional('TRUST_PROXY_HOPS', '0'), 10),
};

module.exports = config;
