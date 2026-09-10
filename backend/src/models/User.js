'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');

/**
 * A Pantrio account.
 *
 * The stored credential is called `passwordHash` rather than `password` so
 * that nothing in the codebase can accidentally read a plaintext value off a
 * user document. It also carries `select: false`, so queries have to opt in
 * with `.select('+passwordHash')` to see it at all.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      /**
       * Strips internal and secret fields from anything serialised to a
       * response body. This is the last line of defence: the API layer builds
       * its payloads explicitly, but a stray `res.json(user)` still cannot
       * leak the hash.
       */
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.password;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Virtual setter used to assign a plaintext password.
 *
 * Assigning `user.password = '...'` stages the value for the pre-save hook,
 * which is the only place bcrypt hashing happens.
 */
userSchema
  .virtual('password')
  .set(function setPassword(plainPassword) {
    this._plainPassword = plainPassword;
  })
  .get(function getPassword() {
    return this._plainPassword;
  });

/**
 * Hashes a newly assigned plaintext password before the document hits Mongo.
 * Runs on create and on password change, and is a no-op otherwise, so saving
 * an unrelated field (say, `displayName`) never re-hashes the credential.
 *
 * Hooked to `validate` rather than `save`: Mongoose registers its own
 * validation as the first `pre('save')` hook, so hashing there would run after
 * the `required` check on `passwordHash` had already failed.
 */
userSchema.pre('validate', async function hashPasswordBeforeValidate(next) {
  if (!this._plainPassword) {
    return next();
  }

  try {
    this.passwordHash = await bcrypt.hash(this._plainPassword, config.bcrypt.saltRounds);
    this._plainPassword = undefined;
    return next();
  } catch (error) {
    return next(error);
  }
});

/**
 * Constant-time comparison of a candidate password against the stored hash.
 *
 * @param {string} candidatePassword Plaintext password supplied at login.
 * @returns {Promise<boolean>} True when the password matches.
 */
userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.passwordHash) {
    // The caller forgot `.select('+passwordHash')`; fail closed rather than
    // letting bcrypt throw on an undefined hash.
    return Promise.resolve(false);
  }

  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Shapes a user for the `data` block of a successful auth response.
 *
 * @param {string} token Freshly signed JWT.
 * @returns {{userId: string, email: string, displayName: string, token: string}}
 */
userSchema.methods.toAuthPayload = function toAuthPayload(token) {
  return {
    userId: this.id,
    email: this.email,
    displayName: this.displayName,
    token,
  };
};

module.exports = mongoose.model('User', userSchema);
