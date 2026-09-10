import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistence for the signed-in session.
 *
 * SECURITY: AsyncStorage is unencrypted. On a rooted or jailbroken device,
 * and in an unencrypted device backup, the JWT stored here is readable.
 * Before production, move the token to `react-native-keychain`, which uses
 * the iOS Keychain and Android Keystore/EncryptedSharedPreferences. The API
 * of this module is deliberately small and async so that swap is confined to
 * this file — no caller needs to change.
 */

const TOKEN_KEY = '@pantrio/auth-token';
const USER_KEY = '@pantrio/auth-user';

/**
 * Reads the persisted JWT.
 *
 * @returns {Promise<string|null>} The token, or null when signed out.
 */
export async function getToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    // A storage failure should log the user out, not crash the app.
    console.warn('[tokenStorage] failed to read token:', error.message);
    return null;
  }
}

/**
 * Reads the cached user profile.
 *
 * @returns {Promise<{userId: string, email: string, displayName: string}|null>}
 */
export async function getUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[tokenStorage] failed to read user:', error.message);
    return null;
  }
}

/**
 * Persists a session so the user stays signed in across app launches.
 *
 * @param {{token: string, user: {userId: string, email: string, displayName: string}}} session
 * @returns {Promise<void>}
 */
export async function saveSession({token, user}) {
  try {
    // `setItem`/`removeItem` rather than the batch helpers: the batch API was
    // renamed between async-storage v2 (`multiSet`) and v3 (`setMany`), while
    // the single-key methods are identical in both.
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
  } catch (error) {
    // Non-fatal: the user is signed in for this session, just not the next.
    console.warn('[tokenStorage] failed to save session:', error.message);
  }
}

/**
 * Removes the persisted session. Used on logout and whenever the server
 * rejects the stored token.
 *
 * @returns {Promise<void>}
 */
export async function clearSession() {
  try {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  } catch (error) {
    console.warn('[tokenStorage] failed to clear session:', error.message);
  }
}
