'use strict';

const config = require('../config/env');
const { ApiError } = require('../utils/ApiError');

/**
 * Terminal 404 handler for URLs that matched no route.
 *
 * @type {import('express').RequestHandler}
 */
function notFoundHandler(req, _res, next) {
  next(new ApiError('NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist.`));
}

/**
 * Translates a thrown value into a client-safe response.
 *
 * Known failures (`ApiError`) are echoed back as-is. A handful of library
 * errors are recognised and downgraded to sensible codes. Everything else is
 * assumed to carry information the client should not see — a stack trace, a
 * connection string, a driver message — so it is logged in full server side
 * and reported as a bare INTERNAL_ERROR.
 *
 * @type {import('express').ErrorRequestHandler}
 */
function errorHandler(err, req, res, _next) {
  const apiError = toApiError(err);

  if (apiError.status >= 500) {
    // Full detail, server side only.
    console.error('[error]', {
      method: req.method,
      url: req.originalUrl,
      requestId: req.id,
      message: err && err.message,
      stack: err && err.stack,
    });
  } else if (!config.isTest) {
    console.warn('[warn]', {
      method: req.method,
      url: req.originalUrl,
      code: apiError.code,
      message: apiError.message,
    });
  }

  res.status(apiError.status).json(apiError.toJSON());
}

/**
 * Normalises an arbitrary thrown value into an `ApiError`.
 *
 * @param {unknown} err The value passed to `next(err)`.
 * @returns {ApiError} An error that is safe to serialise.
 */
function toApiError(err) {
  if (err instanceof ApiError) {
    return err;
  }

  // express.json() rejects malformed bodies with a SyntaxError carrying a
  // `body` property. That is a client mistake, not a server fault.
  if (err instanceof SyntaxError && 'body' in err) {
    return new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON.');
  }

  // Mongoose schema validation, in case something bypasses express-validator.
  if (err && err.name === 'ValidationError' && err.errors) {
    const [field] = Object.keys(err.errors);
    return new ApiError('VALIDATION_ERROR', err.errors[field].message, field);
  }

  // Duplicate key on the unique email index. This is the race-condition path:
  // two registrations for the same address arriving at once both pass the
  // "does this email exist" check, and Mongo rejects the loser.
  if (err && err.code === 11000) {
    const [field] = Object.keys(err.keyPattern || { email: 1 });
    return new ApiError('EMAIL_EXISTS', 'An account with that email already exists.', field);
  }

  return new ApiError('INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

module.exports = { errorHandler, notFoundHandler, toApiError };
