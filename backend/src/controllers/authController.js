'use strict';

const bcrypt = require('bcrypt');
const User = require('../models/User');
const config = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiError');
const { generateToken } = require('../utils/generateToken');

/**
 * A bcrypt hash of a value nobody knows, computed once on first use.
 *
 * Logging in with an unknown email is compared against this so that the
 * "no such user" path costs the same wall-clock time as the "wrong password"
 * path. Without it, response latency tells an attacker which addresses are
 * registered.
 *
 * @type {string|null}
 */
let decoyHash = null;

/**
 * Burns roughly one bcrypt comparison worth of time.
 *
 * @returns {Promise<void>}
 */
async function equaliseTiming() {
  if (decoyHash === null) {
    decoyHash = await bcrypt.hash('pantrio-timing-decoy', config.bcrypt.saltRounds);
  }

  await bcrypt.compare('pantrio-timing-decoy-miss', decoyHash);
}

/**
 * POST /api/auth/register
 *
 * Creates an account and returns a session token, so the app can drop the
 * user straight into the dashboard rather than bouncing them to the login
 * screen with credentials they just typed.
 *
 * Responds 201 with `{ success: true, data: { userId, email, displayName, token } }`.
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;

  // Friendly, explicit conflict. The unique index on `email` is what actually
  // guarantees correctness — see the 11000 branch in the error handler for the
  // case where two registrations race past this check.
  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    throw new ApiError('EMAIL_EXISTS', 'An account with that email already exists.', 'email');
  }

  // `password` is a virtual: the pre-save hook hashes it with bcrypt at the
  // configured cost factor and only `passwordHash` is ever written to Mongo.
  const user = new User({ email, displayName, password });
  await user.save();

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    data: user.toAuthPayload(token),
  });
});

/**
 * POST /api/auth/login
 *
 * Exchanges email and password for a 24 hour JWT.
 *
 * A missing account and a bad password return the identical INVALID_CREDENTIALS
 * response, so the endpoint cannot be used to enumerate registered emails.
 *
 * Responds 200 with `{ success: true, data: { userId, email, displayName, token } }`.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // `passwordHash` is `select: false` on the schema, so it has to be asked for.
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    await equaliseTiming();
    throw new ApiError('INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    throw new ApiError('INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    data: user.toAuthPayload(token),
  });
});

module.exports = { register, login };
