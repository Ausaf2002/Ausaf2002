'use strict';

const { body, validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

// Password policy, kept in one place so the message and the rule cannot drift
// apart. Mirrored client side in mobile/src/utils/validators.js.
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_RULES = [
  { test: /[A-Z]/, label: 'one uppercase letter' },
  { test: /[0-9]/, label: 'one number' },
  { test: /[^A-Za-z0-9]/, label: 'one special character' },
];

const PASSWORD_MESSAGE =
  `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include ` +
  PASSWORD_RULES.map((rule) => rule.label).join(', ') + '.';

/**
 * Checks a plaintext password against the full policy.
 *
 * @param {string} value Candidate password.
 * @returns {boolean} True when every rule passes.
 */
function isStrongPassword(value) {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH) {
    return false;
  }

  return PASSWORD_RULES.every((rule) => rule.test.test(value));
}

/**
 * Collects express-validator results and converts the first failure into the
 * shared error envelope.
 *
 * Only the first error is surfaced: the mobile form highlights one field at a
 * time, and returning the whole list would leak the validation order of fields
 * the client has not filled in yet.
 *
 * @type {import('express').RequestHandler}
 */
function handleValidation(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const [firstError] = result.array({ onlyFirstError: true });

  return next(
    new ApiError(
      'VALIDATION_ERROR',
      firstError.msg,
      // `path` is the field name in express-validator v7; `param` in v6.
      firstError.path || firstError.param || null
    )
  );
}

/**
 * Validation chain for POST /api/auth/register.
 *
 * Sanitises as well as validates: emails are trimmed and normalised so that
 * "  Sam@Example.COM " and "sam@example.com" resolve to the same account, and
 * the display name is escaped to neutralise HTML before it is stored.
 */
const registerRules = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required.')
    .bail()
    .isString()
    .withMessage('Email must be a string.')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address.')
    .bail()
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 254 })
    .withMessage('Email must be 254 characters or fewer.'),

  body('displayName')
    .exists({ checkFalsy: true })
    .withMessage('Display name is required.')
    .bail()
    .isString()
    .withMessage('Display name must be a string.')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Display name is required.')
    .bail()
    .isLength({ min: 2, max: 60 })
    .withMessage('Display name must be between 2 and 60 characters.')
    .escape(),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required.')
    .bail()
    .isString()
    .withMessage('Password must be a string.')
    .bail()
    // No trimming: leading and trailing spaces are legitimate password
    // characters and silently stripping them would break future logins.
    .isLength({ max: 128 })
    .withMessage('Password must be 128 characters or fewer.')
    .bail()
    .custom(isStrongPassword)
    .withMessage(PASSWORD_MESSAGE),

  handleValidation,
];

/**
 * Validation chain for POST /api/auth/login.
 *
 * Presence and shape only. The password policy is deliberately *not* enforced
 * here: an account created before a policy change must still be able to log
 * in, and rejecting a weak password at login would reveal that the rules
 * changed rather than that the credentials were wrong.
 */
const loginRules = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required.')
    .bail()
    .isString()
    .withMessage('Email must be a string.')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address.')
    .bail()
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required.')
    .bail()
    .isString()
    .withMessage('Password must be a string.'),

  handleValidation,
];

module.exports = {
  registerRules,
  loginRules,
  handleValidation,
  isStrongPassword,
  PASSWORD_MESSAGE,
  PASSWORD_MIN_LENGTH,
};
