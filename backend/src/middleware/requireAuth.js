'use strict';

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');
const { verifyToken } = require('../utils/generateToken');

/**
 * Rejects requests that do not carry a valid `Authorization: Bearer <jwt>`
 * header, and attaches the matching user document to `req.user`.
 *
 * @type {import('express').RequestHandler}
 */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError('INVALID_CREDENTIALS', 'Authentication required.');
  }

  let payload;

  try {
    payload = verifyToken(token);
  } catch (error) {
    // Expired and forged tokens are reported identically; the client's only
    // useful response to either is to sign in again.
    throw new ApiError('INVALID_CREDENTIALS', 'Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);

  if (!user) {
    // Token is validly signed but the account is gone (deleted between issue
    // and use).
    throw new ApiError('NOT_FOUND', 'Account no longer exists.');
  }

  req.user = user;
  return next();
});

module.exports = { requireAuth };
