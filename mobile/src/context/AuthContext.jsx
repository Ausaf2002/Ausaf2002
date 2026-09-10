import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api, {ApiError, setAuthToken, setUnauthorizedHandler} from '../services/api';
import {clearSession, getToken, getUser, saveSession} from '../services/tokenStorage';

/**
 * Authentication state for the whole app: who is signed in, and the three
 * operations that change that.
 *
 * @type {React.Context<{
 *   token: string|null,
 *   user: {userId: string, email: string, displayName: string}|null,
 *   isRestoring: boolean,
 *   isAuthenticated: boolean,
 *   login: (email: string, password: string) => Promise<object>,
 *   register: (input: {displayName: string, email: string, password: string}) => Promise<object>,
 *   logout: () => Promise<void>,
 * }|null>}
 */
const AuthContext = createContext(null);

/**
 * Pulls the session out of an auth response, rejecting anything malformed.
 *
 * A 2xx with an unexpected body (a captive portal, a misconfigured proxy, a
 * server change) would otherwise surface as a `TypeError` rendered verbatim
 * in the error banner. This turns it into a normal, displayable failure.
 *
 * @param {object} response The axios response.
 * @returns {{token: string, user: {userId: string, email: string, displayName: string}}}
 * @throws {ApiError} When the payload is not the documented shape.
 */
function extractSession(response) {
  const payload = response && response.data && response.data.data;

  if (!payload || typeof payload.token !== 'string') {
    throw new ApiError(
      'INTERNAL_ERROR',
      'Received an unexpected response from Pantrio. Please try again.',
    );
  }

  const {token, ...user} = payload;
  return {token, user};
}

/**
 * Wraps the app and supplies authentication state.
 *
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
export function AuthProvider({children}) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // True until the stored session has been checked. The navigator shows a
  // splash while this is true, which prevents the login screen flashing on
  // top of an already signed-in user.
  const [isRestoring, setIsRestoring] = useState(true);

  /**
   * Commits a session to state, to the API client, and to disk.
   *
   * @param {{token: string, user: object}} session
   * @returns {Promise<void>}
   */
  const applySession = useCallback(async session => {
    setToken(session.token);
    setUser(session.user);
    setAuthToken(session.token);
    await saveSession(session);
  }, []);

  /**
   * Signs the user out everywhere: state, API client, and storage.
   *
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await clearSession();
  }, []);

  /**
   * Restores a saved session on app start.
   *
   * The token is trusted optimistically so the app is usable offline, then
   * confirmed against `/api/auth/me`. Only an explicit rejection signs the
   * user out — a network failure leaves the session in place.
   */
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const [storedToken, storedUser] = await Promise.all([getToken(), getUser()]);

      if (cancelled) {
        return;
      }

      if (!storedToken) {
        setAuthToken(null);
        setIsRestoring(false);
        return;
      }

      setToken(storedToken);
      setUser(storedUser);
      setAuthToken(storedToken);
      setIsRestoring(false);

      try {
        const response = await api.get('/api/auth/me');
        const profile = response.data && response.data.data;

        if (!cancelled && profile) {
          setUser(profile);
        }
      } catch (error) {
        // 401 means the token expired or was revoked; the response
        // interceptor has already triggered `logout` via the unauthorized
        // handler. Anything else (offline, server down) is not the user's
        // problem, so the cached session stands.
        if (!cancelled && error.code !== 'INVALID_CREDENTIALS') {
          console.warn('[auth] could not verify session:', error.message);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Lets the API client sign the user out when the server rejects the token
   * on any authenticated request.
   */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });

    return () => setUnauthorizedHandler(null);
  }, [logout]);

  /**
   * Creates an account and signs the new user in.
   *
   * @param {{displayName: string, email: string, password: string}} input
   * @returns {Promise<{userId: string, email: string, displayName: string}>} The new profile.
   * @throws {import('../services/api').ApiError} With `code`, `message`, and
   *   `field` set, ready to render next to the offending input.
   */
  const register = useCallback(
    async ({displayName, email, password}) => {
      const response = await api.post('/api/auth/register', {
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });

      const session = extractSession(response);
      await applySession(session);

      return session.user;
    },
    [applySession],
  );

  /**
   * Signs an existing user in.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{userId: string, email: string, displayName: string}>} The profile.
   * @throws {import('../services/api').ApiError} On bad credentials or a network failure.
   */
  const login = useCallback(
    async (email, password) => {
      const response = await api.post('/api/auth/login', {
        email: email.trim(),
        password,
      });

      const session = extractSession(response);
      await applySession(session);

      return session.user;
    },
    [applySession],
  );

  // Memoised so consumers do not re-render on every provider render.
  const value = useMemo(
    () => ({
      token,
      user,
      isRestoring,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [token, user, isRestoring, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads the auth context.
 *
 * @returns {{token: string|null, user: object|null, isRestoring: boolean, isAuthenticated: boolean, login: Function, register: Function, logout: Function}}
 * @throws {Error} If called outside an `AuthProvider`.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }

  return context;
}

export default AuthContext;
