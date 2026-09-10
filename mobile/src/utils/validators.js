/**
 * Client-side form validation.
 *
 * These rules mirror backend/src/middleware/validate.js so the user gets
 * instant feedback instead of a round trip. The server remains the authority:
 * anything that slips through here is still rejected there, and the screens
 * render whichever error arrives.
 *
 * Every validator returns an error string to display, or `null` when the
 * value is acceptable.
 */

export const PASSWORD_MIN_LENGTH = 6;

// Deliberately permissive: the real check happens server side with
// express-validator, and an over-strict client regex rejects valid addresses
// (new TLDs, plus-addressing, and so on).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address.
 *
 * @param {string} value Raw input from the field.
 * @returns {string|null} Error message, or null when valid.
 */
export function validateEmail(value) {
  const email = (value || '').trim();

  if (!email) {
    return 'Email is required.';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return 'Enter a valid email address.';
  }

  return null;
}

/**
 * Validates a display name.
 *
 * @param {string} value Raw input from the field.
 * @returns {string|null} Error message, or null when valid.
 */
export function validateDisplayName(value) {
  const name = (value || '').trim();

  if (!name) {
    return 'Display name is required.';
  }

  if (name.length < 2) {
    return 'Display name must be at least 2 characters.';
  }

  if (name.length > 60) {
    return 'Display name must be 60 characters or fewer.';
  }

  return null;
}

/**
 * Validates a new password against the signup policy: at least six
 * characters, with an uppercase letter, a number, and a special character.
 *
 * @param {string} value Raw input from the field.
 * @returns {string|null} Error message, or null when valid.
 */
export function validatePassword(value) {
  const password = value || '';

  if (!password) {
    return 'Password is required.';
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one special character.';
  }

  return null;
}

/**
 * Checks that the confirmation field matches the password.
 *
 * @param {string} password The chosen password.
 * @param {string} confirmPassword The repeated password.
 * @returns {string|null} Error message, or null when they match.
 */
export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }

  return null;
}

/**
 * Validates the whole signup form in one pass.
 *
 * @param {{displayName: string, email: string, password: string, confirmPassword: string}} values
 * @returns {Object<string, string>} Field name to error message, empty when valid.
 */
export function validateRegisterForm(values) {
  const errors = {};

  const displayNameError = validateDisplayName(values.displayName);
  if (displayNameError) {
    errors.displayName = displayNameError;
  }

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const confirmError = validateConfirmPassword(values.password, values.confirmPassword);
  if (confirmError) {
    errors.confirmPassword = confirmError;
  }

  return errors;
}

/**
 * Validates the login form.
 *
 * The password policy is *not* applied here: an account created before a
 * rule change must still be able to sign in, and the server decides whether
 * the credentials are right.
 *
 * @param {{email: string, password: string}} values
 * @returns {Object<string, string>} Field name to error message, empty when valid.
 */
export function validateLoginForm(values) {
  const errors = {};

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  }

  return errors;
}
