'use strict';

/**
 * Every error code the API is allowed to return, mapped to its HTTP status.
 * Keeping the list closed means a typo in a controller throws at construction
 * time instead of shipping an unknown code to the mobile client.
 */
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  NOT_FOUND: 404,
  EMAIL_EXISTS: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
});

/**
 * An error that is safe to serialise straight back to the client.
 *
 * Anything thrown that is *not* an `ApiError` is treated by the global error
 * handler as an unexpected failure: it gets logged in full and reported to the
 * client as a generic INTERNAL_ERROR.
 */
class ApiError extends Error {
  /**
   * @param {string} code One of the keys of `ERROR_CODES`.
   * @param {string} message Human readable, client-safe message.
   * @param {string|null} [field=null] Offending request field, when relevant.
   */
  constructor(code, message, field = null) {
    super(message);

    if (!Object.prototype.hasOwnProperty.call(ERROR_CODES, code)) {
      throw new Error(`Unknown API error code: ${code}`);
    }

    this.name = 'ApiError';
    this.code = code;
    this.status = ERROR_CODES[code];
    this.field = field;

    Error.captureStackTrace(this, ApiError);
  }

  /**
   * Renders the error in the wire format shared by every failing response.
   *
   * @returns {{success: false, error: {code: string, message: string, field: string|null}}}
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        field: this.field,
      },
    };
  }
}

module.exports = { ApiError, ERROR_CODES };
