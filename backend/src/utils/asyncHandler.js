'use strict';

/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * pipeline instead of hanging the request.
 *
 * Express 4 does not await handlers, so `throw` inside an `async` function is
 * invisible to it without this bridge.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} handler
 * @returns {import('express').RequestHandler}
 */
function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
