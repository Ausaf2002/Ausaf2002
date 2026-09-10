'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Signs a JWT for an authenticated user.
 *
 * The payload deliberately carries only non-sensitive identifiers: the token
 * travels to the device and is readable by anyone holding it.
 *
 * @param {{id: string, email: string}} user The persisted user.
 * @returns {string} A signed JWT that expires per `JWT_EXPIRES_IN` (24h default).
 */
function generateToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Verifies and decodes a JWT produced by `generateToken`.
 *
 * @param {string} token Raw token, without the "Bearer " prefix.
 * @returns {{sub: string, email: string, iat: number, exp: number}} Decoded payload.
 * @throws {jsonwebtoken.JsonWebTokenError} If the token is invalid or expired.
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { generateToken, verifyToken };
