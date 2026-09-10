'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { ApiError } = require('../utils/ApiError');

/**
 * Per-IP throttle for the authentication endpoints.
 *
 * Defaults to 5 requests per minute, which is generous for a human typing a
 * password and hostile to credential stuffing. Rejections are rendered in the
 * same error envelope as everything else so the mobile client has exactly one
 * error shape to parse.
 */
const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  /**
   * @type {import('express').RequestHandler}
   */
  handler(_req, res) {
    const seconds = Math.ceil(config.rateLimit.windowMs / 1000);
    const error = new ApiError(
      'RATE_LIMITED',
      `Too many attempts. Please wait ${seconds} seconds and try again.`
    );

    res.status(error.status).json(error.toJSON());
  },
});

module.exports = { authRateLimiter };
