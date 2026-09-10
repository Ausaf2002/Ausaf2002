'use strict';

const express = require('express');
const { register, login } = require('../controllers/authController');
const { registerRules, loginRules } = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// Order matters: throttle first so a flood of requests is rejected before it
// reaches validation or, worse, a bcrypt comparison.
router.post('/register', authRateLimiter, registerRules, register);
router.post('/login', authRateLimiter, loginRules, login);

/**
 * GET /api/auth/me
 *
 * Returns the caller's profile. The mobile app hits this on launch to confirm
 * a stored token is still valid before showing the dashboard.
 */
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      userId: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
    },
  });
});

module.exports = router;
