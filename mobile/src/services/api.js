import axios from 'axios';
import config from '../config';
import {getToken} from './tokenStorage';

/**
 * The app's single HTTP client.
 *
 * Every request goes through here so that the base URL, the timeout, the
 * `Authorization` header, and error shaping are defined exactly once.
 */
const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.requestTimeoutMs,
  headers: {'Content-Type': 'application/json'},
});

/**
 * In-memory copy of the current JWT.
 *
 * Kept alongside the persisted copy so the interceptor does not have to hit
 * AsyncStorage on every single request. Storage is only consulted as a
 * fallback, which matters during the brief window at launch before
 * AuthContext has finished restoring the session.
 *
 * @type {string|null}
 */
let authToken = null;

/**
 * Whether `authToken` reflects reality yet.
 *
 * Distinguishes "signed out" from "not looked yet", so a signed-out app does
 * not re-read storage on every request.
 *
 * @type {boolean}
 */
let tokenHydrated = false;

/**
 * Sets or clears the token used for subsequent requests.
 *
 * Called by AuthContext on login, logout, and session restore.
 *
 * @param {string|null} token The JWT, or null to sign out.
 */
export function setAuthToken(token) {
  authToken = token || null;
  tokenHydrated = true;
}

/**
 * Callback invoked when the server rejects our token.
 *
 * @type {(() => void)|null}
 */
let onUnauthorized = null;

/**
 * Registers a handler for expired or invalid sessions, so a 401 anywhere in
 * the app can drop the user back to the login screen.
 *
 * @param {(() => void)|null} handler
 */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

/**
 * Request interceptor: attaches `Authorization: Bearer <token>` to every
 * outgoing request that has a session available.
 */
api.interceptors.request.use(async requestConfig => {
  if (!tokenHydrated) {
    // Only reachable for a request fired before AuthContext finishes
    // restoring; costs one storage read per cold start at most.
    authToken = await getToken();
    tokenHydrated = true;
  }

  if (authToken) {
    requestConfig.headers.Authorization = `Bearer ${authToken}`;
  }

  return requestConfig;
});

/**
 * A failure the UI can render directly.
 *
 * Guarantees `code`, `message`, and `field` are always present, whatever went
 * wrong — server error envelope, timeout, or DNS failure.
 */
export class ApiError extends Error {
  /**
   * @param {string} code Machine-readable code, e.g. 'INVALID_CREDENTIALS'.
   * @param {string} message Message safe to show the user.
   * @param {string|null} [field=null] Form field the error belongs to.
   */
  constructor(code, message, field = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.message = message;
    this.field = field;
  }
}

/**
 * Converts anything axios throws into an `ApiError`.
 *
 * @param {unknown} error The raw axios rejection.
 * @returns {ApiError} A normalised, displayable error.
 */
function normaliseError(error) {
  // The server answered, and (per the API contract) did so with an envelope.
  const envelope = error.response && error.response.data && error.response.data.error;

  if (envelope && envelope.code) {
    return new ApiError(envelope.code, envelope.message, envelope.field || null);
  }

  if (error.response) {
    // Answered, but not in the shape we expect — a proxy error page, say.
    return new ApiError(
      'INTERNAL_ERROR',
      'Something went wrong on our end. Please try again.',
    );
  }

  if (error.code === 'ECONNABORTED') {
    return new ApiError('TIMEOUT', 'The request timed out. Please try again.');
  }

  // No response at all: no connectivity, or the dev server is not running.
  return new ApiError(
    'NETWORK_ERROR',
    'Cannot reach Pantrio. Check your connection and try again.',
  );
}

/**
 * Response interceptor: hands successful responses straight back, and turns
 * every failure into an `ApiError` so screens never have to inspect the
 * axios error shape.
 */
api.interceptors.response.use(
  response => response,
  error => {
    const apiError = normaliseError(error);
    const status = error.response && error.response.status;

    // A rejected token on any request means the session is over. Login and
    // register are excluded: a 401 there is a wrong password, not an expired
    // session, and signing out mid-login would be nonsense.
    const isAuthAttempt =
      error.config &&
      typeof error.config.url === 'string' &&
      /\/auth\/(login|register)$/.test(error.config.url);

    if (status === 401 && !isAuthAttempt && onUnauthorized) {
      onUnauthorized();
    }

    return Promise.reject(apiError);
  },
);

export default api;
